import { User, Room } from "../types";
import { useState } from "react";

type Props = {
  users: User[]; // 自分以外のユーザー一覧
  groups: Room[]; // グループチャットルーム一覧
  onSelectUser: (user: User) => void; // ユーザーを選択したときに親から渡される処理
  onSelectGroup: (room: Room) => void; // グループを選択したときの処理
  selectedUserId: number | null; // 現在選択中のユーザーID
  selectedGroupRoomId: number | null; // 現在選択中のグループルームID
  onCreateGroup: (name: string, memberIds: number[]) => void; // グループ作成ボタン押下時の処理
};

export default function UserAndGroupList({
  users,
  groups = [],
  onSelectUser,
  onSelectGroup,
  selectedUserId,
  selectedGroupRoomId,
  onCreateGroup,
}: Props) {
  // ===============================
  // 🔹 グループ作成モーダル用ステート
  // ===============================
  const [showModal, setShowModal] = useState(false); // モーダルの表示・非表示
  const [groupName, setGroupName] = useState("");    // 入力中のグループ名
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]); // 選択中のメンバーID

  // 🔸 チェックボックスのON/OFFトグル
  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId) // すでに選ばれていれば除外
        : [...prev, userId] // 新たに追加
    );
  };

  // 🔸 モーダル内「作成」ボタン押下時の処理
  const handleCreate = () => {
    if (!groupName.trim()) return alert("グループ名を入力してください");
    if (selectedMembers.length === 0)
      return alert("メンバーを1人以上選択してください");

    // 🔹 親コンポーネントのグループ作成処理を呼ぶ
    onCreateGroup(groupName, selectedMembers);

    // モーダルの初期化と閉じる
    setShowModal(false);
    setGroupName("");
    setSelectedMembers([]);
  };

  return (
    <div style={{ padding: 10 }}>
      {/* ============================== */}
      {/* 🔸 ユーザー一覧表示部分 */}
      {/* ============================== */}
      <h3 style={{ fontSize: 18, marginBottom: 10 }}>ユーザー一覧</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {users.map((user) => (
          <li key={user.id} style={{ marginBottom: 10 }}>
            <button
              onClick={() => onSelectUser(user)} // 🔸 ユーザー選択時、親に通知
              style={{
                width: "100%",
                padding: 10,
                backgroundColor: user.id === selectedUserId ? "#d0ebff" : "#fff",
                border: user.id === selectedUserId ? "2px solid #339af0" : "1px solid #ccc",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
              }}
            >
              {user.username}
            </button>
          </li>
        ))}
      </ul>

      <hr style={{ margin: "20px 0" }} />

      {/* ============================== */}
      {/* 🔸 グループ一覧表示部分 */}
      {/* ============================== */}
      <h3 style={{ fontSize: 18, marginBottom: 10 }}>グループ一覧</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {(groups ?? []).map((room) => (
          <li key={room.room_id} style={{ marginBottom: 10 }}>
            <button
              onClick={() => onSelectGroup(room)} // 🔸 グループ選択時に親に通知
              style={{
                width: "100%",
                padding: 10,
                backgroundColor: room.room_id === selectedGroupRoomId ? "#d0ebff" : "#fff",
                border: room.room_id === selectedGroupRoomId ? "2px solid #339af0" : "1px solid #ccc",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
              }}
            >
              {room.room_name?.trim() ? room.room_name : "（無名グループ）"}
            </button>
          </li>
        ))}
      </ul>

      {/* ============================== */}
      {/* 🔸 グループ作成ボタン */}
      {/* ============================== */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "10px 12px",
          fontSize: 14,
          backgroundColor: "#339af0",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ＋ グループ作成
      </button>

      {/* ============================== */}
      {/* 🔸 グループ作成モーダル */}
      {/* ============================== */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#fff",
            padding: 20,
            border: "1px solid #ccc",
            borderRadius: 8,
            zIndex: 1000,
            width: 300,
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          }}
        >
          <h4>グループ作成</h4>

          {/* 🔸 グループ名入力 */}
          <input
            placeholder="グループ名"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 6 }}
          />

          {/* 🔸 メンバー選択チェックボックス */}
          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #ddd",
              padding: 6,
              marginBottom: 10,
            }}
          >
            {users.map((user) => (
              <label key={user.id} style={{ display: "block", margin: 4 }}>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                />{" "}
                {user.username}
              </label>
            ))}
          </div>

          {/* 🔸 モーダル内ボタン */}
          <button
            onClick={handleCreate}
            style={{
              marginRight: 8,
              padding: "6px 12px",
              backgroundColor: "#2ecc71",
              color: "#fff",
              border: "none",
              borderRadius: 5,
            }}
          >
            作成
          </button>
          <button
            onClick={() => setShowModal(false)}
            style={{
              padding: "6px 12px",
              backgroundColor: "#ccc",
              border: "none",
              borderRadius: 5,
            }}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
