package handlers

import (
	"backend/database"
	"backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 文字列を uint に変換する
func parseUint(s string) uint {
	u64, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0 // または panic(err)
	}
	return uint(u64)
}

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

// メッセージ送信（グループ + スレッド対応）
func SendGroupMessageHandler(c *gin.Context) {
	roomID := c.Param("roomId")
	userID := GetCurrentUserID(c)

	var req models.Message
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ユーザーがそのルームのメンバーか確認
	var member models.RoomMember
	if err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}

	// thread_root_id が指定されている場合は検証
	if req.ThreadRootID != nil {
		var rootMsg models.Message
		if err := db.First(&rootMsg, *req.ThreadRootID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid thread root ID"})
			return
		}
		if rootMsg.RoomID != parseUint(roomID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "thread message must belong to the same room"})
			return
		}
	}

	msg := models.Message{
		RoomID:       parseUint(roomID),
		SenderID:     userID,
		Content:      req.Content,
		ThreadRootID: req.ThreadRootID,
	}

	if err := db.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to post message"})
		return
	}

	c.JSON(http.StatusOK, msg)
}

// メッセージ一覧取得(グループ)
func GetGroupMessagesHandler(c *gin.Context) {
	roomID := c.Param("roomId")
	userID := GetCurrentUserID(c)

	// ユーザーがそのルームのメンバーか確認
	var member models.RoomMember
	if err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}

	var messages []models.Message
	db.Where("room_id = ?", roomID).Order("created_at asc").Find(&messages)

	c.JSON(http.StatusOK, messages)
}
