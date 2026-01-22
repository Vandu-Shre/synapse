"use client";

import { useEffect } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { sendAction, sendUndo, sendRedo } from "@/lib/ws/send";

type Params = {
  roomId: string;
  userId: string;
  wsRef: React.RefObject<WebSocket | null>;
};

export function useDiagramHotkeys({ roomId, userId, wsRef }: Params) {
  // Delete selected node or edge
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      const makeDelete = useDiagramStore.getState().deleteSelectedAsAction;
      const apply = useDiagramStore.getState().applyAction;

      const action = makeDelete(userId);
      if (!action) return;

      e.preventDefault();
      apply(action);
      sendAction(wsRef, roomId, action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId, wsRef]);

  // Undo / Redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        sendUndo(wsRef, roomId, userId);
        return;
      }

      if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        sendRedo(wsRef, roomId, userId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId, wsRef]);
}
