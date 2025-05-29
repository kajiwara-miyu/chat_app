import { Room } from "../types";

// =========================
// 🔹 1対1チャットルーム作成API
// =========================
// - 処理: 指定したユーザーとの1対1ルームを作成する
// - エンドポイント: POST /rooms
// - 使用場所:
//   - ユーザープロフィールやユーザー一覧画面（例: components/UserAnd GroupList.tsx）
//   - チャットルームが存在しない場合に新しく作成する場面
// - 使用例: const roomId = await createRoom(token, userId);
export async function createRoom(token: string, partnerId: number): Promise<number> {     //✅
  const res = await fetch("http://localhost:8080/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ partner_id: partnerId }), // 相手のユーザーIDを送信
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "ルーム作成に失敗しました");
  }

  const data = await res.json();
  return data.room_id; // 作成されたルームIDを返す
}

// =========================
// 🔹 1対1チャットルーム一覧取得API
// =========================
// - 処理: 自分が参加している1対1チャットルームの一覧を取得
// - エンドポイント: GET /rooms
// - 使用場所:
//   - ルーム一覧画面（例: pages/chat/index.tsx）
//   - サイドバーやルームセレクタ（例: components/ChatSidebar.tsx）
// - 使用例: const rooms = await getRooms(token);
export async function getRooms(token: string): Promise<Room[]> {
  const res = await fetch("http://localhost:8080/rooms", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("ルーム一覧取得に失敗しました");
  }

  const data = await res.json();
  console.log("📦 getRooms response:", data);

  return Array.isArray(data) ? data : (data?.rooms ?? []);
}

// =========================
// 🔹 グループチャットルーム一覧取得API
// =========================
// - 処理: 自分が参加しているグループチャットルームの一覧を取得
// - エンドポイント: GET /rooms/group
// - 使用場所:
//   - ルーム一覧画面（例: pages/chat.ts）
//   - サイドバー（例: components/ChatWindow.tsx）
// - 使用例: const groupRooms = await fetchGroupRooms(token);
export async function fetchGroupRooms(token: string): Promise<Room[]> {
  const res = await fetch("http://localhost:8080/rooms/group", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("fetchGroupRooms failed:", await res.text());
    throw new Error("グループチャット一覧の取得に失敗しました");
  }

  const json = await res.json();
  return json; // グループチャットルームの配列を返す
}

// =========================
// 🔹 グループチャットルーム作成API
// =========================
// - 処理: 指定された名前とメンバーでグループチャットを作成する
// - エンドポイント: POST /rooms/group
// - 使用場所:
//   - グループ作成画面（例: components/RoomList.tsx）
//   - グループ作成ボタンを押した時の処理
// - 使用例: const newGroup = await createGroupRoom(token, name, memberIds);
export async function createGroupRoom(token: string, name: string, memberIds: number[]): Promise<Room> {
  const res = await fetch("http://localhost:8080/rooms/group", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      room_name: name, // グループ名
      member_ids: memberIds, // メンバーのID一覧
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("createGroupRoom failed:", text);
    throw new Error("グループ作成に失敗しました");
  }

  const data = await res.json();
  console.log("createGroupRoom 成功:", data);
  return data; // 作成されたグループルームオブジェクトを返す
}
