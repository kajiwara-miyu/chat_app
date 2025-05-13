package database

import (
	"backend/models"

	"gorm.io/gorm"
)

func SendMessage(db *gorm.DB, roomID, senderID, receiverID uint, text string) error {
	message := models.Message{
		RoomID:     roomID,
		SenderID:   senderID,
		ReceiverID: receiverID,
		Text:       text,
	}

	return db.Create(&message).Error
}

func GetMessagesBetween(db *gorm.DB, user1ID, user2ID uint) ([]models.Message, error) {
	var messages []models.Message
	err := db.
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			user1ID, user2ID, user2ID, user1ID).
		Order("timestamp asc").
		Find(&messages).Error

	return messages, err
}
