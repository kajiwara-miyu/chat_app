package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username      string `gorm:"uniqueIndex;not null"`
	Password_Hash string
}

type Message struct {
	gorm.Model
	RoomID     uint
	SenderID   uint
	ReceiverID uint
	Text       string
	Timestamp  time.Time
}
