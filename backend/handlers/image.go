package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"backend/models"
	"github.com/gin-gonic/gin"
)

func UploadImageHandler(c *gin.Context) {
	// multipart/form-data から取得
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ファイルがありません"})
		return
	}

	roomIDStr := c.PostForm("room_id")
	senderIDStr := c.PostForm("sender_id")

	roomID, _ := strconv.Atoi(roomIDStr)
	senderID, _ := strconv.Atoi(senderIDStr)

	// ファイル名作成（ユニークに）
	timestamp := time.Now().Unix()
	uploadedFileName := fmt.Sprintf("%d_%s", timestamp, filepath.Base(file.Filename))

	// 保存先パス
	savePath := filepath.Join("uploads", uploadedFileName)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存に失敗しました"})
		return
	}

	// 送信者のユーザー名取得
	var sender models.User
	if err := db.First(&sender, senderID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "送信者取得に失敗しました"})
		return
	}

	// メッセージ保存
	message := models.Message{
		RoomID:     uint(roomID),
		SenderID:   uint(senderID),
		SenderName: sender.Username,
		Content:    "",
		CreatedAt:  time.Now(),
	}

	if err := db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メッセージ保存に失敗しました"})
		return
	}

	// 添付ファイル保存
	attachment := models.MessageAttachment{
		MessageID: message.ID,
		FileName:  uploadedFileName,
		CreatedAt: time.Now(),
	}

	if err := db.Create(&attachment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添付保存に失敗しました"})
		return
	}

	//  WebSocket経由でリアルタイム配信（画像つきメッセージ）
	broadcast <- message

	// クライアントへ返却
	c.JSON(http.StatusOK, gin.H{
		"id":          message.ID,
		"content":     message.Content,
		"sender_id":   message.SenderID,
		"sender_name": sender.Username,
		"room_id":     message.RoomID,
		"created_at":  message.CreatedAt,
		"attachments": []gin.H{
			{
				"fileName": uploadedFileName,
			},
		},
	})
}
