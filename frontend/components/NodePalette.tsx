"use client";

import React from "react";
import { useDiagramStore, NodeType } from "@/store/useDiagramStore";
import { useToolStore } from "@/store/useToolStore";

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

export function NodePalette({
  wsRef,
  roomId,
  userId,
}: {
  wsRef: React.RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
}) {
  const addNode = useDiagramStore((s) => s.addNode);
  const lastPointer = useToolStore((s) => s.lastPointer);

  const addAt = (type: NodeType) => {
    const x = lastPointer?.x ?? window.innerWidth / 2;
    const y = lastPointer?.y ?? window.innerHeight / 2;

    const node = addNode(type, x - 60, y - 40);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      ws.send(JSON.stringify({ type: "node:add", roomId, userId, node }));
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        width: 170,
        padding: 10,
        borderRadius: 12,
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(0,0,0,0.12)",
        zIndex: 50,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>➕ Nodes</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {palette.map((p) => (
          <button
            key={p.type}
            onClick={() => addAt(p.type)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 14,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
        Tip: move mouse, then click a node.
      </div>
    </div>
  );
}
