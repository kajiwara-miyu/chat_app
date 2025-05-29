package models

import (
	"time"
)

type MessageRead struct {
	MessageID uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"primaryKey"`
	Reaction  *string   `gorm:"type:varchar(255);"`
	ReadAt    time.Time `gorm:"autoCreateTime"`
}

type MessageWithRead struct {
	Message        `json:",inline"`
	IsRead         bool `json:"isRead"`         // 自分が読んだか
	IsReadByOthers bool `json:"isReadByOthers"` // 他人が読んだか（送信者が確認）
}

type ReadNotification struct {
	Type      string `json:"type"`       // "read"
	MessageID uint   `json:"message_id"` // 既読対象のメッセージ
	UserID    uint   `json:"user_id"`    // 読んだ人のID
	RoomID    uint   `json:"room_id"`    // メッセージが属するルーム
}

// handlers/ws.go 内の上部（import文の下など）に追加
type WSMessage struct {
	Type        string              `json:"type"` // "message"
	ID          uint                `json:"id"`
	RoomID      uint                `json:"room_id"`
	SenderID    uint                `json:"sender_id"`
	SenderName  string              `json:"sender_name"`
	Content     string              `json:"content"`
	CreatedAt   string              `json:"created_at"` // RFC3339で送る用
	Attachments []MessageAttachment `json:"attachments"`
}
