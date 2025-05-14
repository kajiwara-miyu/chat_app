package models

import "time"

type ChatRoom struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	RoomName  *string   `json:"room_name"`                     // 1対1のときはNULL
	IsGroup   bool      `gorm:"default:false" json:"is_group"` // false = 1対1
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
