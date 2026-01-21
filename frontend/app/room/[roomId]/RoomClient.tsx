"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "@/store/useRoomStore";
import { useDiagramStore } from "@/store/useDiagramStore";
import Canvas from "./Canvas";
import { Toolbar } from "@/components/Toolbar";
import { NodePalette } from "@/components/NodePalette";

type WSMessage =
  | { type: "join-room"; roomId: string; userId: string }
  | { type: "node:add"; roomId: string; userId: string; node: any }
  | { type: "node:move"; roomId: string; userId: string; nodeId: string; x: number; y: number }
  | { type: "edge:add"; roomId: string; userId: string; edge: any }
  | { type: "stroke:add"; roomId: string; userId: string; stroke: any }
  | { type: "stroke:delete"; roomId: string; userId: string; strokeId: string }
  | { type: "room:state"; nodes: any[]; edges: any[]; strokes: any[] };

export default function RoomClient({ roomId }: { roomId: string }) {
  const { setRoomId, userId, socketStatus, setSocketStatus } = useRoomStore();
  const upsertNode = useDiagramStore((s) => s.upsertNode);
  const moveNode = useDiagramStore((s) => s.moveNode);
  const upsertEdgeRecord = useDiagramStore((s) => s.upsertEdgeRecord);
  const upsertStrokeRecord = useDiagramStore((s) => s.upsertStrokeRecord);
  const deleteStroke = useDiagramStore((s) => s.deleteStroke);

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
          const strokes = (msg as any).strokes ?? [];

          console.log(
            "🔄 Syncing room state:",
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

          for (const node of msg.nodes) {
            console.log(`   ↳ Upserting node ${node.id}`);
            upsertNode(node);
          }
          for (const edge of msg.edges) {
            console.log(`   ↳ Upserting edge ${edge.id}`);
            upsertEdgeRecord(edge);
          }
          for (const stroke of strokes) {
            console.log(`   ↳ Upserting stroke ${stroke.id}`);
            upsertStrokeRecord(stroke);
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
          console.log(`   ↳ Upserting edge ${msg.edge.id}`);
          upsertEdgeRecord(msg.edge);
        }

        if (msg.type === "stroke:add") {
          console.log(`   ↳ Upserting stroke ${msg.stroke.id}`);
          upsertStrokeRecord(msg.stroke);
        }

        if (msg.type === "stroke:delete") {
          console.log(`   ↳ Deleting stroke ${msg.strokeId}`);
          deleteStroke(msg.strokeId);
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
  }, [roomId, userId, setSocketStatus, upsertNode, moveNode, upsertEdgeRecord, upsertStrokeRecord, deleteStroke]);

  return (
    <div style={{ position: "relative", background: "var(--canvas)", width: "100vw", height: "100vh" }}>
      <Toolbar />
      <NodePalette wsRef={wsRef} roomId={roomId} userId={userId} />
      <Canvas wsRef={wsRef} roomId={roomId} userId={userId} wsReady={wsReady} hasRoomState={hasRoomState} />
    </div>
  );
}
