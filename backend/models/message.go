package models

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	ID           uint      `json:"id"`
	RoomID       uint      `json:"room_id"`
	SenderID     uint      `json:"sender_id"`
	Content      string    `json:"content"`        // ← Text → Content に変更
	ThreadRootID *uint     `json:"thread_root_id"` // NULL許容（スレッド未使用なら）
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
