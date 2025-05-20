package main

import (
	"backend/handlers"
	"backend/models"

	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB

func InitDB() {
	dsn := "host=db user=user password=password dbname=chat_app_db port=5432 sslmode=disable"
	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}

	// DB接続後のマイグレーションなど
	err = db.AutoMigrate(&models.User{}, &models.Message{}, &models.ChatRoom{}, &models.RoomMember{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// handlers に DB を渡す（DI）
	handlers.SetDB(db)

	log.Println("Connected to the database!")
}

func main() {
	InitDB() // DB接続

	handlers.SetDB(db)

	r := gin.Default()

	// CORS設定
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// 認証が不要なAPIエンドポイント
	r.POST("/signup", handlers.SignUpHandler(db))
	r.POST("/login", handlers.LoginHandler)

	// 認証が必要なAPIエンドポイント
	auth := r.Group("/")
	auth.Use(handlers.AuthMiddleware())

	// 認証情報
	auth.GET("/me", handlers.MeHandler(db))

	// ユーザー関連
	auth.GET("/users", handlers.GetUsersHandler)        // ユーザー一覧取得
	auth.POST("/users", handlers.AddMemberHandler(db))  //メンバー追加
	auth.DELETE("/users", handlers.RemoveMemberHandler) //メンバー削除

	// ルーム関連
	auth.GET("/rooms", handlers.GetRoomHandler(db))            //ルーム一覧取得
	auth.POST("/rooms", handlers.CreateRoomHandler(db))        //ルーム作成✅
	auth.GET("/rooms/group", handlers.GetGrouproomHandler)     //ルーム一覧取得（グループ）
	auth.POST("/rooms/group", handlers.CreateGrouproomHandler) //ルーム作成（グループ）

	// メッセージ関連
	auth.GET("/messages", handlers.GetMessagesHandler)             // メッセージ取得
	auth.POST("/messages", handlers.SendMessageHandler)            // メッセージ送信
	auth.GET("/messages/group", handlers.GetGroupMessagesHandler)  // メッセージ取得（グループ）
	auth.POST("/messages/group", handlers.SendGroupMessageHandler) // メッセージ送信（グループ）

	// サーバー起動
	r.Run(":8080")
}
