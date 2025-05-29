// handlers/ws.go
package handlers

import (
	"backend/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// WebSocket用アップグレーダー
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// クライアント接続管理
var roomClients = make(map[uint][]*websocket.Conn)
var broadcast = make(chan models.Message)

// WebSocket 接続開始用ハンドラ
func HandleWebSocket(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("🔥 Panic recovered in HandleWebSocket: %v", rec)
			}
		}()

		// ✅ クエリからJWTトークン取得
		token := r.URL.Query().Get("token")
		log.Println("🔍 token from client:", token)
		roomIDStr := r.URL.Query().Get("room_id")
		if token == "" || roomIDStr == "" {
			log.Println("❌ token is missing")
			http.Error(w, "Missing token or room_id", http.StatusBadRequest)
			return
		}

		// ✅ トークンを検証して user_id を取得
		userID, err := ParseJWT(token)
		if err != nil {
			log.Println("❌ token parse error:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		roomID64, err := strconv.ParseUint(roomIDStr, 10, 64)
		if err != nil {
			http.Error(w, "Invalid room_id", http.StatusBadRequest)
			return
		}
		roomID := uint(roomID64)

		// ✅ WebSocket接続をアップグレード（検証後！）
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("Upgrade error:", err)
			return
		}
		defer conn.Close()

		log.Println("🔌 WebSocket client connected")

		// 接続登録
		roomClients[roomID] = append(roomClients[roomID], conn)
		log.Printf("🔗 User %d connected to room %d\n", userID, roomID)

		defer func() {
			// 切断時にリストから削除
			conns := roomClients[roomID]
			for i, c := range conns {
				if c == conn {
					roomClients[roomID] = append(conns[:i], conns[i+1:]...)
					break
				}
			}
			conn.Close()
		}()

		// メッセージ受信ループ
		for {
			var msg models.Message
			if err := conn.ReadJSON(&msg); err != nil {
				log.Println("Read error:", err)
				break
			}

			log.Printf("📩 Received message: %+v\n", msg)

			// 🔽 メッセージに現在時刻を追加（CreatedAt は ISO形式で）
			msg.SenderID = userID
			msg.CreatedAt = time.Now()
			msg.Type = "message"

			if db == nil {
				log.Println("❌ dbInstance is nil")
				break
			}

			// 🔽 データベースに保存してIDを確定させる
			if err := db.Create(&msg).Error; err != nil {
				log.Println("❌DB save error:", err)
				continue
			}
			log.Printf("💾 Message saved with ID: %d\n", msg.ID)

			// 🔽 保存された msg（ID付き）をブロードキャスト
			broadcast <- msg
			log.Println("📤 Message enqueued for broadcast")
		}
	}
}

// 全クライアントにメッセージを送信する処理
func StartBroadcast() {
	for {
		msg := <-broadcast
		log.Printf("📡 Broadcasting message ID %d\n", msg.ID)

		// ⛳️ DBから message に関連する attachment を取得
		var attachments []models.MessageAttachment
		db.Where("message_id = ?", msg.ID).Find(&attachments)

		// 保存されたmsgから送信用データを作る
		wsMsg := models.WSMessage{
			Type:       "message",
			ID:         msg.ID,
			RoomID:     msg.RoomID,
			SenderID:   msg.SenderID,
			SenderName: msg.SenderName, // 必要ならDBから取得
			Content:    msg.Content,
			CreatedAt:  msg.CreatedAt.Format(time.RFC3339),
		}

		for _, att := range attachments {
			wsMsg.Attachments = append(wsMsg.Attachments, models.MessageAttachment{
				FileName: att.FileName,
			})
		}

		// ✅ そのルームの接続者にだけブロードキャスト
		for _, client := range roomClients[msg.RoomID] {
			if err := client.WriteJSON(wsMsg); err != nil {
				log.Println("❌ Write error:", err)
				client.Close()
			}
		}

	}
}

func BroadcastToRoom(roomID uint, payload interface{}) {
	clients := roomClients[roomID]
	for _, client := range clients {
		if err := client.WriteJSON(payload); err != nil {
			log.Println("❌ BroadcastToRoom Write error:", err)
			client.Close()
		}
	}
}
