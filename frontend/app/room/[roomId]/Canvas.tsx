"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import type { DiagramEdge } from "@/store/useDiagramStore";
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

const hitTestEdge = (
  x: number,
  y: number,
  edges: DiagramEdge[],
  nodes: any[],
  threshold = 10
): DiagramEdge | null => {
  for (let i = edges.length - 1; i >= 0; i--) {
    const e = edges[i];
    const from = nodes.find((n) => n.id === e.fromNodeId);
    const to = nodes.find((n) => n.id === e.toNodeId);
    if (!from || !to) continue;

    const p1 = getPortPosition(from, e.fromPort);
    const p2 = getPortPosition(to, e.toPort);

    // Line-to-point distance calculation
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (len * len)));
    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;

    const distX = x - closestX;
    const distY = y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist <= threshold) return e;
  }
  return null;
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
  const dragStartRef = useRef<{ nodeId: string; fromX: number; fromY: number } | null>(null);

  const nodes = useDiagramStore((s) => s.nodes);
  const buildNode = useDiagramStore((s) => s.buildNode);
  const applyAction = useDiagramStore((s) => s.applyAction);
  const edges = useDiagramStore((s) => s.edges);
  const strokes = useDiagramStore((s) => s.strokes);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useDiagramStore((s) => s.setSelectedNodeId);
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const setSelectedEdgeId = useDiagramStore((s) => s.setSelectedEdgeId);

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
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
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

  // Seed nodes once via diagram:action (only for brand-new room)
  useEffect(() => {
    if (!roomId || !userId) return;
    if (!wsReady || !hasRoomState) return;
    if (nodes.length !== 0) return;

    const seedKey = `synapse:seeded:${roomId}`;
    if (localStorage.getItem(seedKey) === "1") return;

    console.log("🌱 Seeding initial nodes...");
    const n1 = buildNode("react", 200, 200);
    const n2 = buildNode("db", 500, 320);

    console.log("✉️ Node 1:", n1.id);
    console.log("✉️ Node 2:", n2.id);

    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      console.log("📤 Sending ADD_NODE actions for both nodes...");

      for (const node of [n1, n2]) {
        const action = {
          id: crypto.randomUUID(),
          userId,
          ts: Date.now(),
          type: "ADD_NODE" as const,
          payload: { node },
        };
        applyAction(action);
        ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
      }

      localStorage.setItem(seedKey, "1");
      console.log("✅ Sent both nodes");
    } else {
      console.warn("⚠️ WebSocket not ready:", {
        ws: !!ws,
        readyState: ws?.readyState,
        roomId,
      });
    }
  }, [wsReady, hasRoomState, roomId, userId, nodes.length, buildNode, applyAction, wsRef]);

  // Debug: Log selectedNodeId changes
  useEffect(() => {
    console.log("🎯 selectedNodeId changed:", selectedNodeId);
  }, [selectedNodeId]);

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

      const isSelected = e.id === selectedEdgeId;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.strokeStyle = isSelected ? "rgba(109, 94, 252, 0.80)" : "rgba(15,23,42,0.38)";
      ctx.stroke();

      // Draw selection indicator (small circle at midpoint)
      if (isSelected) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(109, 94, 252, 0.80)";
        ctx.fill();
      }
    }

    // Draw nodes with elegant glass styling
    for (const n of nodes) {
      const t = NODE_THEME[n.type];
      const isSelected = n.id === selectedNodeId;

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
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected ? t.stroke : "rgba(255,255,255,0.65)";
      ctx.stroke();

      // tint overlay (type color)
      ctx.fillStyle = t.fill;
      ctx.fill();

      // border tint
      ctx.lineWidth = isSelected ? 2.5 : 1.6;
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
  }, [nodes, edges, edgeDraft, snapPreview, selectedNodeId, selectedEdgeId]);

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
        const action = {
          id: crypto.randomUUID(),
          userId,
          ts: Date.now(),
          type: "DELETE_STROKE" as const,
          payload: { stroke: hitStroke },
        };

        applyAction(action);

        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && roomId) {
          ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
        }
      }
      return;
    }

    // NEW: Check for edge click in select mode (before node check)
    if (tool === "select") {
      const hitEdge = hitTestEdge(x, y, edges, nodes);
      if (hitEdge) {
        console.log("🔗 EDGE SELECTED:", hitEdge.id);
        setSelectedEdgeId(hitEdge.id);
        setSelectedNodeId(null);
        return;
      }
    }

    const hit = hitTestNode(x, y);
    const connectIntent = tool === "connect" || e.shiftKey;

    // 🎯 SELECT TOOL: Check for selection first
    if (hit && tool === "select") {
      console.log("🟦 NODE SELECTED:", hit.id);
      setSelectedNodeId(hit.id);
      setSelectedEdgeId(null);
      
      dragStartRef.current = { nodeId: hit.id, fromX: hit.x, fromY: hit.y };

      setDrag({
        mode: "node",
        nodeId: hit.id,
        offsetX: x - hit.x,
        offsetY: y - hit.y,
      });
      return;
    }

    if (hit && connectIntent) {
      setDrag({ mode: "idle" });
      setEdgeDraft({ fromNodeId: hit.id, startX: x, startY: y, toX: x, toY: y });
      return;
    }

    // Clear selection on canvas click
    if (tool === "select") {
      console.log("🟪 CANVAS CLICKED, clearing selection");
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
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

      // Build MOVE_NODE action and apply locally
      const from = dragStartRef.current;
      if (!from || from.nodeId !== drag.nodeId) return;

      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "MOVE_NODE" as const,
        payload: {
          nodeId: drag.nodeId,
          from: { x: from.fromX, y: from.fromY },
          to: { x: newX, y: newY },
        },
      };

      applyAction(action);

      // throttled broadcast (at most every ~30ms)
      const now = Date.now();
      if (now - lastMoveTimeRef.current >= 30) {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && roomId) {
          ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
        }
        lastMoveTimeRef.current = now;
        pendingMoveRef.current = null;
      } else {
        // store pending move to send on mouseUp
        pendingMoveRef.current = { nodeId: drag.nodeId, fromX: from.fromX, fromY: from.fromY, toX: newX, toY: newY };
      }
      return;
    }

    if (drag.mode === "ink") {
      inkMove(x, y);
    }
  };

  const onUp = () => {
    // Send any pending MOVE_NODE action
    if (drag.mode === "node" && pendingMoveRef.current) {
      const p = pendingMoveRef.current;
      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "MOVE_NODE" as const,
        payload: {
          nodeId: p.nodeId,
          from: { x: p.fromX, y: p.fromY },
          to: { x: p.toX, y: p.toY },
        },
      };

      applyAction(action);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && roomId) {
        ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
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

      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "ADD_STROKE" as const,
        payload: { stroke },
      };

      applyAction(action);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && roomId) {
        ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
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

      const fromPort = getNearestPort(fromNode, edgeDraft.startX, edgeDraft.startY);
      const toPort = getNearestPort(hit, edgeDraft.toX, edgeDraft.toY);

      const edge: DiagramEdge = {
        id: crypto.randomUUID(),
        fromNodeId: edgeDraft.fromNodeId,
        fromPort,
        toNodeId: hit.id,
        toPort,
      };

      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "ADD_EDGE" as const,
        payload: { edge },
      };

      applyAction(action);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && roomId) {
        ws.send(JSON.stringify({ type: "diagram:action", roomId, action }));
      }

      setEdgeDraft(null);
      setSnapPreview(null);
      setDrag({ mode: "idle" });
      return;
    }

    dragStartRef.current = null;
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
