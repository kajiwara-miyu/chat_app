// pages/signup.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { signup } from '../lib/auth';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(username, password);
      alert('サインアップ成功！ログインしてください。');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'サインアップに失敗しました');
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
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>サインアップ</h2>
      <form onSubmit={handleSubmit}>
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
        <button
          type="submit"
          style={{
            width: '100%',
            padding: 12,
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          登録
        </button>
        {error && (
          <p style={{ color: 'red', textAlign: 'center', marginTop: 12 }}>{error}</p>
        )}
      </form>
    </div>
  );
}
