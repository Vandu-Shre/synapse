"use client";

import React from "react";
import { useDiagramStore, NodeType } from "@/store/useDiagramStore";
import { useToolStore } from "@/store/useToolStore";
import { panelStyle } from "@/ui/panelStyle";
import { ui } from "@/ui/tokens";

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
  const buildNode = useDiagramStore((s) => s.buildNode);
  const applyAction = useDiagramStore((s) => s.applyAction);
  const lastPointer = useToolStore((s) => s.lastPointer);

  const addAt = (type: NodeType) => {
    const x = lastPointer?.x ?? window.innerWidth / 2;
    const y = lastPointer?.y ?? window.innerHeight / 2;

    // Build node (pure)
    const node = buildNode(type, x - 60, y - 40);

    // Wrap as action
    const action = {
      id: crypto.randomUUID(),
      userId,
      ts: Date.now(),
      type: "ADD_NODE" as const,
      payload: { node },
    };

    // Apply locally
    console.log("📋 Applying ADD_NODE action locally");
    applyAction(action);

    // Broadcast
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      console.log("📤 Broadcasting ADD_NODE action");
      ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
    }
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        width: 190,
        padding: 12,
        zIndex: 50,
        ...panelStyle.panel,
      } as React.CSSProperties}
    >
      <div style={panelStyle.title as React.CSSProperties}>
        ➕ Nodes
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {palette.map((p) => (
          <button
            key={p.type}
            onClick={() => addAt(p.type)}
            style={{
              ...panelStyle.button.base,
              height: 42,
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              const el = e.target as HTMLButtonElement;
              Object.assign(el.style, panelStyle.button.active);
            }}
            onMouseLeave={(e) => {
              const el = e.target as HTMLButtonElement;
              Object.assign(el.style, {
                border: panelStyle.button.base.border,
                background: panelStyle.button.base.background,
              });
            }}
          >
            <span style={{ width: 22, textAlign: "center" }}>
              {p.label.split(" ")[0]}
            </span>
            <span>{p.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: "rgba(15, 23, 42, 0.50)" }}>
        Move mouse, then click.
      </div>
    </div>
  );
}
