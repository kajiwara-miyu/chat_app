package handlers

import (
	"log"
	"net/http"
	"time"

	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// =======================
// 🔹 1対1ルーム作成
// =======================
// エンドポイント: POST /rooms
// 呼び出し元: frontend `lib/room.ts` の createRoom() → ChatPage.tsx や RoomList.tsx から利用

func CreateRoomHandler(db *gorm.DB) gin.HandlerFunc { //✅
	return func(c *gin.Context) {
		// リクエストボディから partner_id を取得
		var input struct {
			PartnerID uint `json:"partner_id"`
		}

		// JWTから現在のログインユーザーIDを取得
		userIDInterface, _ := c.Get("user_id")
		userID := userIDInterface.(uint)

		// 入力バリデーション
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// 🔸 同じ2人のルームが既に存在しているかチェック（is_group = false）
		var existingRoomID uint

		row := db.Raw(`
			SELECT r.id FROM chat_rooms r
			JOIN room_members m1 ON r.id = m1.room_id
			JOIN room_members m2 ON r.id = m2.room_id
			WHERE r.is_group = false AND m1.user_id = ? AND m2.user_id = ?
			GROUP BY r.id
			HAVING COUNT(DISTINCT m1.user_id) = 1 AND COUNT(DISTINCT m2.user_id) = 1
`, userID, input.PartnerID).Row()

		if err := row.Scan(&existingRoomID); err == nil && existingRoomID != 0 {
			log.Println(" 既存ルームが見つかりました:", existingRoomID)
			c.JSON(http.StatusOK, gin.H{"room_id": existingRoomID})
			return
		}

		// 🔸 新しいルームをDBに作成
		room := models.ChatRoom{IsGroup: false}
		if err := db.Create(&room).Error; err != nil {
			log.Println(" ルーム作成エラー:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ルーム作成に失敗"})
			return
		}

		// 🔸 参加者2人を room_members テーブルに登録
		members := []models.RoomMember{
			{RoomID: room.ID, UserID: userID, JoinedAt: time.Now()},
			{RoomID: room.ID, UserID: input.PartnerID, JoinedAt: time.Now()},
		}
		db.Create(&members)

		// 新規作成されたルームIDを返す
		c.JSON(http.StatusOK, gin.H{"room_id": room.ID})
	}
}

// =======================
// 🔹 1対1ルーム一覧取得
// =======================
// エンドポイント: GET /rooms
// 呼び出し元: lib/room.ts の getRooms() → ChatPage.tsx, handleStartChat など

// レスポンス用の構造体
type RoomResponse struct {
	RoomID      uint      `json:"room_id"`
	PartnerID   uint      `json:"partner_id"`
	PartnerName string    `json:"partner_name"`
	LastMessage string    `json:"last_message"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// 1対1のチャットルーム一覧を取得
func GetRoomHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔹 ユーザーIDの取得
		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未認証のユーザーです"})
			return
		}

		userID, ok := userIDInterface.(uint)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "user_id の型変換に失敗しました"})
			return
		}

		var rooms []RoomResponse

		// 🔹 SQL実行（自分が所属するルーム + 最新メッセージ + 相手情報）
		err := db.Raw(`
			SELECT
				r.id AS room_id,
				u.id AS partner_id,
				u.username AS partner_name,
				COALESCE(m.content, '') AS last_message,
				COALESCE(m.created_at, r.updated_at) AS updated_at
			FROM chat_rooms r
			JOIN room_members rm1 ON rm1.room_id = r.id AND rm1.user_id = ?
			JOIN room_members rm2 ON rm2.room_id = r.id AND rm2.user_id != ?
			JOIN users u ON u.id = rm2.user_id
			LEFT JOIN LATERAL (
				SELECT content, created_at FROM messages
				WHERE room_id = r.id
				ORDER BY created_at DESC
				LIMIT 1
			) m ON true
			WHERE r.is_group = false
			ORDER BY updated_at DESC
		`, userID, userID).Scan(&rooms).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ルーム取得に失敗しました"})
			return
		}

		for i := range rooms {
			if rooms[i].LastMessage == "" {
				// そのルームの最新メッセージを取得
				var msg models.Message
				err := db.
					Where("room_id = ?", rooms[i].RoomID).
					Order("created_at DESC").
					First(&msg).Error
				if err == nil {
					var attachments []models.MessageAttachment
					db.Where("message_id = ?", msg.ID).Find(&attachments)

					if len(attachments) > 0 {
						rooms[i].LastMessage = "📷 画像メッセージ"
					}
				}
			}
		}

		c.JSON(http.StatusOK, rooms)
	}
}

// =======================
// 🔹 グループルーム作成
// =======================
// エンドポイント: POST /rooms/group
// 呼び出し元: lib/room.ts の createGroupRoom() → ChatPage.tsx の handleCreateGroup() など
func CreateGrouproomHandler(c *gin.Context) {
	var req models.GroupChatRoom
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := GetCurrentUserID(c)

	// 🔸 ルーム作成
	room := models.ChatRoom{
		RoomName: req.RoomName,
		IsGroup:  true,
	}
	if err := db.Create(&room).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create room"})
		return
	}

	// 🔸 自分も含めてすべてのメンバーを登録
	memberIDs := append(req.MemberIDs, userID)
	for _, id := range memberIDs {
		db.Create(&models.RoomMember{
			RoomID:   room.ID,
			UserID:   id,
			JoinedAt: time.Now(),
		})
	}

	// レスポンスとしてグループルームの情報を返す
	c.JSON(http.StatusOK, gin.H{
		"id":        room.ID,
		"roomName":  room.RoomName,
		"isGroup":   room.IsGroup,
		"memberIds": memberIDs,
	})
}

// =======================
// 🔹 グループルーム一覧取得
// =======================
// エンドポイント: GET /rooms/group
// 呼び出し元: lib/room.ts の fetchGroupRooms() → ChatPage.tsx や UserAndGroupList.tsx など
func GetGrouproomHandler(c *gin.Context) {
	userID := GetCurrentUserID(c)

	// 1. 自分が所属するルームIDを取得
	var roomIDs []uint
	if err := db.
		Model(&models.RoomMember{}).
		Where("user_id = ?", userID).
		Pluck("room_id", &roomIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	// 2. グループルーム（is_group = true）を取得
	var rooms []models.ChatRoom
	if err := db.
		Where("id IN ? AND is_group = ?", roomIDs, true).
		Find(&rooms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	// 3. ルームごとのメンバー情報を取得
	var roomMembers []models.RoomMember
	if err := db.
		Where("room_id IN ?", roomIDs).
		Find(&roomMembers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	// 4. 最新メッセージを取得
	type LastMessage struct {
		RoomID      uint
		LastMessage string
	}

	var messages []LastMessage
	db.Raw(`
		SELECT m.room_id, m.content as last_message
		FROM messages m
		INNER JOIN (
			SELECT room_id, MAX(created_at) as latest
			FROM messages
			WHERE room_id IN ?
			GROUP BY room_id
		) sub ON m.room_id = sub.room_id AND m.created_at = sub.latest
	`, roomIDs).Scan(&messages)

	// 5. map[room_id] = content に変換
	messageMap := make(map[uint]string)
	for _, msg := range messages {
		// 空メッセージ（画像のみ）なら添付ファイルを確認
		if msg.LastMessage == "" {
			var m models.Message
			if err := db.Where("room_id = ?", msg.RoomID).Order("created_at DESC").First(&m).Error; err == nil {
				var attachments []models.MessageAttachment
				db.Where("message_id = ?", m.ID).Find(&attachments)
				if len(attachments) > 0 {
					messageMap[msg.RoomID] = "📷 画像メッセージ"
					continue
				}
			}
		}
		// 通常のメッセージ（または添付なかった場合）
		messageMap[msg.RoomID] = msg.LastMessage
	}

	// 6. room_id ごとにメンバーIDをまとめる
	memberMap := make(map[uint][]uint)
	for _, rm := range roomMembers {
		memberMap[rm.RoomID] = append(memberMap[rm.RoomID], rm.UserID)
	}

	// 7. レスポンス形式に変換して返す
	response := []models.GroupChatRoom{}
	for _, r := range rooms {
		msg := messageMap[r.ID]
		response = append(response, models.GroupChatRoom{
			RoomID:      r.ID,
			RoomName:    r.RoomName,
			IsGroup:     r.IsGroup,
			MemberIDs:   memberMap[r.ID],
			LastMessage: &msg,
		})
	}

	c.JSON(http.StatusOK, response)
}
