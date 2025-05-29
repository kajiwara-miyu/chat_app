package models

import (
	"time"
)

type MessageAttachment struct {
	ID        uint   `gorm:"primaryKey"`
	MessageID uint   `gorm:"index;not null"` // 外部キー
	FileName  string `gorm:"type:varchar(255);not null"`
	CreatedAt time.Time
}
