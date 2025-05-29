package database

import (
	"backend/models"

	"time"

	"gorm.io/gorm"
)

// メッセージ送信
func SendMessage(db *gorm.DB, roomID uint, senderID uint, content string, threadRootID *uint) (models.Message, error) {
	message := models.Message{
		RoomID:       roomID,
		SenderID:     senderID,
		Content:      content,
		ThreadRootID: threadRootID,
		CreatedAt:    time.Now(),
	}

	if err := db.Create(&message).Error; err != nil {
		return models.Message{}, err
	}

	return message, nil
}

// ルーム内のメッセージ取得（user1ID, user2ID間ではなくroom_idで取得するように変更推奨）
func GetMessagesInRoom(db *gorm.DB, roomID uint) ([]models.Message, error) {
	var messages []models.Message
	err := db.
		Where("room_id = ?", roomID).
		Order("created_at asc").
		Find(&messages).Error

	return messages, err
}
