// pages/login.tsx（ログインページ）
// - ユーザーがログイン情報を入力し、/chat ページにリダイレクトするための画面
// - 使用している関数: `login()`（lib/auth.ts からインポート）

import { useState } from 'react';
import { useRouter } from 'next/router';
import { login } from '../lib/auth'; // 🔸 認証API呼び出し関数（POST /login）

export default function LoginPage() {
  // ユーザー名、パスワード、エラーメッセージの状態を管理
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Next.js のルーター（リダイレクト用）
  const router = useRouter();

  // 🔹 フォーム送信時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ページリロードを防止

    try {
      // 🔸 認証APIを呼び出してトークン取得
      const token = await login(username, password);

      // 🔸 トークンをローカルストレージに保存（ログイン状態を保持）
      localStorage.setItem('token', token);

      // 🔸 チャット画面へ遷移
      router.push('/chat');
    } catch (err: any) {
      // 🔸 エラーがあれば表示
      setError(err.message || 'ログインに失敗しました');
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '100px auto',
        padding: 30,
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        backgroundColor: '#fff',
      }}
    >
      {/* 🔹 ログインフォームタイトル */}
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>ログイン</h2>

      {/* 🔹 ログインフォーム */}
      <form onSubmit={handleSubmit}>
        {/* 🔸 ユーザー名入力欄 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
            }}
          />
        </div>

        {/* 🔸 パスワード入力欄 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
            }}
          />
        </div>

        {/* 🔸 送信ボタン */}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: 12,
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ログイン
        </button>

        {/* 🔸 エラーメッセージの表示 */}
        {error && (
          <p style={{ color: 'red', textAlign: 'center', marginTop: 12 }}>{error}</p>
        )}
      </form>
    </div>
  );
}
