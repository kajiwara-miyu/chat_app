// API通信系ユーティリティファイル（例:src/lib/auth.ts）
// ログイン・サインアップ・ユーザー情報取得・ログアウトの処理をまとめたファイル

// ユーザーの新規登録（サインアップ）処理
// 使用される場所: Signupページ（例: pages/signup.tsx）
// 使用例: signup(username, password)
export async function signup(username: string, password: string): Promise<void> {
  const res = await fetch("http://localhost:8080/signup", {
    method: "POST", // POSTメソッドでサインアップAPIを呼び出す
    headers: { "Content-Type": "application/json" }, // リクエストヘッダーにJSON形式を指定
    body: JSON.stringify({ username, password }) // ユーザー名とパスワードをJSONとして送信
  });

  if (!res.ok) {
    const data = await res.json(); // レスポンスボディをJSONとしてパース
    throw new Error(data.error || "サインアップに失敗しました"); // エラー内容があれば表示
  }
}

// ユーザーログイン処理（成功時はトークンを返す）
// 使用される場所: Loginページ（例: pages/login.tsx）
// 使用例: const token = await login(username, password)
export async function login(username: string, password: string): Promise<string> {
  const res = await fetch("http://localhost:8080/login", {
    method: "POST", // POSTメソッドでログインAPIを呼び出す
    headers: { "Content-Type": "application/json" }, // JSON形式のデータを送信
    body: JSON.stringify({ username, password }) // ログイン情報をJSONで送信
  });

  const data = await res.json(); // レスポンスをJSONとして取得

  // ステータスがOKでない、またはトークンが含まれていない場合はエラーをスロー
  if (!res.ok || !data.token) {
    throw new Error(data.error || "ログインに失敗しました");
  }

  return data.token; // トークンを返却（ログイン成功）
}

// 現在ログイン中のユーザー情報を取得する関数
// 使用される場所: 
// - App全体の初期化処理（例: pages/_app.tsx や context/AuthContext.tsx）
// - プロフィール表示画面（例: pages/profile.tsx）
// 使用例: const user = await fetchMe(token)
export async function fetchMe(token: string) {
  const res = await fetch("http://localhost:8080/me", {
    headers: { Authorization: `Bearer ${token}` }, // 認証ヘッダーにBearerトークンを設定
  });

  if (!res.ok) throw new Error("認証エラー"); // 認証に失敗した場合はエラーをスロー
  return res.json(); // ユーザー情報をJSON形式で返却
}

// ログアウト処理：ローカルストレージからトークンを削除
// 使用される場所: 
// - ナビゲーションバー（例: components/Navbar.tsx）
// - 設定画面やユーザーメニュー（例: pages/settings.tsx）
// 使用例: logout()
export function logout() {
  localStorage.removeItem("token"); // 保存されているトークンを削除
}
