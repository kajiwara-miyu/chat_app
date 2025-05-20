import { Message, User } from "../types";
import { useEffect, useRef } from "react";
import dayjs from "dayjs";

type Props = {
  messages: Message[];         // 表示するメッセージ一覧
  selectedUser: User | null;   // 1対1チャット時の相手ユーザー（グループ時は null）
  me: User;                    // 自分自身のユーザー情報
  roomName?: string;           // グループチャットのルーム名（1対1時は undefined）
  text: string;                // 現在入力中のテキスト
  setText: (text: string) => void; // 入力値更新関数（親から渡される）
  onSend: () => void;          // 送信ボタンまたはEnter押下時に呼ばれる送信関数（親から渡される）
};

// ChatPage.tsx から呼び出されるチャット画面コンポーネント
export default function ChatWindow({
  messages,
  selectedUser,
  me,
  roomName,
  text,
  setText,
  onSend,
}: Props) {
  // 🔹 メッセージ末尾に自動スクロールするための ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // 🔸 メッセージが更新されたら最下部にスクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 🔸 メッセージを日付ごとにグループ化（YYYY/MM/DD）
  const grouped = messages.reduce((acc: { [date: string]: Message[] }, msg) => {
    const date = dayjs(msg.created_at).format("YYYY/MM/DD");
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  // 🔸 textareaで Enter → 送信、Shift+Enter → 改行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // デフォルトの改行を無効化
      onSend();           // 親から渡された送信処理を呼び出す
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 🔹 チャットヘッダー：ユーザー名またはグループ名 */}
      <h3 style={{ marginBottom: 10 }}>
        {roomName || selectedUser?.username || "チャット"}
      </h3>

      {/* 🔹 メッセージ表示エリア（スクロール可能） */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: 5,
          padding: 10,
          backgroundColor: "#f9f9f9",
        }}
      >
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            {/* 日付区切り表示 */}
            <div style={{ textAlign: "center", color: "#888", margin: "12px 0" }}>
              ―――― {date} ――――
            </div>

            {msgs.map((msg) => {
              const isMine = msg.sender_id === me.id;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    marginBottom: 12,
                    gap: 6,
                  }}
                >
                  {/* 🔸 送信時間（相手） */}
                  {!isMine && (
                    <div style={{ fontSize: 10, color: "#999", alignSelf: "flex-end" }}>
                      {dayjs(msg.created_at).format("HH:mm")}
                    </div>
                  )}

                  {/* 🔸 メッセージ本体 */}
                  <div
                    style={{
                      maxWidth: 400,
                      backgroundColor: isMine ? "#dcf8c6" : "#fff",
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      padding: "8px 12px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {/* ユーザー名（自分 or 相手） */}
                    <strong style={{ fontSize: 12 }}>
                      {isMine
                        ? "あなた"
                        : msg.sender_name || selectedUser?.username || "参加者"}
                    </strong>

                    {/* メッセージ内容 */}
                    <div style={{ marginTop: 4 }}>{msg.content}</div>
                  </div>

                  {/* 🔸 送信時間（自分） */}
                  {isMine && (
                    <div style={{ fontSize: 10, color: "#999", alignSelf: "flex-end" }}>
                      {dayjs(msg.created_at).format("HH:mm")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 🔹 メッセージ入力エリア */}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)} // 🔸 入力テキストの更新
          onKeyDown={handleKeyDown} // 🔸 Enter送信の対応
          placeholder="メッセージを入力（Enterで送信 / Shift+Enterで改行）"
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 5,
            border: "1px solid #ccc",
            fontSize: 14,
            minHeight: 50,
            resize: "vertical",
          }}
        />
        <button
          onClick={onSend} // 🔸 ボタン押下で送信処理
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
}
