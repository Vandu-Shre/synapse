"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "@/store/useRoomStore";
import { useDiagramStore } from "@/store/useDiagramStore";
import Canvas from "./Canvas";

type WSMessage =
  | { type: "join-room"; roomId: string; userId: string }
  | { type: "node:add"; roomId: string; userId: string; node: any }
  | { type: "node:move"; roomId: string; userId: string; nodeId: string; x: number; y: number }
  | { type: "edge:add"; roomId: string; userId: string; edge: any }
  | { type: "room:state"; nodes: any[]; edges: any[] };

export default function RoomClient({ roomId }: { roomId: string }) {
  const { setRoomId, userId, socketStatus, setSocketStatus } = useRoomStore();
  const upsertNode = useDiagramStore((s) => s.upsertNode);
  const moveNode = useDiagramStore((s) => s.moveNode);
  const addEdgeRecord = useDiagramStore((s) => s.addEdgeRecord);

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

        if (msg.type === "room:state") {
          console.log("🔄 Syncing room state:", msg.nodes.length, "nodes,", msg.edges.length, "edges");
          console.log(`   Node IDs: ${msg.nodes.map((n: any) => n.id).join(", ") || "none"}`);
          console.log(`   Edge IDs: ${msg.edges.map((e: any) => e.id).join(", ") || "none"}`);
          for (const node of msg.nodes) {
            console.log(`   ↳ Upserting node ${node.id}`);
            upsertNode(node);
          }
          for (const edge of msg.edges) {
            console.log(`   ↳ Adding edge ${edge.id}`);
            addEdgeRecord(edge);
          }
          setHasRoomState(true);
          return;
        }

        if (msg.roomId && msg.roomId !== roomId) return;

        if (msg.type === "node:add") {
          console.log(`   ↳ Upserting node ${msg.node.id}`);
          upsertNode(msg.node);
        }

        if (msg.type === "node:move") {
          moveNode(msg.nodeId, msg.x, msg.y);
        }

        if (msg.type === "edge:add") {
          console.log(`   ↳ Adding edge ${msg.edge.id}`);
          addEdgeRecord(msg.edge);
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
      setSocketStatus(socketStatus === "connected" ? "disconnected" : "error");
      console.log("❌ WebSocket closed");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
      connectingRef.current = false;
    };
  }, [roomId, userId, setSocketStatus, upsertNode, moveNode, addEdgeRecord]);

  return <Canvas wsRef={wsRef} roomId={roomId} userId={userId} wsReady={wsReady} hasRoomState={hasRoomState} />;
}
