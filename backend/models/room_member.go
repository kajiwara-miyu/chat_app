package models

import "time"

type RoomMember struct {
	ID       uint      `gorm:"primaryKey" json:"id"`
	RoomID   uint      `json:"room_id"`
	UserID   uint      `json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}
