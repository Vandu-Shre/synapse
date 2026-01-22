"use client";

import React from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useToolStore } from "@/store/useToolStore";
import type { NodeType } from "@/types/diagram";
import { sendAction } from "@/lib/ws/send";
import { screenToWorld, getViewTransform } from "@/lib/viewTransform";
import styles from "@/app/room/[roomId]/room.module.css";

const palette: Array<{ type: NodeType; label: string }> = [
  { type: "react", label: "⚛️ React" },
  { type: "db", label: "🗄️ DB" },
  { type: "api", label: "🔌 API" },
  { type: "service", label: "🧠 Service" },
  { type: "queue", label: "📨 Queue" },
  { type: "cache", label: "⚡ Cache" },
  { type: "cloud", label: "☁️ Cloud" },
  { type: "text", label: "📝 Text" },
];

const PALETTE_W = 320; // was 190; matches desktop card width
const PALETTE_PAD = 16;
const SAFE_LEFT = PALETTE_PAD + PALETTE_W + 16;
const SAFE_TOP = 16 + 60;

export function NodePalette({
  wsRef,
  roomId,
  userId,
  onPick,
}: {
  wsRef: React.RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
  onPick?: () => void;
}) {
  const buildNode = useDiagramStore((s) => s.buildNode);
  const applyAction = useDiagramStore((s) => s.applyAction);
  const lastPointer = useToolStore((s) => s.lastPointer);

  const addAt = (type: NodeType) => {
    const rawScreenX = lastPointer?.x ?? window.innerWidth / 2;
    const rawScreenY = lastPointer?.y ?? window.innerHeight / 2;

    const { vw } = getViewTransform();
    const isMobile = vw < 800;

    const p = screenToWorld(rawScreenX, rawScreenY);
    let x = p.x;
    let y = p.y;

    if (!isMobile) {
      const safeLeftWorld = screenToWorld(SAFE_LEFT, 0).x;
      const safeTopWorld = screenToWorld(0, SAFE_TOP).y;
      x = Math.max(x, safeLeftWorld);
      y = Math.max(y, safeTopWorld);
    }

    const node = buildNode(type, x - 60, y - 40);

    const action = {
      id: crypto.randomUUID(),
      userId,
      ts: Date.now(),
      type: "ADD_NODE" as const,
      payload: { node },
    };

    applyAction(action);
    sendAction(wsRef, roomId, action);
    onPick?.(); // close drawer on mobile
  };

  return (
    <div
      className={styles.nodePalette}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className={styles.paletteTitle}>➕ Nodes</div>
      <div className={styles.paletteList}>
        {palette.map((p) => (
          <button
            key={p.type}
            onClick={() => addAt(p.type)}
            className={styles.paletteButton}
          >
            <span className={styles.paletteIcon}>{p.label.split(" ")[0]}</span>
            <span>{p.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>
      <div className={styles.paletteHint}>Move mouse, then click.</div>
    </div>
  );
}
