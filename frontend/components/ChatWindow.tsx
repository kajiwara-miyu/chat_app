'use client'

import { Message, User } from "../types";
import dayjs from "dayjs";
import React, { useEffect, useRef,useState, Dispatch, SetStateAction, useCallback } from "react";
import ImageUploadForm from "./ImageUploadForm";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { MentionsInput, Mention } from "react-mentions";
import { MentionData } from "react-mentions";




type Props = {
  messages: Message[];         // 表示するメッセージ一覧
  selectedUser: User | null;   // 1対1チャット時の相手ユーザー（グループ時は null）
  roomId: number | null;
  me: User;                    // 自分自身のユーザー情報
  roomName?: string;           // グループチャットのルーム名（1対1時は undefined）
  text: string;                // 現在入力中のテキスト
  setText: React.Dispatch<React.SetStateAction<string>>; // 入力値更新関数（親から渡される）
  onSend: () => void;          // 送信ボタンまたはEnter押下時に呼ばれる送信関数（親から渡される）
  setMessages: Dispatch<SetStateAction<Message[]>>;
  onEdit: (message: Message) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

// ChatPage.tsx から呼び出されるチャット画面コンポーネント
export default function ChatWindow({
  messages,
  selectedUser,
  me,
  roomName,
  roomId, 
  text,
  setMessages,  
  setText,
  onSend,
  onEdit,
  onDelete
}: Props) {
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [users, setUsers] = useState<MentionData[]>([]);
  const [openedMenuId, setOpenedMenuId] = useState<number | null>(null);
  const toggleMenu = (id: number) => {
    console.log("🔽 メニュー切り替え:", id);
    setOpenedMenuId((prev) => (prev === id ? null : id));
  };

  type UserResponse = {
    id: number;
    username: string;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    fetch("http://localhost:8080/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const text = await res.text();
        if (!text) throw new Error("Empty response");
        return JSON.parse(text);
      })
      .then((data: UserResponse[]) => {
        const formatted = data
          .map((u: UserResponse) => {
            const name = u.username?.trim();
            const safe = name && name !== "" ? name : `user-${u.id}`;
            return { id: safe, display: safe };
          })
          .filter(u => u.display && typeof u.display === "string"); 
          console.log("✅ Mentions用ユーザー:", formatted);
      setUsers(formatted);

      })
      .catch((err) => {
        console.error("ユーザー一覧の取得エラー:", err);
        setUsers([]);
      });
  }, []);
  
// クリック外で閉じる処理
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // "menu-button" や "menu-content" クラスをクリックした場合は閉じない
    if (
      target.closest(".menu-button") ||
      target.closest(".menu-content")
    ) {
      return;
    }
    setOpenedMenuId(null);
  };

  document.addEventListener("click", handleClickOutside);
  return () => {
    document.removeEventListener("click", handleClickOutside);
  };
}, []);

  
  

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
  const [isComposing, setIsComposing] = useState(false);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault(); // デフォルトの改行を無効化
      onSend();           // 親から渡された送信処理を呼び出す
    }
  };
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  const handleImageUpload = async () => {
    if (!imageFile || !roomId || !me) return;
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("room_id", roomId.toString());
    formData.append("sender_id", me.id.toString());
  
    try {
      const res = await fetch("http://localhost:8080/messages/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // トークンが必要な場合
        },
        body: formData,
      });
  
      const newMessage: Message = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setImageFile(null); // ファイルをクリア
    } catch (err) {
      console.error("画像アップロード失敗", err);
    }
  };

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  }, []);
  
  console.log("📩 props.text:", text);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 🔹 チャットヘッダー */}
      <h3 style={{ marginBottom: 10 }}>
        {roomName || selectedUser?.username || "チャット"}
      </h3>
  
      {/* 🔹 メッセージ表示エリア */}
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
            {/* 日付ラベル */}
            <div style={{ textAlign: "center", color: "#888", margin: "12px 0" }}>
              ―――― {date} ――――
            </div>
  
            {msgs.map((msg, index) => {
              const isMine = msg.sender_id === me.id;
              const key = msg.id
                ? `msg-${msg.id}`
                : `temp-${index}-${msg.sender_id}`;
  
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    marginBottom: 12,
                    gap: 6,
                  }}
                >
                  {/* 相手の送信時間 */}
                  {!isMine && (
                    <div style={{ fontSize: 10, color: "#999", alignSelf: "flex-end" }}>
                      {dayjs(msg.created_at).format("HH:mm")}
                    </div>
                  )}
  
                  {/* メッセージ本体 */}
                  <div
                    style={{
                      maxWidth: 400,
                      backgroundColor: isMine ? "#dcf8c6" : "#fff",
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      padding: "8px 12px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      opacity: 1,
                      position: "relative",
                      overflow: "visible",
                    }}
                  >
                    {/* ユーザー名 */}
                    <strong style={{ fontSize: 12 }}>
                      {isMine
                        ? "あなた"
                        : msg.sender_name || selectedUser?.username || "参加者"}
                    </strong>
  
                    {/* 本文 or 添付 */}
                    {(msg.content?.trim() || (msg.attachments?.length ?? 0) > 0) && (
                      <div style={{ marginTop: 4 }}>
                        {msg.content?.trim() && <div>{msg.content}</div>}
                        {Array.isArray(msg.attachments) &&
                          msg.attachments.length > 0 &&
                          msg.attachments.map((att, i) => {
                            const base64 = localStorage.getItem(att.fileName);
                            if (!base64) return null;
                            return (
                              <div key={i} style={{ marginTop: 8 }}>
                                <img
                                  src={base64}
                                  alt=""
                                  style={{ maxWidth: 200, borderRadius: 8 }}
                                />
                              </div>
                            );
                          })}
                      </div>
                    )}
  
                    {/* 既読 + メニューを右下に横並び */}
{isMine && (
  <div style={{
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    fontSize: 10,
    color: "green",
    marginTop: 4,
  }}>
    {msg.isReadByOthers && <span>既読</span>}
    <div style={{ position: "relative" }}>
      <button
        className="menu-button"
        onClick={(e) => {
          e.stopPropagation();
          toggleMenu(msg.id);
        }}
        style={{
          background: "transparent",
          border: "none",
          fontSize: 18,
          padding: "4px 8px",
          borderRadius: 4,
          cursor: "pointer",
        }}
        aria-label="操作メニュー"
      >
        ⋯
      </button>

      {openedMenuId === msg.id && (
        <div
          className="menu-content"
          style={{
            position: "absolute",
            bottom: -60,
            right: 0,
            backgroundColor: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            borderRadius: 6,
            overflow: "hidden",
            zIndex: 9999,
            minWidth: 100,
          }}
        >
          <button
            onClick={() => onEdit(msg)}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            ✏️ 編集
          </button>
          <button
            onClick={() => onDelete(msg.id)}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              border: "none",
              backgroundColor: "transparent",
              color: "red",
              cursor: "pointer",
            }}
          >
            🗑 削除
          </button>
        </div>
      )}
    </div>
  </div>
)}
                  </div>
  
                  {/* 自分の送信時間 */}
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
  
      {/* 🔹 入力エリア */}
<div style={{ marginTop: 10, padding: "8px 12px", borderTop: "1px solid #ddd", backgroundColor: "#fefefe" }}>
  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>

    {/* メンション付き入力欄 */}
    <div style={{ flex: 1 }}>
      <MentionsInput
        value={text ?? ""}
        onChange={(e: any) => setText(e.target.value ?? "")}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="メッセージを入力（@でメンション）"
        style={{
          control: {
            fontSize: 14,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
            minHeight: 50,
            backgroundColor: "#fff",
          },
          highlighter: { padding: 10, minHeight: 50 },
          input: { padding: 10, minHeight: 50, color: "#000" },
          suggestions: {
            list: {
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              fontSize: 14,
              maxHeight: 150,
              overflowY: "auto",
            },
            item: {
              padding: "5px 10px",
              borderBottom: "1px solid #eee",
              cursor: "pointer",
            },
            itemFocused: {
              backgroundColor: "#cee4fd",
            },
          },
        }}
      >
        <Mention
          trigger="@"
          data={users.filter((u) => u.id && u.display)}
          appendSpaceOnAdd
          displayTransform={(id: string, display?: string) => `@${display ?? id}`}
          markup="@__id__"
          renderSuggestion={(
            entry: MentionData,
            search: string,
            highlightedDisplay: React.ReactNode,
            index: number,
            focused: boolean
          ) => (
            <div
              key={index}
              style={{
                backgroundColor: focused ? "#cee4fd" : "#fff",
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              {highlightedDisplay}
            </div>
          )}
          {...({} as any)}
        />
      </MentionsInput>
    </div>

    {/* 😊 */}
    <button
      onClick={() => setShowPicker(!showPicker)}
      style={{
        fontSize: 20,
        padding: "0 10px",
        height: 44,
        borderRadius: 6,
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        cursor: "pointer",
      }}
    >
      😊
    </button>

    {/* 🔗 ファイル添付（小ボタン削除＆カスタムUI） */}
    <label
      htmlFor="file-input"
      style={{
        height: 44,
        width: 44,
        borderRadius: 6,
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 20,
      }}
    >
      🔗
      <input
        id="file-input"
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setImageFile(file); // 💡 この状態変数を用意
          }
        }}
      />
    </label>

    {/* 🚀 送信ボタン */}
    <button
      onClick={onSend}
      style={{
        height: 44,
        padding: "0 16px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      送信
    </button>
  </div>

  {/* 🎉 絵文字ピッカー */}
  {showPicker && (
    <div style={{ position: "absolute", bottom: 60, left: 20, zIndex: 1000 }}>
      <EmojiPicker onEmojiClick={handleEmojiClick} />
    </div>
  )}
</div>

    </div>
  );
}  