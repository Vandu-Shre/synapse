"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useToolStore } from "@/store/useToolStore";
import { NODE_THEME } from "@/ui/nodeTheme";

type DragState =
  | { mode: "idle" }
  | { mode: "ink" }
  | { mode: "node"; nodeId: string; offsetX: number; offsetY: number };

type EdgeDraft =
  | null
  | {
      fromNodeId: string;
      startX: number;
      startY: number;
      toX: number;
      toY: number;
    };

const getPortPosition = (
  node: { x: number; y: number; width: number; height: number },
  port: "top" | "right" | "bottom" | "left"
) => {
  switch (port) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y };
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "left":
      return { x: node.x, y: node.y + node.height / 2 };
  }
};

const getNearestPort = (
  node: { x: number; y: number; width: number; height: number },
  x: number,
  y: number
) => {
  const ports: Array<"top" | "right" | "bottom" | "left"> = [
    "top",
    "right",
    "bottom",
    "left",
  ];

  let best = ports[0];
  let bestDist = Infinity;

  for (const p of ports) {
    const pos = getPortPosition(node, p);
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = dx * dx + dy * dy;

    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return best;
};

const isWithinSnapDistance = (
  node: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
  threshold = 18
) => {
  const ports: Array<"top" | "right" | "bottom" | "left"> = [
    "top",
    "right",
    "bottom",
    "left",
  ];

  for (const p of ports) {
    const pos = getPortPosition(node, p);
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= threshold) return true;
  }

  return false;
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

export default function Canvas({
  wsRef,
  roomId,
  userId,
  wsReady,
  hasRoomState,
}: {
  wsRef: RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
  wsReady: boolean;
  hasRoomState: boolean;
}) {
  const inkRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<HTMLCanvasElement>(null);
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft>(null);

  const nodes = useDiagramStore((s) => s.nodes);
  const addNode = useDiagramStore((s) => s.addNode);
  const moveNode = useDiagramStore((s) => s.moveNode);
  const addEdge = useDiagramStore((s) => s.addEdge);
  const edges = useDiagramStore((s) => s.edges);
  const strokes = useDiagramStore((s) => s.strokes);
  const addStrokeRecord = useDiagramStore((s) => s.addStrokeRecord);
  const deleteStroke = useDiagramStore((s) => s.deleteStroke);

  const tool = useToolStore((s) => s.tool);
  const setLastPointer = useToolStore((s) => s.setLastPointer);

  const [drag, setDrag] = useState<DragState>({ mode: "idle" });
  const [snapPreview, setSnapPreview] = useState<null | {
    nodeId: string;
    port: "top" | "right" | "bottom" | "left";
  }>(null);

  const [activeStroke, setActiveStroke] = useState<null | {
    id: string;
    tool: "pen" | "highlighter";
    points: Array<{ x: number; y: number }>;
  }>(null);

  const lastMoveTimeRef = useRef(0);
  const pendingMoveRef = useRef<null | {
    nodeId: string;
    x: number;
    y: number;
  }>(null);

  // Setup all canvases size
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const c of [inkRef.current, strokesRef.current, nodesRef.current]) {
      if (!c) continue;
      c.width = w;
      c.height = h;
    }
  }, []);

  // Seed nodes once (and broadcast node:add so other clients get same IDs)
  useEffect(() => {
    if (!roomId || !userId) return;
    if (!wsReady || !hasRoomState) return;
    if (nodes.length !== 0) return;

    console.log("🌱 Seeding initial nodes...");
    const n1 = addNode("react", 200, 200);
    const n2 = addNode("db", 500, 320);

    console.log("✉️ Node 1:", n1.id);
    console.log("✉️ Node 2:", n2.id);

    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      console.log("📤 Sending node:add for both nodes...");
      ws.send(JSON.stringify({ type: "node:add", roomId, userId, node: n1 }));
      ws.send(JSON.stringify({ type: "node:add", roomId, userId, node: n2 }));
      console.log("✅ Sent both nodes");
    } else {
      console.warn("⚠️ WebSocket not ready:", {
        ws: !!ws,
        readyState: ws?.readyState,
        roomId,
      });
    }
  }, [wsReady, hasRoomState, roomId, userId, nodes.length, addNode, wsRef]);

  // Helper: hit test nodes (top-most wins)
  const hitTestNode = (x: number, y: number) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const inside =
        x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height;
      if (inside) return n;
    }
    return null;
  };

  // Helper: hit test stroke by proximity
  const hitTestStroke = (x: number, y: number) => {
    const threshold = 10; // px
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      for (const p of s.points) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= threshold * threshold) return s;
      }
    }
    return null;
  };

  // Draw strokes layer
  useEffect(() => {
    const canvas = strokesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (s: {
      points: Array<{ x: number; y: number }>;
      width: number;
      opacity: number;
    }) => {
      if (s.points.length < 2) return;
      ctx.globalAlpha = s.opacity;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    for (const s of strokes) {
      drawStroke(s);
    }

    // Draw active stroke preview
    if (activeStroke) {
      drawStroke({
        points: activeStroke.points,
        width: activeStroke.tool === "pen" ? 3 : 14,
        opacity: activeStroke.tool === "pen" ? 1 : 0.35,
      });
    }
  }, [strokes, activeStroke]);

  // Draw nodes layer whenever nodes change
  useEffect(() => {
    const canvas = nodesRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved edges
    for (const e of edges) {
      const from = nodes.find((n) => n.id === e.fromNodeId);
      const to = nodes.find((n) => n.id === e.toNodeId);
      if (!from || !to) {
        console.warn(`⚠️ Edge ${e.id} missing nodes: from=${!!from} to=${!!to}`);
        continue;
      }

      const p1 = getPortPosition(from, e.fromPort);
      const p2 = getPortPosition(to, e.toPort);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(15,23,42,0.38)";
      ctx.stroke();
    }

    // Draw nodes with elegant glass styling
    for (const n of nodes) {
      const t = NODE_THEME[n.type];

      ctx.save();

      // soft shadow for "floating glass"
      ctx.shadowColor = "rgba(15,23,42,0.10)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;

      roundRectPath(ctx, n.x, n.y, n.width, n.height, 18);

      // white glass base
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();

      // stop shadow for strokes
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.stroke();

      // tint overlay (type color)
      ctx.fillStyle = t.fill;
      ctx.fill();

      // border tint
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = t.stroke;
      ctx.stroke();

      // label (centered)
      const label = n.label.toUpperCase();
      ctx.font = "600 14px ui-sans-serif, system-ui, -apple-system";
      ctx.fillStyle = "rgba(15,23,42,0.82)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, n.x + n.width / 2, n.y + n.height / 2);

      ctx.restore();

      // ✅ Only show snap hint while connecting
      const isConnecting = !!edgeDraft;
      if (isConnecting && snapPreview?.nodeId === n.id) {
        const pos = getPortPosition(n, snapPreview.port);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = t.stroke;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    // Draw edge draft (line from chosen fromPort to cursor)
    if (edgeDraft) {
      const from = nodes.find((n) => n.id === edgeDraft.fromNodeId);
      if (from) {
        const fromPort = getNearestPort(from, edgeDraft.startX, edgeDraft.startY);
        const p1 = getPortPosition(from, fromPort);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(edgeDraft.toX, edgeDraft.toY);
        ctx.strokeStyle = "rgba(109,94,252,0.40)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [nodes, edges, edgeDraft, snapPreview]);

  // Ink helpers
  const inkStart = (x: number, y: number) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const inkMove = (x: number, y: number) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Wrapper handlers
  const onDown = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    setLastPointer({ x, y });

    // Pen/Highlighter: start stroke
    if (tool === "pen" || tool === "highlighter") {
      const id = crypto.randomUUID();
      const width = tool === "pen" ? 3 : 14;
      const opacity = tool === "pen" ? 1 : 0.35;

      setActiveStroke({
        id,
        tool,
        points: [{ x, y }],
      });

      return;
    }

    // Eraser: delete stroke at cursor
    if (tool === "eraser") {
      const hitStroke = hitTestStroke(x, y);
      if (hitStroke) {
        deleteStroke(hitStroke.id);

        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && roomId) {
          ws.send(
            JSON.stringify({
              type: "stroke:delete",
              roomId,
              userId,
              strokeId: hitStroke.id,
            })
          );
        }
      }
      return;
    }

    const hit = hitTestNode(x, y);
    const connectIntent = tool === "connect" || e.shiftKey;

    if (hit && connectIntent) {
      // Start edge draft (connect mode)
      setDrag({ mode: "idle" });
      setEdgeDraft({ fromNodeId: hit.id, startX: x, startY: y, toX: x, toY: y });
      return;
    }

    if (hit && tool === "select") {
      // Start dragging node
      setDrag({
        mode: "node",
        nodeId: hit.id,
        offsetX: x - hit.x,
        offsetY: y - hit.y,
      });
      return;
    }

    // Otherwise, start drawing ink
    if (tool === "select") {
      setDrag({ mode: "ink" });
      inkStart(x, y);
    }
  };

  const onMove = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    setLastPointer({ x, y });

    // Active stroke: add points
    if (activeStroke) {
      setActiveStroke((s) =>
        s ? { ...s, points: [...s.points, { x, y }] } : s
      );
      return;
    }

    if (edgeDraft) {
      const next = { ...edgeDraft, toX: x, toY: y };
      setEdgeDraft(next);

      const hit = hitTestNode(x, y);

      if (hit && isWithinSnapDistance(hit, x, y)) {
        const port = getNearestPort(hit, x, y);
        setSnapPreview({ nodeId: hit.id, port });
      } else {
        setSnapPreview(null);
      }
      return;
    }

    if (drag.mode === "node") {
      const newX = x - drag.offsetX;
      const newY = y - drag.offsetY;

      // local move (always)
      moveNode(drag.nodeId, newX, newY);

      // throttled broadcast (at most every ~30ms)
      const now = Date.now();
      if (now - lastMoveTimeRef.current >= 30) {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && roomId) {
          ws.send(
            JSON.stringify({
              type: "node:move",
              roomId,
              userId,
              nodeId: drag.nodeId,
              x: newX,
              y: newY,
            })
          );
        }
        lastMoveTimeRef.current = now;
        pendingMoveRef.current = null;
      } else {
        // store pending move to send on mouseUp
        pendingMoveRef.current = { nodeId: drag.nodeId, x: newX, y: newY };
      }
      return;
    }

    if (drag.mode === "ink") {
      inkMove(x, y);
    }
  };

  const onUp = () => {
    // Send any pending node:move before committing stroke
    if (drag.mode === "node" && pendingMoveRef.current) {
      const p = pendingMoveRef.current;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && roomId) {
        ws.send(
          JSON.stringify({
            type: "node:move",
            roomId,
            userId,
            nodeId: p.nodeId,
            x: p.x,
            y: p.y,
          })
        );
      }
      pendingMoveRef.current = null;
    }

    // Commit active stroke
    if (activeStroke) {
      const stroke = {
        id: activeStroke.id,
        tool: activeStroke.tool,
        points: activeStroke.points,
        width: activeStroke.tool === "pen" ? 3 : 14,
        opacity: activeStroke.tool === "pen" ? 1 : 0.35,
      };

      addStrokeRecord(stroke);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && roomId) {
        ws.send(
          JSON.stringify({
            type: "stroke:add",
            roomId,
            userId,
            stroke,
          })
        );
      }

      setActiveStroke(null);
      return;
    }

    if (edgeDraft) {
      const hit = hitTestNode(edgeDraft.toX, edgeDraft.toY);

      if (
        !hit ||
        hit.id === edgeDraft.fromNodeId ||
        !isWithinSnapDistance(hit, edgeDraft.toX, edgeDraft.toY)
      ) {
        setEdgeDraft(null);
        setSnapPreview(null);
        setDrag({ mode: "idle" });
        return;
      }

      const fromNode = nodes.find((n) => n.id === edgeDraft.fromNodeId);
      if (!fromNode) {
        setEdgeDraft(null);
        setSnapPreview(null);
        setDrag({ mode: "idle" });
        return;
      }

      // ✅ Correct: choose fromPort near start pointer, toPort near end pointer
      const fromPort = getNearestPort(fromNode, edgeDraft.startX, edgeDraft.startY);
      const toPort = getNearestPort(hit, edgeDraft.toX, edgeDraft.toY);

      // Create local edge
      const createdEdge = addEdge(edgeDraft.fromNodeId, hit.id, fromPort, toPort);

      // Broadcast edge:add with full edge payload (including id)
      const ws = wsRef.current;

      if (ws && ws.readyState === WebSocket.OPEN && roomId) {
        ws.send(
          JSON.stringify({
            type: "edge:add",
            roomId,
            userId,
            edge: createdEdge,
          })
        );
      }

      setEdgeDraft(null);
      setSnapPreview(null);
      setDrag({ mode: "idle" });
      return;
    }

    setDrag({ mode: "idle" });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "transparent",
        boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.04)",
      }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      {/* Background layer with sparkly grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(1000px 600px at 18% 12%, rgba(109, 94, 252, 0.08), transparent 60%),
            radial-gradient(900px 600px at 88% 16%, rgba(255, 119, 200, 0.07), transparent 62%),
            radial-gradient(900px 600px at 62% 92%, rgba(102, 211, 199, 0.07), transparent 62%),
            radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.045) 1px, transparent 0) 0 0 / 28px 28px,
            linear-gradient(#ffffff, #ffffff)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Ink layer */}
      <canvas
        ref={inkRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          display: "block",
        }}
      />

      {/* Strokes layer (synced drawings) */}
      <canvas
        ref={strokesRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
        }}
      />

      {/* Nodes layer */}
      <canvas
        ref={nodesRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
        }}
      />

      {/* Synapse badge */}
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          padding: "10px 12px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: "0 18px 55px rgba(15,23,42,0.12)",
          backdropFilter: "blur(12px)",
          fontWeight: 800,
          color: "#0f172a",
          fontSize: 13,
          zIndex: 40,
        }}
      >
        🧠 Synapse
      </div>
    </div>
  );
}
