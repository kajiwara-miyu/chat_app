package handlers

import (
	"backend/database"
	"backend/models"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm/clause"
)

// 文字列を uint に変換する
func parseUint(s string) uint {
	u64, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0 // または panic(err)
	}
	return uint(u64)
}

// メッセージ送信
func SendMessageHandler(c *gin.Context) {
	var input struct {
		RoomID       uint   `json:"room_id"`
		SenderID     uint   `json:"sender_id"`
		Content      string `json:"content"`
		ThreadRootID *uint  `json:"thread_root_id"` // スレッド型チャットを想定する場合
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// ① メッセージを保存
	message, err := database.SendMessage(db, input.RoomID, input.SenderID, input.Content, input.ThreadRootID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// ② メンション処理を追加
	handleMentions(db, message)

	// ③ レスポンス
	c.JSON(http.StatusOK, gin.H{"message": "Message sent successfully"})
}

// メッセージ一覧取得
func GetMessagesHandler(c *gin.Context) {
	userID := GetCurrentUserID(c)
	roomIDStr := c.Query("room_id")
	if roomIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room_id is required"})
		return
	}

	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room_id"})
		return
	}

	// 🔸 メッセージを取得
	var messages []models.Message
	if err := db.
		Preload("Attachments").
		Where("room_id = ? AND deleted_at IS NULL", roomID).
		Order("created_at asc").
		Find(&messages).Error; err != nil {
		log.Println("❌ メッセージ取得失敗:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get messages"})
		return
	}

	// 添付ファイルも一緒に取得
	if err := db.Preload("Attachments").Where("room_id = ?", roomID).Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メッセージ取得失敗"})
		return
	}

	// 🔸 自分が既読にした message_id を取得
	var readIDs []uint
	if err := db.Table("message_reads").
		Select("message_id").
		Where("user_id = ?", userID).
		Find(&readIDs).Error; err != nil {
		log.Println("❌ 既読情報取得失敗:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get read info"})
		return
	}
	readMap := make(map[uint]bool)
	for _, id := range readIDs {
		readMap[id] = true
	}

	// 🔸 自分のメッセージで、他人が既読にしたもの
	var readByOthersIDs []uint
	if err := db.Table("message_reads").
		Select("message_id").
		Joins("JOIN messages ON messages.id = message_reads.message_id").
		Where("messages.room_id = ? AND messages.sender_id = ? AND message_reads.user_id != ?", roomID, userID, userID).
		Find(&readByOthersIDs).Error; err != nil {
		log.Println("❌ 他人の既読情報取得失敗:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get readByOthers info"})
		return
	}
	readByOthersMap := make(map[uint]bool)
	for _, id := range readByOthersIDs {
		readByOthersMap[id] = true
	}

	// 🔸 メッセージごとにフラグ付けして返却
	var result []models.MessageWithRead
	for _, msg := range messages {
		result = append(result, models.MessageWithRead{
			Message:        msg,
			IsRead:         readMap[msg.ID],
			IsReadByOthers: readByOthersMap[msg.ID],
		})
	}

	c.JSON(http.StatusOK, result)
}

// メッセージ送信（グループ + スレッド対応）
func SendGroupMessageHandler(c *gin.Context) {
	roomID := c.Param("roomId")
	userID := GetCurrentUserID(c)

	var req models.Message
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ユーザーがそのルームのメンバーか確認
	var member models.RoomMember
	if err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}

	// thread_root_id が指定されている場合は検証
	if req.ThreadRootID != nil {
		var rootMsg models.Message
		if err := db.First(&rootMsg, *req.ThreadRootID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid thread root ID"})
			return
		}
		if rootMsg.RoomID != parseUint(roomID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "thread message must belong to the same room"})
			return
		}
	}

	msg := models.Message{
		RoomID:       parseUint(roomID),
		SenderID:     userID,
		Content:      req.Content,
		ThreadRootID: req.ThreadRootID,
	}

	if err := db.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to post message"})
		return
	}

	c.JSON(http.StatusOK, msg)
}

// メッセージ一覧取得(グループ)
func GetGroupMessagesHandler(c *gin.Context) {
	roomIDStr := c.Param("roomId")
	userID := GetCurrentUserID(c)

	// ルームIDバリデーション
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room_id"})
		return
	}

	// ユーザーがそのルームのメンバーか確認
	var member models.RoomMember
	if err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}

	// メッセージ取得
	var messages []models.Message
	if err := db.
		Preload("Attachments").
		Where("room_id = ?", roomID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get messages"})
		return
	}

	// 既読情報を付与
	var result []models.MessageWithRead
	for _, m := range messages {
		var count int64
		db.Model(&models.MessageRead{}).
			Where("message_id = ? AND user_id = ?", m.ID, userID).
			Count(&count)

		result = append(result, models.MessageWithRead{
			Message: m,
			IsRead:  count > 0,
		})
	}

	c.JSON(http.StatusOK, result)
}

// POST /messages/{id}/read
func MarkMessageAsRead(c *gin.Context) {
	userID := GetCurrentUserID(c)
	messageIDStr := c.Param("id")

	// 文字列 → uint に変換（エラーハンドリングあり）
	messageID64, err := strconv.ParseUint(messageIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}
	messageID := uint(messageID64)

	log.Printf("🟡 Marking as read: userID=%d, messageID=%d\n", userID, messageID)

	read := models.MessageRead{
		MessageID: messageID,
		UserID:    userID,
		ReadAt:    time.Now(),
	}

	// 既読登録（重複登録を避ける）
	err = db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "message_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(&read).Error

	if err != nil {
		log.Printf("❌ DB error: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to mark as read"})
		return
	}

	// ✅ 🔽🔽🔽 ここに room_id の取得を追加 🔽🔽🔽
	var msg models.Message
	if err := db.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	roomID := msg.RoomID

	// ✅ WebSocket通知の構造体を作成
	notification := models.ReadNotification{
		Type:      "read",
		MessageID: messageID,
		UserID:    userID,
		RoomID:    msg.RoomID,
	}

	// ✅ 全クライアントにブロードキャスト（最低構成）
	for _, client := range roomClients[roomID] {
		if err := client.WriteJSON(notification); err != nil {
			log.Println("❌ WebSocket送信エラー:", err)
			client.Close()
		}
	}

	c.JSON(200, gin.H{"status": "ok"})
}

// POST /messages/read_all?room_id=123
func MarkAllMessagesAsRead(c *gin.Context) {
	userID := GetCurrentUserID(c)
	roomIDStr := c.Query("room_id")
	if roomIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room_id is required"})
		return
	}

	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room_id"})
		return
	}

	// 対象メッセージの ID を一括取得（自分以外が送信したもの）
	var messageIDs []uint
	if err := db.Table("messages").
		Select("id").
		Where("room_id = ? AND sender_id != ?", roomID, userID).
		Scan(&messageIDs).Error; err != nil {
		c.JSON(500, gin.H{"error": "DB read failed"})
		return
	}

	// 重複登録を避けて insert 用データを作成
	now := time.Now()
	var reads []models.MessageRead
	for _, id := range messageIDs {
		reads = append(reads, models.MessageRead{
			MessageID: id,
			UserID:    userID,
			ReadAt:    now,
		})
	}

	// 既読テーブルに一括 insert（重複無視）
	if err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "message_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(&reads).Error; err != nil {
		c.JSON(500, gin.H{"error": "DB write failed"})
		return
	}

	// 最後のメッセージIDが存在すれば通知を送る
	if len(reads) > 0 {
		// 末尾のメッセージを通知対象にする
		lastMessageID := reads[len(reads)-1].MessageID

		notification := models.ReadNotification{
			Type:      "read",
			MessageID: lastMessageID,
			UserID:    userID,
		}

		// そのroomのWebSocketクライアントに送る
		for _, client := range roomClients[uint(roomID)] {
			if err := client.WriteJSON(notification); err != nil {
				log.Println("❌ WebSocket送信エラー:", err)
				client.Close()
			}
		}
	}
	c.JSON(200, gin.H{"status": "ok", "read_count": len(reads)})
}

// GET /chat_rooms/{id}/unread_count
func GetUnreadCount(c *gin.Context) {
	userID := GetCurrentUserID(c)
	chatRoomID := c.Param("id")

	var count int64
	db.Raw(`
      SELECT COUNT(*) FROM messages m
      WHERE m.chat_room_id = ? AND m.id NOT IN (
        SELECT message_id FROM message_reads WHERE user_id = ?
      ) AND m.sender_id != ?`,
		chatRoomID, userID, userID,
	).Scan(&count)

	c.JSON(200, gin.H{"unread_count": count})
}

// 編集
func UpdateMessageHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
			return
		}

		var body struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
			return
		}

		var msg models.Message
		if err := db.First(&msg, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
			return
		}

		msg.Content = body.Content
		msg.UpdatedAt = time.Now()

		if err := db.Save(&msg).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
			return
		}

		BroadcastToRoom(msg.RoomID, map[string]interface{}{
			"type":        "update",
			"message_id":  msg.ID,
			"new_content": msg.Content,
		})

		c.JSON(http.StatusOK, msg)
	}
}

// 削除
func DeleteMessageHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
			return
		}

		// 削除前にメッセージ取得（RoomID の取得に使う）
		var msg models.Message
		if err := db.First(&msg, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
			return
		}

		// 削除
		if err := db.Delete(&msg).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
			return
		}

		// WebSocket ブロードキャスト
		BroadcastToRoom(msg.RoomID, map[string]interface{}{
			"type":       "delete",
			"message_id": msg.ID,
		})

		c.Status(http.StatusNoContent)
	}
}

// @ユーザー名 を抽出する関数
func extractMentions(content string) []string {
	re := regexp.MustCompile(`@(\w+)`)
	matches := re.FindAllStringSubmatch(content, -1)

	var usernames []string
	for _, m := range matches {
		usernames = append(usernames, m[1])
	}
	return usernames
}

// メンション処理の関数
func handleMentions(db *gorm.DB, message models.Message) {
	usernames := extractMentions(message.Content)

	for _, name := range usernames {
		var user models.User
		if err := db.Where("username = ?", name).First(&user).Error; err == nil {
			mention := models.Mention{
				MessageID:       message.ID,
				MentionTargetID: user.ID,
			}
			db.Create(&mention)
		}
	}
}

// メンション通知取得API
func GetMentionsHandler(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	var mentions []models.Mention
	if err := db.Preload("Message").Where("mention_target_id = ?", userID).Find(&mentions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get mentions"})
		return
	}

	// 必要な情報だけを整形して返す（例）
	var result []gin.H
	for _, m := range mentions {
		result = append(result, gin.H{
			"message_id": m.MessageID,
			"content":    m.Message.Content,
			"room_id":    m.Message.RoomID,
			"sender_id":  m.Message.SenderID,
			"created_at": m.Message.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, result)
}
