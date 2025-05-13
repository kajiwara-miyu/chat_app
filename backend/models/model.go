package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID            uint   `gorm:"primaryKey"`
	Username      string `gorm:"uniqueIndex;not null"`
	Password_Hash string
}

type Message struct {
	gorm.Model
	ID         uint `gorm:"primaryKey"`
	SenderID   uint
	ReceiverID uint
	Text       string
	Timestamp  time.Time
}
