package handlers

import (
	"backend/database"
	"net/http"

	"github.com/gin-gonic/gin"
)

//ユーザー一覧

func GetUsersHandler(c *gin.Context) {
	users, err := database.GetUsers(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	c.JSON(http.StatusOK, users)
}
