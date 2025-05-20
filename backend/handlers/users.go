package handlers

import (
	"backend/database"
	"backend/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

// ユーザー追加
func AddMemberHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		// 1. 現在のユーザーIDを取得
		currentUserID := GetCurrentUserID(c)

		// 2. ルームIDを文字列→uintへ変換
		roomIDStr := c.Param("roomId") // string型
		roomIDUint64, err := strconv.ParseUint(roomIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room ID"})
			return
		}
		roomID := uint(roomIDUint64) // 最終的に uint に変換

		// 3. リクエストバインド
		var req models.AddMember
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		// 自分がそのルームのメンバーであることを確認
		var self models.RoomMember
		if err := db.Where("room_id = ? AND user_id = ?", roomID, currentUserID).First(&self).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
			return
		}

		// 4. メンバー登録
		member := models.RoomMember{
			RoomID:   roomID,
			UserID:   req.UserID,
			JoinedAt: time.Now(),
		}

		if err := db.Create(&member).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add member"})
			return
		}

		// 5. ログ出力
		log.Printf("✅ User %d added user %d to room %d", currentUserID, req.UserID, roomID)

		// 6. レスポンス
		c.JSON(http.StatusOK, gin.H{"message": "member added"})
	}
}

// ユーザー削除
func RemoveMemberHandler(c *gin.Context) {
	roomID := c.Param("roomId")
	userID := c.Param("userId")
	currentUserID := GetCurrentUserID(c)

	// 自分がそのルームのメンバーであることを確認
	var self models.RoomMember
	if err := db.Where("room_id = ? AND user_id = ?", roomID, currentUserID).First(&self).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}

	// 削除対象のメンバーが存在するか
	var target models.RoomMember
	if err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "target not found in room"})
		return
	}

	// 削除処理
	if err := db.Delete(&target).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}
