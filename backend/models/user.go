package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username        string `gorm:"uniqueIndex;not null" json:"username"`
	Email           string
	PasswordHash    string `json:"password_hash"`
	ProfileImageURL string
	ProfileMessage  string
	IsAdmin         bool
}
