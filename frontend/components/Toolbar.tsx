"use client";

import { useToolStore, ToolMode } from "@/store/useToolStore";
import { panelStyle } from "@/ui/panelStyle";

const tools: Array<{ id: ToolMode; label: string }> = [
  { id: "select", label: "🖱️ Select" },
  { id: "connect", label: "🔗 Connect" },
  { id: "pen", label: "✍️ Pen" },
  { id: "highlighter", label: "🖍️ Highlight" },
  { id: "eraser", label: "🧽 Eraser" },
];

export function Toolbar() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        padding: 8,
        zIndex: 50,
        ...panelStyle.panel,
      } as React.CSSProperties}
    >
      {tools.map((t) => {
        const active = tool === t.id;

        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            style={{
              ...panelStyle.button.base,
              padding: "8px 14px",
              ...(active && panelStyle.button.active),
            } as React.CSSProperties}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
