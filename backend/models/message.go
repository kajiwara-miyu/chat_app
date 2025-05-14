package models

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	RoomID     uint      `json:"room_id"`
	SenderID   uint      `json:"sender_id"`
	ReceiverID uint      `json:"receiver_id"`
	Text       string    `json:"text"`
	Timestamp  time.Time `json:"timestamp"`
}
