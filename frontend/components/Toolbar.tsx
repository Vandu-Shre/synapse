"use client";

import { useToolStore, ToolMode } from "@/store/useToolStore";

const tools: Array<{ id: ToolMode; label: string }> = [
  { id: "select", label: "🖱️ Select" },
  { id: "connect", label: "🔗 Connect" },
  { id: "pen", label: "✍️ Pen" },
  { id: "highlighter", label: "🖍️ Highlighter" },
  { id: "eraser", label: "🧽 Eraser" },
];

export function Toolbar() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        padding: 8,
        borderRadius: 10,
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(0,0,0,0.12)",
        zIndex: 50,
      }}
    >
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.12)",
            background: tool === t.id ? "rgba(0,0,0,0.08)" : "white",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
