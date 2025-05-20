package handlers

import (
	"backend/models"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// データベース接続を保存するための変数（グローバルスコープで使用）
var db *gorm.DB

// データベース接続をセットする初期化関数（main.go から呼び出される）
func SetDB(database *gorm.DB) {
	db = database
}

// ==============================
// 🔹 サインアップ（新規ユーザー登録）ハンドラー
// ==============================
// - リクエスト: POST /signup
// - 呼び出し元: frontend の SignupPage（例: pages/signup.tsx）から fetch
// - 処理:
//  1. JSONリクエストボディをパース（username, password）
//  2. ユーザー名の重複チェック
//  3. パスワードをハッシュ化（bcrypt）
//  4. 新しいユーザーをDBに保存
func SignUpHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// リクエストのパース
		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// 重複チェック：既に同名のユーザーが存在するか？
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

		// ユーザー作成（DBに保存）
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

// ==============================
// 🔹 ログインハンドラー
// ==============================
// - リクエスト: POST /login
// - 呼び出し元: frontend の LoginPage（例: pages/login.tsx）から fetch
// - 処理:
//  1. JSONで送られた username/password をパース
//  2. ユーザーが存在するか確認
//  3. パスワード照合（bcrypt）
//  4. JWTトークンを生成して返却
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
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	// パスワードの照合（ハッシュと比較）
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "パスワードが正しくありません"})
		return
	}

	// JWTトークン生成（有効期限: 24時間）
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン生成に失敗しました"})
		return
	}

	// レスポンスヘッダーにトークンを含める（任意）
	c.Header("Authorization", "Bearer "+tokenString)

	c.JSON(http.StatusOK, gin.H{"message": "ログイン成功", "token": tokenString})
}

// ==============================
// 🔹 自分のユーザー情報を取得するハンドラー
// ==============================
// - リクエスト: GET /me
// - 呼び出し元: frontend の初期化処理（例: useAuth フックや AuthContext）
// - 処理:
//  1. 認証済みユーザーIDを context から取得（JWTミドルウェアが設定）
//  2. DBからユーザー情報を取得
//  3. パスワードなどの機密情報を除いて返す
func MeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// context に保存された user_id を取得（JWTミドルウェアが事前に格納）
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

		// パスワードハッシュなどの機密情報は返さない
		c.JSON(http.StatusOK, gin.H{
			"id":       user.ID,
			"username": user.Username,
		})
	}
}
