package database

import (
	"backend/models"

	"gorm.io/gorm"
)

// メッセージ送信
func SendMessage(db *gorm.DB, roomID, senderID uint, content string, threadRootID *uint) error {
	message := models.Message{
		RoomID:       roomID,
		SenderID:     senderID,
		Content:      content,
		ThreadRootID: threadRootID,
	}

	return db.Create(&message).Error
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
