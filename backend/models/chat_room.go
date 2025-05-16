package models

import (
	"gorm.io/gorm"
)

type ChatRoom struct {
	gorm.Model
	RoomName *string `json:"room_name"`                     // 1対1ではNULL、グループで表示名
	IsGroup  bool    `gorm:"default:false" json:"is_group"` // false = 1対1, true = グループ
}
