package handlers

import (
	"backend/database"
	"backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// メッセージ送信

func SendMessageHandler(c *gin.Context) {
	var input struct {
		RoomID       uint   `json:"room_id"`
		SenderID     uint   `json:"sender_id"`
		Content      string `json:"content"`
		ThreadRootID *uint  `json:"thread_root_id"` // スレッド型チャットを想定する場合
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	err := database.SendMessage(db, input.RoomID, input.SenderID, input.Content, input.ThreadRootID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message sent successfully"})
}

// メッセージ一覧取得
func GetMessagesHandler(c *gin.Context) {
	roomIDStr := c.Query("room_id")
	if roomIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room_id is required"})
		return
	}

	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効な room_id"})
		return
	}

	var messages []models.Message
	if err := db.Where("room_id = ?", roomID).Order("created_at ASC").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メッセージ取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, messages)
}
