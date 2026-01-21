"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "@/store/useRoomStore";
import { useDiagramStore } from "@/store/useDiagramStore";
import Canvas from "./Canvas";
import { Toolbar } from "@/components/Toolbar";
import { NodePalette } from "@/components/NodePalette";
import { sendAction, sendUndo, sendRedo } from "@/lib/ws/send";

type WSMessage =
  | { type: "join-room"; roomId: string; userId: string }
  | { type: "diagram:action"; roomId: string; action: any }
  | { type: "diagram:undo"; roomId: string; userId: string }
  | { type: "diagram:redo"; roomId: string; userId: string }
  | { type: "room:state"; nodes: any[]; edges: any[]; strokes: any[] }
  | { type: "node:add"; roomId: string; userId: string; node: any }
  | { type: "node:move"; roomId: string; userId: string; nodeId: string; x: number; y: number }
  | { type: "edge:add"; roomId: string; userId: string; edge: any }
  | { type: "stroke:add"; roomId: string; userId: string; stroke: any }
  | { type: "stroke:delete"; roomId: string; userId: string; strokeId: string };

export default function RoomClient({ roomId }: { roomId: string }) {
  const { setRoomId, userId, socketStatus, setSocketStatus } = useRoomStore();

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

    const ws = new WebSocket("ws://localhost:3001");
    wsRef.current = ws;

    ws.onopen = () => {
      connectingRef.current = false;
      setSocketStatus("connected");
      setWsReady(true);
      console.log("✅ WebSocket connected, sending join-room");
      const join: WSMessage = { type: "join-room", roomId, userId };
      ws.send(JSON.stringify(join));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WSMessage;
        console.log("📨 RECEIVED message type:", msg.type, msg);

        // 1) room:state must HARD RESET local state
        if (msg.type === "room:state") {
          const strokes = (msg as any).strokes ?? [];

          console.log(
            "🔄 Syncing room state (hard reset):",
            msg.nodes.length,
            "nodes,",
            msg.edges.length,
            "edges,",
            strokes.length,
            "strokes"
          );
          console.log(`   Node IDs: ${msg.nodes.map((n: any) => n.id).join(", ") || "none"}`);
          console.log(`   Edge IDs: ${msg.edges.map((e: any) => e.id).join(", ") || "none"}`);
          console.log(`   Stroke IDs: ${strokes.map((s: any) => s.id).join(", ") || "none"}`);

          useDiagramStore.getState().setRoomState(msg.nodes ?? [], msg.edges ?? [], strokes);
          setHasRoomState(true);
          return;
        }

        // 2) ignore messages for other rooms
        if ("roomId" in msg && msg.roomId !== roomId) return;

        // 3) new action pathway (single source of truth)
        if (msg.type === "diagram:action") {
          console.log(`🎨 Received diagram:action, applying:`, msg.action.type);
          useDiagramStore.getState().applyAction(msg.action);
          return;
        }

        // 4) TEMP: ignore legacy mutation messages to prevent ghost state
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
      setWsReady(false);
      setHasRoomState(false);
      setSocketStatus("disconnected");
      console.log("❌ WebSocket closed");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
      connectingRef.current = false;
    };
  }, [roomId, userId, setSocketStatus]);

  // Keybind: Delete selected node or edge
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      const makeDeleteNode = useDiagramStore.getState().deleteSelectedNodeAsAction;
      const makeDeleteEdge = useDiagramStore.getState().deleteSelectedEdgeAsAction;
      const apply = useDiagramStore.getState().applyAction;

      const action = makeDeleteNode(userId) ?? makeDeleteEdge(userId);

      if (!action) return;

      e.preventDefault();
      apply(action);
      sendAction(wsRef, roomId, action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId]);

  // Keybind: Undo / Redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (!mod) return;

      // Undo: Ctrl/Cmd + Z
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        sendUndo(wsRef, roomId, userId);
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y
      if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        e.preventDefault();
        sendRedo(wsRef, roomId, userId);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomId, userId]);

  return (
    <div className="room-container">
      <Toolbar />
      <NodePalette wsRef={wsRef} roomId={roomId} userId={userId} />
      <Canvas wsRef={wsRef} roomId={roomId} userId={userId} wsReady={wsReady} hasRoomState={hasRoomState} />
    </div>
  );
}
