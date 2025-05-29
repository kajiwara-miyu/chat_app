package models

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	ID           uint                `json:"id"`
	RoomID       uint                `gorm:"index;not null" json:"room_id"`
	SenderID     uint                `gorm:"index;not null" json:"sender_id"`
	Content      string              `gorm:"type:text"json:"content"`
	ThreadRootID *uint               `gorm:"index"json:"thread_root_id"` // スレッド対応用
	CreatedAt    time.Time           `json:"created_at"`
	SenderName   string              `gorm:"type:varchar(255)" json:"sender_name"`
	Type         string              `json:"type"`
	Attachments  []MessageAttachment `gorm:"foreignKey:MessageID"`
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}
