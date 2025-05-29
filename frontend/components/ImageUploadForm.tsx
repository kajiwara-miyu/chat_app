'use client'

import React, { useState, Dispatch, SetStateAction } from 'react';
import { Message, User } from '../types';

type Props = {
    roomId: number;
    me: User;
    setMessages: Dispatch<SetStateAction<Message[]>>;
  };
  
  export default function ImageUploadForm({ roomId, me, setMessages }: Props) {
    const [imageFile, setImageFile] = useState<File | null>(null);
  
    const handleImageUpload = async () => {
      if (!imageFile || !roomId || !me) return;
  
      const token = localStorage.getItem("token");
      if (!token) return;
  
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
        setImageFile(null);
      } catch (err) {
        console.error("❌ アップロード失敗:", err);
      }
    };
  
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleImageUpload}
          disabled={!imageFile}
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "6px 12px",
          }}
        >
          画像送信
        </button>
      </div>
    );
  }
  