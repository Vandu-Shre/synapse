import type { WSMessage } from "@/types/ws";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useEffect, useRef } from "react";
import { useRoomStore } from "@/store/useRoomStore";

export function RoomClient() {
  const wsRef = useRef<WebSocket | null>(null);
  const { roomId, userId } = useRoomStore();

  // Handle incoming messages
  useEffect(() => {
    if (!wsRef.current) return;

    wsRef.current.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      if ("roomId" in msg && msg.roomId !== roomId) return;

      if (msg.type === "diagram:action") {
        useDiagramStore.getState().applyAction(msg.action);
        return;
      }

      // ...existing code for other message types...
    };
  }, [roomId]);

  // Keybind: Delete selected node
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      const makeDelete = useDiagramStore.getState().deleteSelectedNodeAsAction;
      const applyAction = useDiagramStore.getState().applyAction;

      const action = makeDelete(userId);
      if (!action) return;

      e.preventDefault();

      // apply locally immediately (optimistic)
      applyAction(action);

      // broadcast
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId]);

  // ...existing code...
}