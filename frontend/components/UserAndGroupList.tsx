// components/UserAndGroupList.tsx
import { User, Room } from "../types";
import { useState } from "react";

type Props = {
  users: User[];
  groups: Room[];
  onSelectUser: (user: User) => void;
  onSelectGroup: (room: Room) => void;
  selectedUserId: number | null;
  selectedGroupRoomId: number | null;
  onCreateGroup: (name: string, memberIds: number[]) => void;
};

//ふりがな順＋記号や英数字を後ろに回すカスタムソート
// ファイル先頭や useMemo の中などに置いてOK
function getSortKey(name: string | null | undefined): string {
  if (!name || name.trim() === "") return "～～～"; // 空文字・nullは最後

  const normalized = name
    .normalize("NFKC") // 全角→半角変換・カタカナ正規化
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英数字→半角
    .toLowerCase(); // 英字の大小無視

  // 英数字や記号で始まるなら、強制的に後ろに
  if (/^[a-z0-9!-/:-@¥[-`{-~]/.test(normalized[0])) {
    return "んんん" + normalized;
  }

  return normalized;
}



export default function UserAndGroupList({
  users,
  groups,
  onSelectUser,
  onSelectGroup,
  selectedUserId,
  selectedGroupRoomId,
  onCreateGroup,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim()) return alert("グループ名を入力してください");
    if (selectedMembers.length === 0) return alert("メンバーを選択してください");
    onCreateGroup(groupName, selectedMembers);
    setShowModal(false);
    setGroupName("");
    setSelectedMembers([]);
  };


  // 🔹 あいうえお順ソート

  const sortedUsers = [...users].sort((a, b) =>
    getSortKey(a.furigana || a.username || '').localeCompare(
      getSortKey(b.furigana || b.username || ''),
      'ja'
    )
  );
  
  const sortedGroups = [...groups].sort((a, b) =>
    getSortKey(a.furigana || a.room_name || '').localeCompare(
      getSortKey(b.furigana || b.room_name || ''),
      'ja'
    )
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      {/* ユーザー一覧 */}
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0 }}>
          <h3 style={{ fontSize: 18, marginBottom: 10 }}>ユーザー一覧</h3>
        </div>
        <div style={{ overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sortedUsers.map((user) => (
              <li key={user.id} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => onSelectUser(user)}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: user.id === selectedUserId ? '2px solid #339af0' : '1px solid #ccc',
                    backgroundColor: user.id === selectedUserId ? '#e6f0ff' : '#fff',
                    borderRadius: 6,
                    cursor: 'pointer',
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
        </div>
      </div>
      
      {/* グループ一覧 */}
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0 }}>
          <h3 style={{ fontSize: 18, marginBottom: 10 }}>グループ一覧</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sortedGroups.map((group) => (
              <li key={group.room_id} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => onSelectGroup(group)}　// 🔸 グループ選択時に親に通知
                  style={{
                    width: '100%',
                    padding: 10,
                    border: group.room_id === selectedGroupRoomId ? '2px solid #339af0' : '1px solid #ccc',
                    backgroundColor: group.room_id === selectedGroupRoomId ? '#e6f0ff' : '#fff',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
                  }}
                >
                  {group.room_name?.trim() || '（無名グループ）'}

                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 🔸 グループ作成ボタン */}
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
      </div>

      {/* モーダル */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          padding: 20,
          border: '1px solid #ccc',
          borderRadius: 8,
          zIndex: 1000,
          width: 300,
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        }}>
          <h4>グループ作成</h4>
          <input
            placeholder="グループ名"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{ width: '100%', marginBottom: 10, padding: 6 }}
          />
      {/* 🔸 メンバー選択チェックボックス */}
          <div
            style={{
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #ddd',
            padding: 6,
            marginBottom: 10,
          }}>
            {users.map((user) => (
              <label key={user.id} style={{ display: 'block', margin: 4 }}>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                />{' '}
                {user.username}
              </label>
            ))}
          </div>
        {/* 🔸 モーダル内ボタン */}
          <button
            onClick={handleCreate}
            style={{
              marginRight: 8,
              padding: '6px 12px',
              backgroundColor: '#2ecc71',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
            }}
          >
            作成
          </button>
          <button
            onClick={() => setShowModal(false)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ccc',
              border: 'none',
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
