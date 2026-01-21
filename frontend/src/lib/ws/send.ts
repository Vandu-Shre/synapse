import type { RefObject } from "react";

export function sendIfOpen(
  wsRef: RefObject<WebSocket | null>,
  payload: unknown
): boolean {
  const ws = wsRef.current;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

export function sendAction(
  wsRef: RefObject<WebSocket | null>,
  roomId: string,
  action: unknown
): boolean {
  return sendIfOpen(wsRef, { type: "diagram:action", roomId, action });
}

export function sendUndo(
  wsRef: RefObject<WebSocket | null>,
  roomId: string,
  userId: string
): boolean {
  return sendIfOpen(wsRef, { type: "diagram:undo", roomId, userId });
}

export function sendRedo(
  wsRef: RefObject<WebSocket | null>,
  roomId: string,
  userId: string
): boolean {
  return sendIfOpen(wsRef, { type: "diagram:redo", roomId, userId });
}
