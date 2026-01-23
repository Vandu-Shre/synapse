"use client";

import React from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useToolStore } from "@/store/useToolStore";
import type { NodeType } from "@/types/diagram";
import { sendAction } from "@/lib/ws/send";
import { screenToWorld, getViewTransform } from "@/lib/viewTransform";
import styles from "@/app/room/[roomId]/room.module.css";
import { SAFE_ZONE, SAFE_LEFT, SAFE_TOP, BREAKPOINT, NODE } from "@/ui/constants";

// Layout constants
const PALETTE_WIDTH = 320;
const PALETTE_PADDING = 16;
const SAFE_MARGIN = 16;
const TOOLBAR_HEIGHT = 60;

const palette: Array<{ type: NodeType; label: string }> = [
  { type: "react", label: "⚛️ React" },
  { type: "db", label: "🗄️ DB" },
  { type: "api", label: "🔌 API" },
  { type: "service", label: "🧠 Service" },
  { type: "queue", label: "📨 Queue" },
  { type: "cache", label: "⚡ Cache" },
  { type: "cloud", label: "☁️ Cloud" },
];

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
    const isMobile = vw < BREAKPOINT.mobile;

    const worldPos = screenToWorld(rawScreenX, rawScreenY);
    let x = worldPos.x;
    let y = worldPos.y;

    if (!isMobile) {
      const safeLeftWorld = screenToWorld(SAFE_LEFT, 0).x;
      const safeTopWorld = screenToWorld(0, SAFE_TOP).y;
      x = Math.max(x, safeLeftWorld);
      y = Math.max(y, safeTopWorld);
    }

    const node = buildNode(type, x - NODE.defaultWidth / 2, y - NODE.defaultHeight / 2);

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
        {palette.map((item) => (
          <button
            key={item.type}
            onClick={() => addAt(item.type)}
            className={styles.paletteButton}
          >
            <span className={styles.paletteIcon}>{item.label.split(" ")[0]}</span>
            <span>{item.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>
      <div className={styles.paletteHint}>Move mouse, then click.</div>
    </div>
  );
}
