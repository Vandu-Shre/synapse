"use client";

import { useEffect, useState } from "react";
import styles from "@/app/room/[roomId]/room.module.css";
import { NodePalette } from "@/components/NodePalette";

type Props = {
  wsRef: React.RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
};

export function NodePaletteShell({ wsRef, roomId, userId }: Props) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className={styles.nodesToggle}
        onClick={toggle}
        aria-label="Toggle nodes menu"
        title="Nodes"
      >
        ☰ <span className={styles.label}>Nodes</span>
      </button>

      {/* Desktop palette (always visible) */}
      <div className={styles.nodesDesktop}>
        <NodePalette wsRef={wsRef} roomId={roomId} userId={userId} />
      </div>

      {/* Mobile overlay */}
      <div
        className={`${styles.nodesOverlay} ${open ? styles.nodesOverlayOpen : ""}`}
        onClick={close}
      />

      {/* Mobile drawer */}
      <div
        className={`${styles.nodesDrawer} ${open ? styles.nodesDrawerOpen : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <NodePalette wsRef={wsRef} roomId={roomId} userId={userId} onPick={close} />
      </div>
    </>
  );
}
