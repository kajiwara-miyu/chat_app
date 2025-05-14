package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username     string `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string `json:"password_hash"`
}
