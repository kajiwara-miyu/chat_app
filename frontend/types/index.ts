// アプリ全体で使う「型定義」をまとめたファイル
// APIレスポンスの整形や、状態管理（useState等）に使われる共通の構造を定義する

// =========================
// 🔹 ユーザー情報の型
// =========================
// - 各ユーザーを表すオブジェクトの構造
// - 使用箇所: ユーザー一覧表示、チャットメンバー選択、メッセージ送信者表示など
export type User = {
  id: number;           // ユーザーID
  username: string;     // ユーザー名（表示名）
  furigana?: string;
};

// =========================
// 🔹 メッセージ情報の型
// =========================
// - 各チャットメッセージを表す構造
// - 使用箇所: メッセージ一覧、送信履歴の表示、チャットルームの最新メッセージ表示など
export type Message = {
  id: number;             // メッセージID（一意）
  room_id: number;        // 所属チャットルームID
  sender_id: number;      // 送信者のユーザーID
  content: string;        // メッセージ本文
  created_at: string;     // 作成日時（ISO文字列）
  sender_name: string;   // 任意: フロントで使う表示用送信者名（サーバーが返す場合あり）
  isRead?: boolean;
  isReadByOthers: boolean; 
  attachments?: {fileName: string}[];
};

export type Attachment = {
  fileName: string;
  createdAt: string;
};

// =========================
// 🔹 チャットルーム情報の型
// =========================
// - チャットルーム（1対1またはグループ）の状態を管理するための構造
// - 使用箇所: ルーム一覧表示、チャット画面、グループ作成フォームなど
export type Room = {
  room_id: number;         // ルームID（一意）
  partner_id: number;      // 1対1チャットの場合の相手のユーザーID（グループでは使用しない）
  partner_name: string;    // 相手の表示名（1対1用）
  room_name: string | null;// グループ名（1対1の場合はnull）
  is_group: boolean;       // グループチャットかどうかのフラグ
  last_message: string;    // ルーム内の最新メッセージ内容（ルーム一覧表示用）
  member_ids: number[];    // ルームに所属しているユーザーIDの配列（グループ/1対1共通）
  furigana?: string;
};
