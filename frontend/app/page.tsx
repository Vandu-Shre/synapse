"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoin = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`http://localhost:3001/rooms/${roomId}`);

      if (!res.ok) {
        console.error("Room not found");
        return;
      }

      const data = await res.json();
      data.exists ? router.push(`/room/${roomId}`) : console.error("Room doesn't exist");
    } catch (err) {
      console.error("Failed to validate room:", err);
    }
  }

  const handleCreate = async () => {
    try {
      const res = await fetch(`http://localhost:3001/rooms`, {
        method: 'POST'
      });
      const data = await res.json();
      const newRoomId = data.roomId;

      router.push(`/room/${newRoomId}`);
    } catch (err) {
      console.error("Failed to create room", err);
    }
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Synapse</h1>
        <p>Create or join a room</p>

        <input
          type="text"
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="home-input"
        />

        <div className="home-buttons">
          <button onClick={handleJoin} className="home-button">Join room</button>
          <button onClick={handleCreate} className="home-button primary">Create Room</button>
        </div>
      </div>
    </div>
  )
}