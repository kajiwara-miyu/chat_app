package handlers

import (
	"log"
	"net/http"
	"time"

	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateRoomHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			PartnerID uint `json:"partner_id"`
		}

		userIDInterface, _ := c.Get("user_id")
		userID := userIDInterface.(uint)

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// 既存ルームがあるか確認
		var existingRoomID uint
		db.Raw(`
		SELECT r.id FROM chat_rooms r
		JOIN room_members m1 ON r.id = m1.room_id
		JOIN room_members m2 ON r.id = m2.room_id
		WHERE r.is_group = false AND m1.user_id = ? AND m2.user_id = ?
		GROUP BY r.id
		HAVING COUNT(DISTINCT m1.user_id) = 1 AND COUNT(DISTINCT m2.user_id) = 1
	  `, userID, input.PartnerID).Scan(&existingRoomID)

		if existingRoomID != 0 {
			c.JSON(http.StatusOK, gin.H{"room_id": existingRoomID})
			return
		}

		// 新規作成
		room := models.ChatRoom{
			IsGroup: false,
		}
		if err := db.Create(&room).Error; err != nil {
			log.Println("❌ ルーム作成エラー:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ルーム作成に失敗"})
			return
		}

		members := []models.RoomMember{
			{RoomID: room.ID, UserID: userID, JoinedAt: time.Now()},
			{RoomID: room.ID, UserID: input.PartnerID, JoinedAt: time.Now()},
		}
		db.Create(&members)

		c.JSON(http.StatusOK, gin.H{"room_id": room.ID})
	}
}

func GetRoomsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未認証のユーザーです"})
			return
		}
		userID := userIDInterface.(uint)

		var rooms []struct {
			RoomID      uint      `json:"room_id"`
			PartnerID   uint      `json:"partner_id"`
			PartnerName string    `json:"partner_name"`
			LastMessage string    `json:"last_message"`
			UpdatedAt   time.Time `json:"updated_at"`
		}

		err := db.Raw(`
      SELECT
        r.id as room_id,
        u.id as partner_id,
        u.username as partner_name,
        COALESCE(m.text, '') as last_message,
        COALESCE(m.created_at, r.updated_at) as updated_at
      FROM chat_rooms r
      JOIN room_members rm1 ON rm1.room_id = r.id AND rm1.user_id = ?
      JOIN room_members rm2 ON rm2.room_id = r.id AND rm2.user_id != ?
      JOIN users u ON u.id = rm2.user_id
      LEFT JOIN LATERAL (
        SELECT text, created_at FROM messages m
        WHERE m.room_id = r.id
        ORDER BY created_at DESC LIMIT 1
      ) m ON true
      WHERE r.is_group = false
      ORDER BY updated_at DESC
    `, userID, userID).Scan(&rooms).Error

		log.Printf("✅ rooms length = %d", len(rooms))

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ルーム取得に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, rooms[:])
	}
}
