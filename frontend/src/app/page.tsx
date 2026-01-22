"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const API_BASE_URL = "http://localhost:3001";

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = async () => {
    if (!roomId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${roomId}`);

      if (!res.ok) {
        setError("Room not found");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.exists) {
        router.push(`/room/${roomId}`);
      } else {
        setError("Room doesn't exist");
        setLoading(false);
      }
    } catch (err) {
      setError("Failed to validate room");
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/rooms`, {
        method: "POST",
      });
      const data = await res.json();
      const newRoomId = data.roomId;

      router.push(`/room/${newRoomId}`);
    } catch (err) {
      setError("Failed to create room");
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
              {error && <p className={styles.errorMessage}>{error}</p>}
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
          <p>
            Ephemeral rooms • No accounts • Designed for real-time collaboration
          </p>
        </div>
      </div>
    </div>
  );
}