package handlers

import (
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
		WHERE r.is_group = 0 AND m1.user_id = ? AND m2.user_id = ?
		GROUP BY r.id
		HAVING COUNT(DISTINCT m1.user_id) = 1 AND COUNT(DISTINCT m2.user_id) = 1
	  `, userID, input.PartnerID).Scan(&existingRoomID)

		if existingRoomID != 0 {
			c.JSON(http.StatusOK, gin.H{"room_id": existingRoomID})
			return
		}

		// 新規作成
		room := models.ChatRoom{
			IsGroup:   false,
			CreatedAt: time.Now(),
		}
		if err := db.Create(&room).Error; err != nil {
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
