/// components/RoomList.tsx
// 🔸 チャットルーム一覧を表示するコンポーネント
// - 現在の1対1チャットルーム一覧を表示し、選択できる
// - 他ユーザーとの新規チャット開始機能もあり

import { Room, User } from "../types";
import { useEffect, useState } from "react";

type Props = {
  rooms: Room[]; // 現在のルーム一覧（親コンポーネントから渡される）
  onSelect: (room: Room) => void; // 🔸 ルームが選択された時に呼ばれる
  onRoomsUpdate: (rooms: Room[]) => void; // 🔸 新規ルーム作成後、最新ルーム一覧を通知
  roomId: number | null;
 
};

export default function RoomList({ rooms, onSelect, onRoomsUpdate, roomId }: Props) {
  const [users, setUsers] = useState<User[]>([]); // 自分以外の全ユーザー一覧
  const [me, setMe] = useState<User | null>(null); // 自分のユーザー情報

  // ================================
  // 🔹 初期化処理：自分のID取得 + ユーザー一覧取得
  // ================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // `/users` エンドポイントから全ユーザーを取得
    fetch("http://localhost:8080/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: any[]) => {
        try {
          // 🔸 JWTトークンから自分のuser_idを取得
          const meId = JSON.parse(atob(token.split(".")[1])).user_id;
          setMe({ id: meId, username: "" });

          // 🔸 自分以外のユーザーだけを抽出
          const filtered = data.filter((u) => u.ID !== meId);
          setUsers(filtered.map((u) => ({ id: u.ID, username: u.username })));
        } catch (err) {
          console.error("トークン解析エラー:", err);
        }
      })
      .catch(console.error);
  }, []);


  // ================================
  // 🔹 表示部分（JSX）
  // ================================
  return (
    <div style={{
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 72px)'
    }}>
      <div style={{ flexShrink: 0 }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>チャットルーム一覧</h3>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rooms.map((room) => (
            <li key={room.room_id} style={{ marginBottom: 10 }}>
              <button
                onClick={() => onSelect(room)} // 🔸 RoomListから渡されたonSelectを使用
                style={{
                  width: '100%',
                  padding: 10,
                  border: room.room_id === roomId ? '2px solid #339af0' : '1px solid #ccc',
                  backgroundColor: room.room_id === roomId ? '#d0ebff' : '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    room.room_id === roomId ? '#d0ebff' : '#fff';
                }}
              >
                <strong>
                  {(room.partner_name || room.room_name || `ルームID: ${room.room_id}`)
                    .replace(/#(\d+)/, (_, n) => `#${String(n).padStart(2, '0')}`)}
                </strong>
                <div style={{ fontSize: 12, color: '#555' }}>
                  {room.last_message || '未送信'}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>    
  );
}
