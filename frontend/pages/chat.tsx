//✅


// pages/chat.tsx
// 🔸 チャットアプリのメイン画面
// - ログインユーザー情報の取得、ユーザーリスト・グループリストの表示
// - ルームの作成/選択、メッセージの取得/送信
// - 使用コンポーネント: UserAndGroupList, ChatWindow

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import RoomList from '../components/RoomList';
import UserAndGroupList from "../components/UserAndGroupList"; // サイドバー（ユーザー・グループ一覧）
import ChatWindow from '../components/ChatWindow'; // メッセージ表示・入力コンポーネント

// 🔹 各種API関数をインポート
import { fetchMe, logout } from '../lib/auth'; // 認証系
import { fetchUsers } from '../lib/user'; // ユーザー一覧取得
import { fetchMessages, sendMessage } from '../lib/message'; // メッセージ取得・送信
import { createRoom, fetchGroupRooms, createGroupRoom, getRooms } from "../lib/room"; // ルーム関連


import { User, Message, Room } from "../types";

export default function ChatPage() {
  const router = useRouter();

  // ======================
  // 🔹 ステート管理
  // ======================
  const [me, setMe] = useState<User | null>(null); // 自分の情報
  const [users, setUsers] = useState<User[]>([]); // 他ユーザー一覧
  const [rooms, setRooms] = useState<Room[]>([]);
  const [groups, setGroups] = useState<Room[]>([]); // グループルーム一覧
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // 選択中の1対1相手
  const [messages, setMessages] = useState<Message[]>([]); // 現在のチャットルームのメッセージ
  const [text, setText] = useState(''); // 入力中のテキスト
  const [roomId, setRoomId] = useState<number | null>(null); // 現在のルームID
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null); // グループ名など
  const [selectedGroupRoomId, setSelectedGroupRoomId] = useState<number | null>(null); // 選択中のグループID
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);


  // ======================
  // 🔹 初期化処理：ログイン確認と自分のユーザー情報取得
  // ======================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login'); // 未ログインならリダイレクト
      return;
    }

    // 自分のユーザー情報取得
    fetchMe(token)
      .then(setMe)
      .catch(() => router.push('/login'));
  }, [router]);

  // ======================
  // 🔹 グループルーム一覧取得
  // ======================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetchGroupRooms(token)
      .then((rooms) => {
        const groupRooms = rooms.filter((room) => room.is_group);
        setGroups(groupRooms);
      })
      .catch(console.error);
  }, []);

  // ======================
  // 🔹 他ユーザー一覧取得（自分を除く）
  // ======================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !me) return;

    fetchUsers(token, me.id)
      .then(setUsers)
      .catch(console.error);
  }, [me]);

  // ======================
  // 🔹 チャットルーム一覧取得
  // ======================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    getRooms(token)
      .then((rooms) => {
        // 🔸 ルームIDで重複排除 ＋ メッセージがあるルームのみ抽出
        const filtered = rooms.filter(
          (room, index, self) =>
            index === self.findIndex((r) => r.room_id === room.room_id) &&
            room.last_message && room.last_message.trim() !== ""
        );
        setRooms(filtered);
      })
      .catch((err) => console.error("ルーム取得失敗", err));
  }, []);
  

  // ======================
  // 🔹 選択中ルームのメッセージ取得
  // ======================
  useEffect(() => {
    setMessages([]);
    
    const token = localStorage.getItem('token');
    if (!token || roomId == null) return;

    fetchMessages(token, roomId)
      .then(setMessages)
      .catch(console.error);
  }, [roomId]);

  // ======================
  // 🔹 1対1チャット開始 or 再開時の処理
  // ======================
  const handleStartChat = async (user: User) => {
    if (!me) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setMessages([]);
      setSelectedUser(user);
      setCurrentRoomName(null);
      setSelectedGroupRoomId(null);

      // ✅ バックエンドでルームの存在チェック + 作成を一括で行う
      const targetRoomId = await createRoom(token, user.id);
      setRoomId(targetRoomId);

      // 🔸 メッセージ取得
      const messages = await fetchMessages(token, targetRoomId);
      setMessages(messages);
    } catch (err) {
      console.error("ルーム作成または取得失敗:", err);
    }
  };

  // ======================
  // 🔹 グループチャットルームを開くとき
  // ======================
  const handleEnterGroup = async (room: Room) => {
    setSelectedUser(null);
    setSelectedGroupRoomId(room.room_id);
    setCurrentRoomName(room.room_name);
    setMessages([]);

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setRoomId(room.room_id);
      const messages = await fetchMessages(token, room.room_id);
      setMessages(messages);
    } catch (err) {
      console.error("グループチャット読み込みエラー:", err);
    }
  };

  // ======================
  // 🔹 新しいグループチャットを作成する
  // ======================
  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    const token = localStorage.getItem("token");
    if (!token || !me) return;

    try {
      const newGroup = await createGroupRoom(token, name, memberIds);
      const updatedGroups = await fetchGroupRooms(token);
      setGroups(updatedGroups);

      setSelectedUser(null);
      setSelectedGroupRoomId(newGroup.room_id);
      setRoomId(newGroup.room_id);
      setCurrentRoomName(newGroup.room_name);

      const messages = await fetchMessages(token, newGroup.room_id);
      setMessages(messages);
    } catch (err) {
      console.error("グループ作成エラー:", err);
    }
  };

  // ======================
  // 🔹 メッセージ送信
  // ======================
  const handleSend = async () => {
    if (!text || !me || !roomId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await sendMessage(token, roomId, me.id, text); // 🔸 APIでメッセージ送信
      setText('');
      const updated = await fetchMessages(token, roomId); // 🔸 メッセージ再取得
      setMessages(updated);
    } catch (err) {
      console.error('送信エラー:', err);
    }
  };

  // ======================
  // 🔹 ログアウト処理
  // ======================
  const handleLogout = () => {
    logout(); // 🔸 トークン削除
    router.push('/login'); // 🔸 ログイン画面へ遷移
  };

  // ======================
  // 🔹 JSX 表示
  // ======================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#f5f5f5',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>チャット</h1>
        <button onClick={handleLogout} style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: '#e74c3c',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          ログアウト
        </button>
      </div>


{/* メイン画面（左：ユーザー＋グループ、中：ルーム一覧、右：チャット画面） */}
<div style={{ display: 'flex', flex: 1, backgroundColor: '#fafafa' }}>
  {/* 🔹 左カラム：ユーザー・グループ一覧 */}
  <div style={{ width: '25%', borderRight: '1px solid #ccc', padding: 16 }}>
    <div style={{ maxHeight: '45vh', overflowY: 'auto', marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, marginBottom: 10 }}>ユーザー一覧</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {users.map((user) => (
          <li key={user.id} style={{ marginBottom: 10 }}>
            <button
              onClick={() => {
                handleStartChat(user);
                setSelectedGroupRoomId(null);
              }}
              style={{
                width: '100%',
                padding: 10,
                border: user.id === selectedUser?.id ? '2px solid #339af0' : '1px solid #ccc',
                backgroundColor: user.id === selectedUser?.id ? '#d0ebff' : '#fff',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {user.username}
            </button>
          </li>
        ))}
      </ul>
    </div>

    <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
      <h3 style={{ fontSize: 18, marginBottom: 10 }}>グループ一覧</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {groups.map((group) => (
          <li key={group.room_id} style={{ marginBottom: 10 }}>
            <button
              onClick={() => handleEnterGroup(group)}
              style={{
                width: '100%',
                padding: 10,
                border: group.room_id === selectedGroupRoomId ? '2px solid #339af0' : '1px solid #ccc',
                backgroundColor: group.room_id === selectedGroupRoomId ? '#d0ebff' : '#fff',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {group.room_name?.trim() || '（無名グループ）'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>

  {/* 🔹 中央カラム：チャットルーム一覧 */}
  <div style={{ width: '25%', borderRight: '1px solid #ccc', padding: 16 }}>
    <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
      <h3 style={{ fontSize: 18, marginBottom: 10 }}>チャットルーム一覧</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {rooms.map((room) => (
          <li key={room.room_id} style={{ marginBottom: 10 }}>
            <button
              onClick={() => {
                setSelectedUser(null);
                setSelectedGroupRoomId(null);
                setCurrentRoomName(room.partner_name || room.room_name || '');
                setRoomId(room.room_id);
                fetchMessages(localStorage.getItem('token')!, room.room_id)
                  .then(setMessages)
                  .catch(console.error);
              }}
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
            >
              <strong>{room.partner_name || room.room_name || `ルームID: ${room.room_id}`}</strong>
              <div style={{ fontSize: 12, color: '#555' }}>
                {room.last_message || '未送信'}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>

  {/* 🔹 右カラム：チャット画面 */}
  <div style={{ flex: 1, padding: 24 }}>
    {(roomId || selectedUser) && me ? (
      <ChatWindow
        messages={messages}
        selectedUser={selectedUser}
        me={me}
        roomName={selectedUser ? undefined : currentRoomName || undefined}
        text={text}
        setText={setText}
        onSend={handleSend}
      />
    ) : (
      <p style={{ fontSize: '16px', color: '#888' }}>
        ユーザーまたはグループを選択してください。
      </p>
    )}
  </div>
</div>

    </div>
  );
}
