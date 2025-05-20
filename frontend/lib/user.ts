// ユーザー一覧の取得API処理（自分以外）
// 主な使用場所: ユーザー選択画面（1対1 or グループチャット作成時）

import { User } from "../types";

// =========================
// 🔹 全ユーザー一覧の取得（自分を除外）
// =========================
// - 処理: 全ユーザーを取得し、自分（ログイン中のユーザー）を除外して返す
// - エンドポイント: GET /users
// - 使用場所:
//   - 1対1チャット相手の選択（例: UserList.tsx）
//   - グループチャット作成のメンバー選択画面（例: CreateGroupModal.tsx）
//   - 自分以外のアクティブユーザーを表示したいとき
// - 使用例: const users = await fetchUsers(token, myId);
export async function fetchUsers(token: string, myId: number): Promise<User[]> {
  const res = await fetch("http://localhost:8080/users", {
    headers: {
      Authorization: `Bearer ${token}`, // 認証トークンを送信
    },
  });

  if (!res.ok) throw new Error("ユーザー一覧の取得に失敗しました"); // 通信エラー処理

  const data = await res.json(); // 全ユーザー情報を取得

  // 自分自身（ログインユーザー）を除外し、必要な形式に整形して返す
  return data
    .filter((user: any) => Number(user.ID) !== Number(myId)) // 自分を除外
    .map((user: any) => ({
      id: user.ID,
      username: user.username
    }));
}
