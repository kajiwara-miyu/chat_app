package models

import (
	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	RoomID       uint   `gorm:"index;not null" json:"id"`
	SenderID     uint   `gorm:"index;not null" json:"sender_id"`
	Content      string `gorm:"type:text"json:"content"`
	ThreadRootID *uint  `gorm:"index"json:"thread_root_id"` // スレッド対応用
}
