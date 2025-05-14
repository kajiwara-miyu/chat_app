package handlers

import (
	"backend/database"
	"backend/models"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var db *gorm.DB

func SetDB(database *gorm.DB) {
	db = database
}

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

//ユーザー登録

func SignUpHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}

		// リクエストボディをパース
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// 重複チェック
		var existing models.User
		if err := db.Where("username = ?", input.Username).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "このユーザー名は既に使われています"})
			return

		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "データベースエラー"})
			return
		}

		// パスワードをハッシュ化
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "パスワードのハッシュ化に失敗しました"})
			return
		}

		// ユーザー作成
		user := models.User{
			Username:     input.Username,
			PasswordHash: string(hashedPassword),
		}

		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー作成に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "ユーザー登録に成功しました"})
	}
}

//ログイン

func LoginHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var user models.User

	// ユーザーをDBから取得
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	//パスワード照合
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "パスワードが正しくありません"})
		return
	}

	//JWTトークン生成
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン生成に失敗しました"})
		return
	}

	c.Header("Authorization", "Bearer "+tokenString)

	c.JSON(http.StatusOK, gin.H{"message": "ログイン成功", "token": tokenString})
}

// 認証ミドルウェア
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証トークンが必要です"})
			c.Abort()
			return
		}

		tokenString := authHeader[7:]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "トークンの内容が不正です"})
			c.Abort()
			return
		}

		userID, ok := claims["user_id"].(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーIDが取得できません"})
			c.Abort()
			return
		}

		c.Set("user_id", uint(userID))
		c.Next()
	}
}

// 自分のユーザー情報を返す
func MeHandler(db *gorm.DB) gin.HandlerFunc {
	//認証ミドルウェアでJWTトークンを検証したあと、ユーザーIDを context に保存しておいたものを取得している
	return func(c *gin.Context) {
		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーIDが取得できません"})
			return
		}

		userID, ok := userIDInterface.(uint)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーIDの型が不正です"})
			return
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
			return
		}

		// パスワードなどは除外して返す
		c.JSON(http.StatusOK, gin.H{
			"id":       user.ID,
			"username": user.Username,
		})
	}
}

//ユーザー一覧

func GetUsersHandler(c *gin.Context) {
	users, err := database.GetUsers(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

//メッセージ送信

func SendMessageHandler(c *gin.Context) {
	var input struct {
		RoomID     uint   `json:"room_id"`
		SenderID   uint   `json:"sender_id"`
		ReceiverID uint   `json:"receiver_id"`
		Text       string `json:"text"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	err := database.SendMessage(db, input.RoomID, input.SenderID, input.ReceiverID, input.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message sent successfully"})
}

// メッセージ一覧取得
func GetMessagesHandler(c *gin.Context) {
	userIDStr := c.Query("user_id")
	log.Println("user_id query param:", userIDStr)
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	currentUserID := 1 // 仮置きログインユーザーID

	messages, err := database.GetMessagesBetween(db, uint(currentUserID), uint(userID))
	if err != nil {
		log.Printf("GetMessagesHandler error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}
