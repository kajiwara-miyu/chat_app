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

  return await res.json(); // メッセージの配列を返す
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
