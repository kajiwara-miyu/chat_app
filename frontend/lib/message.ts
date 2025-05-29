// lib/message.ts
// メッセージ取得・送信に関するAPIユーティリティ関数群
// 使用される主な場所: チャット画面（例: pages/chat/[room_id].tsx や components/ChatWindow.tsx）

import { Message } from "../types";

// =========================
// 🔹 指定されたルームのメッセージ一覧を取得
// =========================
// - 処理: 特定のチャットルームに属する全メッセージを取得する
// - エンドポイント: GET /messages?room_id=xxx
// - 使用場所:
//   - チャット画面を開いたときの初期表示（例: ChatWindow.tsx や MessageList.tsx）
//   - ルーム切り替え時にも呼び出される
// - 使用例: const messages = await fetchMessages(token, roomId);
export async function fetchMessages(token: string, roomId: number): Promise<Message[]> {
  const res = await fetch(`http://localhost:8080/messages?room_id=${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`, // JWTトークンをヘッダーに添付（認証）
    },
  });

  if (!res.ok) throw new Error("メッセージ取得に失敗しました");

  const data = await res.json(); // メッセージの配列を返す

  // ✅ isRead が存在しないときは false に補正（保険）
  return data.map((msg: Partial<Message> & { isRead?: boolean }) => ({
    ...msg,
    isRead: msg.isRead ?? false,
  }));  
}

// =========================
// 🔹 メッセージを指定ルームに送信する
// =========================
// - 処理: 入力されたテキストメッセージを指定されたチャットルームに投稿する
// - エンドポイント: POST /messages
// - 使用場所:
//   - チャット入力欄の送信ボタン（例: components/MessageInput.tsx）
//   - キーボードのEnterキーによる送信トリガー時
// - 使用例: await sendMessage(token, roomId, userId, "こんにちは");
export async function sendMessage(
  token: string,
  roomId: number,
  senderId: number,
  text: string
): Promise<void> {
  const res = await fetch("http://localhost:8080/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに設定
    },
    body: JSON.stringify({ room_id: roomId, sender_id: senderId, content: text }), // メッセージ内容を送信
  });

  if (!res.ok) throw new Error("メッセージ送信に失敗しました"); // エラー時には例外をスロー
}


export async function fetchGroupMessages(token: string, roomId: number): Promise<Message[]> {
  const res = await fetch(`http://localhost:8080/messages/group/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("メッセージ取得失敗");

  const data = await res.json(); // メッセージの配列を返す

  // ✅ isRead が存在しないときは false に補正（保険）
  return data.map((msg: any) => ({
    ...msg,
    isRead: msg.isRead ?? false,
  }));
}


//既読の永続化処理
export function markAllMessagesAsRead(messages: Message[], meId: number, token: string){
  messages.forEach((msg) => {
    const hasValidId = typeof msg.id === "number";
    const isFromPartner = msg.sender_id !== meId;
    const alreadyRead = msg.isRead;
  
    if (!hasValidId || !isFromPartner || alreadyRead) {
      console.log("⏭️ スキップ理由:", {
        id: msg.id,
        sender_id: msg.sender_id,
        meId,
        isRead: msg.isRead,
        room_id: msg.room_id,
      });
      return;
    }
  
    console.log("✅ 既読API呼び出し:", msg.id);
    fetch(`http://localhost:8080/messages/${msg.id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) =>
      console.warn(`❌ Failed to mark message ${msg.id} as read`, err)
    );
  });
}  



export async function updateMessage(id: number, content: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:8080/messages/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error("編集に失敗しました");
  }
}

export async function deleteMessage(id: number) {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:8080/messages/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("削除に失敗しました");
  }
}

