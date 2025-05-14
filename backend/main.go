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
	err = db.AutoMigrate(&models.User{}, &models.Message{})
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
	r.Use(cors.Default())

	// APIエンドポイント設定
	r.POST("/signup", handlers.SignUpHandler(db))
	r.POST("/login", handlers.LoginHandler)
	r.GET("/users", handlers.GetUsersHandler)
	r.POST("/messages", handlers.SendMessageHandler)
	r.GET("/messages", handlers.GetMessagesHandler)

	// サーバー起動
	r.Run(":8080")
}
