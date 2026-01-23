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
  
  const appliedActionsRef = useRef(new Set<string>());
  const currentRoomIdRef = useRef<string | null>(null);

  const [hasRoomState, setHasRoomState] = useState(false);
  const [wsReady, setWsReady] = useState(false);

  // ✅ Handle room ID change: clear history only when joining NEW room
  useEffect(() => {
    if (roomId === currentRoomIdRef.current) return;

    console.log("🔄 Room ID changed:", currentRoomIdRef.current, "→", roomId);
    currentRoomIdRef.current = roomId;
    
    // ✅ Clear history when joining a new room
    useDiagramStore.getState().clearHistory();
    appliedActionsRef.current.clear();
    
    setRoomId(roomId);
  }, [roomId, setRoomId]);

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

      console.log("🔌 WebSocket connected, joining room:", roomId);
      const join: JoinRoomMessage = { type: "join-room", roomId, userId };
      ws.send(JSON.stringify(join));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WSMessage;

        if (msg.type === "room:state") {
          console.log("📦 Received room:state", {
            nodes: msg.nodes?.length,
            edges: msg.edges?.length,
            strokes: msg.strokes?.length,
            texts: msg.texts?.length,
          });
          
          // ✅ Apply snapshot WITHOUT clearing history
          useDiagramStore.getState().setRoomState(
            msg.nodes ?? [],
            msg.edges ?? [],
            msg.strokes ?? [],
            msg.texts ?? []
          );
          setHasRoomState(true);
          return;
        }

        if ("roomId" in msg && msg.roomId !== roomId) {
          console.warn("⚠️ Message for different room:", msg.roomId, "expected:", roomId);
          return;
        }

        if (msg.type === "diagram:action") {
          const action = msg.action;
          
          console.log("📨 Received diagram:action:", {
            type: action.type,
            id: action.id,
            userId: action.userId,
            isOwnAction: action.userId === userId,
            alreadyApplied: appliedActionsRef.current.has(action.id),
          });
          
          // ✅ Skip if we already applied this action locally
          if (appliedActionsRef.current.has(action.id)) {
            console.log("  ↳ Skipping (already applied locally)");
            appliedActionsRef.current.delete(action.id);
            return;
          }
          
          // ✅ Skip if this is our own action (echoed back)
          if (action.userId === userId) {
            console.log("  ↳ Skipping (own action echo)");
            return;
          }
          
          console.log("  ✅ Applying remote action");
          // ✅ Apply remote actions but DON'T add to undo stack
          useDiagramStore.getState().applyAction(action, true);
          return;
        }

        // Ignore legacy messages
        if (
          msg.type === "node:add" ||
          msg.type === "node:move" ||
          msg.type === "edge:add" ||
          msg.type === "stroke:add" ||
          msg.type === "stroke:delete"
        ) {
          return;
        }
      } catch (e) {
        console.error("❌ Bad WS message", evt.data, e);
      }
    };

    ws.onerror = () => {
      connectingRef.current = false;
      setSocketStatus("error");
      setWsReady(false);
    };

    ws.onclose = () => {
      connectingRef.current = false;
      setSocketStatus("disconnected");
      setWsReady(false);
      setHasRoomState(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      wsRef.current = null;
      connectingRef.current = false;
    };
  }, [roomId, url, userId, setSocketStatus]);

  const trackLocalAction = (actionId: string) => {
    console.log("🏷️ Tracking local action:", actionId);
    appliedActionsRef.current.add(actionId);
  };

  return { wsRef, wsReady, hasRoomState, userId, trackLocalAction };
}
