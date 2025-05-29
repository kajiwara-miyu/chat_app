package models

import (
	"gorm.io/gorm"
)

type ChatRoom struct {
	gorm.Model
	RoomName *string `json:"room_name"`                     // 1対1ではNULL、グループで表示名
	IsGroup  bool    `gorm:"default:false" json:"is_group"` // false = 1対1, true = グループ
}

type GroupChatRoom struct {
	RoomID      uint    `json:"room_id"`
	IsGroup     bool    `json:"is_group"`
	RoomName    *string `json:"room_name"`  // グループチャット用
	MemberIDs   []uint  `json:"member_ids"` // 自分以外のメンバー
	LastMessage *string `json:"last_message"`
}
