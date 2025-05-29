//✅


// pages/chat.tsx
// 🔸 チャットアプリのメイン画面
// - ログインユーザー情報の取得、ユーザーリスト・グループリストの表示
// - ルームの作成/選択、メッセージの取得/送信
// - 使用コンポーネント: UserAndGroupList, ChatWindow

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

import RoomList from '../components/RoomList';
import UserAndGroupList from "../components/UserAndGroupList"; // サイドバー（ユーザー・グループ一覧）
import ChatWindow from '../components/ChatWindow'; // メッセージ表示・入力コンポーネント

// 🔹 各種API関数をインポート
import { fetchMe, logout } from '../lib/auth'; // 認証系
import { fetchUsers } from '../lib/user'; // ユーザー一覧取得
import { fetchMessages, fetchGroupMessages } from '../lib/message'; // メッセージ取得・送信
import { createRoom, fetchGroupRooms, createGroupRoom, getRooms } from "../lib/room"; // ルーム関連
import { markAllMessagesAsRead } from "../lib/message"; //既読の永続化処理
import { updateMessage, deleteMessage } from "../lib/message";



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
  const [text, setText] = useState<string>(""); // 入力中のテキスト
  const [roomId, setRoomId] = useState<number | null>(null); // 現在のルームID
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null); // グループ名など
  const [selectedGroupRoomId, setSelectedGroupRoomId] = useState<number | null>(null); // 選択中のグループID
  const socketRef = useRef<WebSocket | null>(null); // WebSocket接続のためのステート
  const [imageFile, setImageFile] = useState<File | null>(null);





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
  
    Promise.all([getRooms(token), fetchGroupRooms(token)])
      .then(([dmRooms = [], groupRooms = []]) => {
        // 🔸 DMルーム（is_group: false）とグループルーム（is_group: true）を結合
        const combined = [...dmRooms, ...groupRooms];
  
        // 🔹 メッセージがあるルームのみ抽出 & 重複排除
        const filtered = combined.filter(
          (room, index, self) =>
            index === self.findIndex((r) => r.room_id === room.room_id) &&
            room.last_message && room.last_message.trim() !== ""
        );
  
        setRooms(filtered); // 全体一覧にセット
        setGroups(groupRooms); // グループ用に別途保存
      })
      .catch((err) => console.error("ルーム取得失敗:", err));
  }, []);
  
  // ======================
  // 🔹 WebSocket 接続とメッセージの受信
  // ======================
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("📦 JWT token", token)
    if (!token || roomId == null) {
      console.warn("🛑 WebSocket接続条件が未満足 (token or roomId missing)");
      return;
    }
  
    const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}&room_id=${roomId}`);

    socketRef.current = ws;
  
    ws.onopen = () => {console.log("✅ WebSocket connected");socketRef.current = ws}
    ws.onclose = () => console.warn("❌ WebSocket closed")
    ws.onerror = (e) => console.error("💥 WebSocket error", e)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📥 WS受信:", data);
    
      if (data.type === "message") {
        // メッセージ受信時の重複防止処理
        setMessages((prev) => {
          // data.id が存在しないケースも考慮して明示的に型変換＋nullチェック
          const exists = prev.some((msg) => Number(msg.id) === Number(data.id));
    
          console.log("📩 受信:", data.id, typeof data.id);
          console.log("💡 現在のIDs:", prev.map((m) => m.id));
          console.log("✅ 既存と重複？", exists);
    
          return exists ? prev : [...prev, data];
        });
    
      } else if (data.type === "read") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message_id ? { ...msg, isReadByOthers: true } : msg
          )
        );
    
      } else if (data.type === "update") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message_id ? { ...msg, content: data.new_content } : msg
          )
        );
    
      } else if (data.type === "delete") {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== data.message_id)
        );
      }
    };
    
    return () => {
      ws.close();
    };
    

}, [roomId]); // 🔑 ルーム変更時に再接続

  // ======================
  // 🔹 選択中ルームのメッセージ取得
  // ======================

useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("🚫 トークンが見つかりません");
    return;
  }

  if (!me || roomId == null || !Array.isArray(messages)) {
    console.warn("🚫 既読処理スキップ（me, roomId, messages 未準備）");
    return;
  }

  console.log("📍 既読処理開始: roomId=", roomId, "me.id=", me.id);

  markAllMessagesAsRead(messages, me.id, token); // 🔽 永続化処理本体
}, [roomId, me, messages.length]);

  // ======================
  // 🔹 1対1チャット開始 or 再開時の処理
  // ======================
  const handleSelectUser = async (user: User) => {
    if (!me) return;
    const token = localStorage.getItem("token");
    if (!token) return;
  
    try {
      setMessages([]);
      setSelectedUser(user);
      setCurrentRoomName(null);
      setSelectedGroupRoomId(null);
  
      const targetRoomId = await createRoom(token, user.id);
      setRoomId(targetRoomId);
  
      const fetchedMessages = await fetchMessages(token, targetRoomId);
  
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const filtered = fetchedMessages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...filtered];
      });
  
    } catch (err) {
      console.error("ルーム作成または取得失敗:", err);
    }
  };
  

  // ======================
  // 🔹 グループチャットルームを開くとき
  // ======================
  const handleSelectGroup = async (room: Room) => {
    setSelectedUser(null);
    setSelectedGroupRoomId(room.room_id);
    setCurrentRoomName(room.room_name);
    setMessages([]); // 一旦空に（UI的にはOK）
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    try {
      setRoomId(room.room_id);
  
      const fetchedMessages = await fetchGroupMessages(token, room.room_id);
  
      setMessages((prev) => {
        const prevIds = new Set(prev.map((msg) => msg.id));
        const newOnes = fetchedMessages.filter((msg) => !prevIds.has(msg.id));
        return [...prev, ...newOnes];
      });
  
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
      console.log("📄 fetchMessages:", messages.map((m) => m.id));
      setMessages(messages);
    } catch (err) {
      console.error("グループ作成エラー:", err);
    }
  };

  // ======================
  // 🔹 メッセージ送信
  // ======================
  const handleSend = async () => {
    if ((!text.trim() && !imageFile) || !me || !roomId) return;
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    const ws = socketRef.current;
  
    // ✅ テキストメッセージの送信（WebSocket経由）
    if (text.trim()) {
      const message = {
        room_id: roomId,
        content: text,
        created_at: new Date().toISOString(),
        sender_name: me.username,
        sender_id: me.id,
      };
  
      if (ws instanceof WebSocket && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
  
      try {
        await fetch('http://localhost:8080/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(message),
        });
      } catch (err) {
        console.error("テキスト送信失敗:", err);
      }
  
      setText('');
    }
  
    // ✅ ファイルがある場合はアップロード
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("room_id", roomId.toString());
      formData.append("sender_id", me.id.toString());
  
      try {
        const res = await fetch("http://localhost:8080/messages/image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
  
        const newMessage: Message = await res.json();
        setMessages((prev) => [...prev, newMessage]);
      } catch (err) {
        console.error("画像アップロード失敗:", err);
      }
  
      setImageFile(null); // ✅ ファイルリセット
    }
  };
  
  
  const handleEdit = async (message: Message) => {
    const newContent = prompt("新しい内容を入力してください", message.content);
    if (!newContent || newContent === message.content) return;
  
    try {
      await updateMessage(message.id, newContent);
  
      const token = localStorage.getItem("token");
      if (token && roomId) {
        const updatedMessages = await fetchMessages(token, roomId);
        setMessages(updatedMessages);
      }
    } catch (err) {
      console.error("編集失敗", err);
      alert("編集できませんでした");
    }
  };
  
  
  const handleDelete = async (id: number) => {
    if (!confirm("本当に削除しますか？")) return;
  
    try {
      await deleteMessage(id); // メッセージ削除（サーバーへ）
  
      const token = localStorage.getItem("token");
      if (token && roomId) {
        const updatedMessages = await fetchMessages(token, roomId); // 最新メッセージを取得
        setMessages(updatedMessages); // 画面を更新
      }
    } catch (err) {
      console.error("削除失敗:", err);
      alert("削除に失敗しました");
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
        <div style={{
          width: '22%',
          borderRight: '1px solid #ccc',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          height: 'calc(100vh - 72px)',
          overflow: 'hidden'
        }}>
          <UserAndGroupList
            users={users}
            groups={groups}
            onSelectUser={handleSelectUser}
            onSelectGroup={handleSelectGroup}
            selectedUserId={selectedUser?.id ?? null}
            selectedGroupRoomId={selectedGroupRoomId}
            onCreateGroup={handleCreateGroup}
          />
      </div>
  
        {/* 🔹 中央カラム：チャットルーム一覧 */}
<div style={{
  width: '28%',
  borderRight: '1px solid #ccc',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 72px)'
}}>
  <RoomList
    rooms={rooms}
    roomId={roomId}
    onSelect={(room) => {
      console.log("✅ ルーム選択:", room.room_id);
      setSelectedUser(null);
      setSelectedGroupRoomId(null);
      setCurrentRoomName(room.partner_name || room.room_name || '');
      setRoomId(room.room_id);

      const token = localStorage.getItem('token');
    if (token) {
      fetchMessages(token, room.room_id)
        .then(setMessages)
        .catch(console.error);
    } else {
      console.warn("⚠️ トークンが取得できませんでした");
    }
  }}
    onRoomsUpdate={(updatedRooms) => setRooms(updatedRooms)}
  />
</div>

  
        {/* 🔹 右カラム：チャット画面 */}
        <div style={{
          flex: 1,
          padding: 24,
          overflowY: 'auto',
          height: 'calc(100vh - 72px)'
        }}>
          {(roomId || selectedUser) && me ? (
            <ChatWindow
              messages={messages}
              selectedUser={selectedUser}
              roomId={roomId}
              me={me}
              roomName={selectedUser ? undefined : currentRoomName || undefined}
              text={text}
              setText={setText}
              onSend={handleSend}
              setMessages={setMessages}
              onEdit={handleEdit} onDelete={handleDelete}
            />
          ) : (
            <p style={{
              fontSize: '20px',
              color: '#888',
              textAlign: 'center',
              marginTop: '20%',
            }}>
              💬 ユーザーまたはグループを選択してください
            </p>
            
          )}
        </div>
      </div>
    </div>
  );
}  