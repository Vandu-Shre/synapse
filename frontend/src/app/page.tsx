"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (!roomId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/rooms/${roomId}`);

      if (!res.ok) {
        // console.error("Room not found");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.exists) {
        router.push(`/room/${roomId}`);
      } else {
        // console.error("Room doesn't exist");
        setLoading(false);
      }
    } catch (err) {
      // console.error("Failed to validate room:", err);
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/rooms`, {
        method: "POST",
      });
      const data = await res.json();
      const newRoomId = data.roomId;

      router.push(`/room/${newRoomId}`);
    } catch (err) {
      // console.error("Failed to create room", err);
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && roomId.trim()) {
      handleJoin();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}></div>
      <ThemeToggle />

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>🧠</div>
          <h1>Synapse</h1>
          <p className={styles.subtitle}>
            A real-time canvas for thinking together
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardContent}>
            <h2>Start a shared canvas</h2>

            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Paste a room link or ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={handleKeyPress}
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={handleJoin}
                disabled={!roomId.trim() || loading}
                className={`${styles.button} ${styles.secondary}`}
              >
                {loading ? "Loading..." : "Join room"}
              </button>
              <span className={styles.divider}>or</span>
              <button
                onClick={handleCreate}
                disabled={loading}
                className={`${styles.button} ${styles.primary}`}
              >
                {loading ? "Creating..." : "Create new room"}
              </button>
            </div>

            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🧩</span>
                <span>Build diagrams with nodes, edges, and text blocks</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✍️</span>
                <span>Draw, annotate, and highlight together in real time</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🔌</span>
                <span>Instant sync across browsers, devices, and users</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <p>Ephemeral rooms • No accounts • Designed for real-time collaboration</p>
        </div>
      </div>
    </div>
  );
}