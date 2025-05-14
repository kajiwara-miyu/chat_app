// handlers/get_rooms.go
package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ルーム取得に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, rooms)
	}
}
