"use client";

import { RefObject } from "react";
import { sendUndo, sendRedo, sendAction } from "@/lib/ws/send";
import { useDiagramStore } from "@/store/useDiagramStore";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import styles from "@/app/room/[roomId]/room.module.css";

type CanvasHudProps = {
  wsRef: RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
};

export function CanvasHud({ wsRef, roomId, userId }: CanvasHudProps) {
  const deleteSelected = useDiagramStore((s) => s.deleteSelectedAsAction);
  const apply = useDiagramStore((s) => s.applyAction);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendUndo(wsRef, roomId, userId);
  };

  const handleRedo = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendRedo(wsRef, roomId, userId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const action = deleteSelected(userId);
    if (!action) return;
    apply(action);
    sendAction(wsRef, roomId, action);
  };

  return (
    <>
      <div className={styles.themeToggleWrapper}>
        <ThemeToggle />
      </div>
      <div className={styles.badge}>🧠 Synapse</div>

      <div
        className={styles.hud}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onMouseMove={stopPropagation}
        onClick={stopPropagation}
      >
        <button
          onMouseDown={stopPropagation}
          onClick={handleUndo}
          className={styles.hudButton}
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo"
        >
          <span aria-hidden>↩️</span>
          <span className={styles.label}>Undo</span>
        </button>

        <button
          onMouseDown={stopPropagation}
          onClick={handleRedo}
          className={styles.hudButton}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo"
        >
          <span aria-hidden>↪️</span>
          <span className={styles.label}>Redo</span>
        </button>

        <button
          onMouseDown={stopPropagation}
          onClick={handleDelete}
          className={`${styles.hudButton} ${styles.hudButtonDanger}`}
          title="Delete (Backspace)"
          aria-label="Delete"
        >
          <span aria-hidden>🗑</span>
          <span className={styles.label}>Delete</span>
        </button>
      </div>
    </>
  );
}
