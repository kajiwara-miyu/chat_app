//❌


import { useEffect, useState } from "react";
import { getRooms } from "../lib/room";
import { fetchMe } from "../lib/auth";
import { fetchUsers } from "../lib/user";
import RoomList from "../components/RoomList";
import { Room, User } from "../types";

export default function RoomAndUserPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    console.log("📦 token in useEffect:", token);

    Promise.all([
      getRooms(token),
      fetchMe(token).then((me) => {
        setMe(me);
        return fetchUsers(token, me.id);
      }),
    ])
      .then(([roomsRes, usersRes]) => {
        setRooms(roomsRes);
        setUsers(usersRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p>読み込み中...</p>;

  return (
    <div style={{ display: "flex", gap: "32px", padding: "20px" }}>
      {/* チャットルーム一覧 */}
      <div style={{ flex: 1 }}>
        <h2>参加中のルーム</h2>
        <RoomList
          rooms={rooms}
          onSelect={(room) => {
            console.log("選択されたルーム:", room);
            setSelectedRoomId(room.room_id); // 選択状態を更新
          }}
          onRoomsUpdate={setRooms}
          selectedRoomId={selectedRoomId} // ← 必須プロパティを渡す
      />

      </div>

      {/* ユーザー一覧（新規チャット用） */}
      <div style={{ flex: 1 }}>
        <h2>ユーザー一覧</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {users.map((user) => (
            <li key={user.id} style={{ marginBottom: 10 }}>
              <button
                onClick={() => console.log("新規チャット開始:", user)}
                style={{
                  width: "100%",
                  padding: 10,
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {user.username} とチャット開始
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
