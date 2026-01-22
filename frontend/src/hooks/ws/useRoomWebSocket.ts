"use client";

import { useEffect, useRef, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useRoomStore } from "@/store/useRoomStore";
import type { WSMessage, JoinRoomMessage } from "@/types/ws";

type Options = {
  roomId: string;
  url?: string;
};

export function useRoomWebSocket({ roomId, url = "ws://localhost:3001" }: Options) {
  const { userId, setRoomId, setSocketStatus } = useRoomStore();
  const wsRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);

  const [hasRoomState, setHasRoomState] = useState(false);
  const [wsReady, setWsReady] = useState(false);

  useEffect(() => setRoomId(roomId), [roomId, setRoomId]);

  useEffect(() => {
    if (connectingRef.current || wsRef.current) return;

    connectingRef.current = true;
    setSocketStatus("connecting");
    setHasRoomState(false);
    setWsReady(false);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      connectingRef.current = false;
      setSocketStatus("connected");
      setWsReady(true);
      console.log("✅ WebSocket connected, sending join-room");

      const join: JoinRoomMessage = { type: "join-room", roomId, userId };
      ws.send(JSON.stringify(join));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WSMessage;
        console.log("📨 RECEIVED message type:", msg.type, msg);

        if (msg.type === "room:state") {
          console.log(
            "🔄 Syncing room state (hard reset):",
            msg.nodes.length, "nodes,",
            msg.edges.length, "edges,",
            msg.strokes.length, "strokes"
          );
          useDiagramStore.getState().setRoomState(msg.nodes ?? [], msg.edges ?? [], msg.strokes ?? []);
          setHasRoomState(true);
          return;
        }

        if ("roomId" in msg && msg.roomId !== roomId) return;

        if (msg.type === "diagram:action") {
          console.log("🎨 Received diagram:action, applying:", msg.action.type);
          useDiagramStore.getState().applyAction(msg.action);
          return;
        }

        if (
          msg.type === "node:add" ||
          msg.type === "node:move" ||
          msg.type === "edge:add" ||
          msg.type === "stroke:add" ||
          msg.type === "stroke:delete"
        ) {
          console.warn("⚠️ Ignoring legacy WS message:", msg.type);
          return;
        }
      } catch (e) {
        console.error("Bad WS message", evt.data);
      }
    };

    ws.onerror = () => {
      connectingRef.current = false;
      setSocketStatus("error");
      setWsReady(false);
      console.error("❌ WebSocket error");
    };

    ws.onclose = () => {
      connectingRef.current = false;
      setSocketStatus("disconnected");
      setWsReady(false);
      setHasRoomState(false);
      console.log("❌ WebSocket closed");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      wsRef.current = null;
      connectingRef.current = false;
    };
  }, [roomId, url, userId, setSocketStatus]);

  return { wsRef, wsReady, hasRoomState, userId };
}
