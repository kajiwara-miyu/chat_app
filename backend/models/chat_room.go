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
	IsGroup   bool    `json:"isGroup"`
	RoomName  *string `json:"roomName"`  // グループチャット用
	MemberIDs []uint  `json:"memberIds"` // 自分以外のメンバー
}
