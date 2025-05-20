package models

import (
	"time"

	"gorm.io/gorm"
)

type RoomMember struct {
	gorm.Model
	RoomID   uint      `json:"room_id"`
	UserID   uint      `json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}

type AddMember struct {
	UserID uint `json:"userId"`
}
