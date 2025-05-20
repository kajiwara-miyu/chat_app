package database

import (
	"backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func CreateUser(db *gorm.DB, username, password string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := models.User{
		Username:     username,
		PasswordHash: string(hashed),
	}

	return db.Create(&user).Error
}

func GetUsers(db *gorm.DB) ([]models.User, error) {
	var users []models.User
	err := db.Find(&users).Error
	return users, err
}

func AuthenticateUser(db *gorm.DB, username, password string) (bool, error) {
	var user models.User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return false, err
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	return err == nil, err
}
