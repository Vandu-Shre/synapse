"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (!roomId) return;
    router.push(`/room/${roomId}`);
  }

  const handleCreate = () => {
    const newRoomId = crypto.randomUUID();
    router.push(`/room/${newRoomId}`);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "12px",
      }}
    >
      <h1>Welcome to Synapse</h1>
      <p>Create or join a room</p>

      <input
        type="text"
        placeholder="Rnter room Id"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #666",
        }}
      />

      <button
        onClick={handleJoin}
        style={{
          padding: "8px 12px",
          cursor: "pointer",
          borderRadius: "6px",
          border: "1px solid #333",
        }}
      >Join room</button>
      <button onClick={handleCreate}
        style={{
          padding: "8px 12px",
          cursor: "pointer",
          borderRadius: "6px",
          border: "1px solid #333",
        }}
      >Create Room</button>
    </div>
  )
}