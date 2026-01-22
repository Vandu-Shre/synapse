"use client";

import { useToolStore, ToolMode } from "@/store/useToolStore";
import styles from "@/app/room/[roomId]/room.module.css";

const tools: Array<{ id: ToolMode; label: string }> = [
  { id: "select", label: "🖱️ Select" },
  { id: "connect", label: "🔗 Connect" },
  { id: "pen", label: "✍️ Pen" },
  { id: "highlighter", label: "🖍️ Highlight" },
  { id: "eraser", label: "🧽 Eraser" },
];

function splitLabel(label: string) {
  const space = label.indexOf(" ");
  if (space === -1) return { icon: label, text: "" };
  return { icon: label.slice(0, space), text: label.slice(space + 1) };
}

export function Toolbar() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);

  return (
    <div
      className={styles.toolbar}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {tools.map((t) => {
        const active = tool === t.id;
        const { icon, text } = splitLabel(t.label);

        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`${styles.toolbarButton} ${active ? styles.toolbarButtonActive : ""}`}
            aria-label={text || t.id}
            title={text || t.id}
          >
            <span aria-hidden>{icon}</span>
            <span className={styles.label}>{text}</span>
          </button>
        );
      })}
    </div>
  );
}
