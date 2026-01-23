import { useState, useRef, RefObject, useCallback } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useToolStore } from "@/store/useToolStore";
import { screenToWorld } from "@/lib/viewTransform";
import { hitTestNode, hitTestStroke, hitTestEdge, hitTestText } from "@/lib/diagram/hitTest";
import { getNearestPort, isWithinSnapDistance } from "@/lib/diagram/ports";
import { sendAction } from "@/lib/ws/send";
import type { DiagramEdge } from "@/types/diagram";
import type { EdgeDraft, SnapPreview, ActiveStroke } from "@/lib/diagram/render";
import { THROTTLE, STROKE } from "@/ui/constants";

type DragState =
  | { mode: "idle" }
  | { mode: "ink" }
  | { mode: "node"; nodeId: string; offsetX: number; offsetY: number }
  | { mode: "text"; textId: string; offsetX: number; offsetY: number };

type InkHandlers = {
  inkStart: (x: number, y: number) => void;
  inkMove: (x: number, y: number) => void;
};

/**
 * Hook for managing canvas interaction logic (drag, draw, connect)
 */
export function useCanvasInteractions(
  wsRef: RefObject<WebSocket | null>,
  roomId: string,
  userId: string,
  inkHandlers: InkHandlers
) {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const strokes = useDiagramStore((s) => s.strokes);
  const texts = useDiagramStore((s) => s.texts);
  const applyAction = useDiagramStore((s) => s.applyAction);
  const setSelectedNodeId = useDiagramStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useDiagramStore((s) => s.setSelectedEdgeId);
  const setSelectedTextId = useDiagramStore((s) => s.setSelectedTextId);
  const setEditingTextId = useDiagramStore((s) => s.setEditingTextId);
  const buildText = useDiagramStore((s) => s.buildText);

  const tool = useToolStore((s) => s.tool);
  const setLastPointer = useToolStore((s) => s.setLastPointer);

  const [drag, setDrag] = useState<DragState>({ mode: "idle" });
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft>(null);
  const [snapPreview, setSnapPreview] = useState<SnapPreview>(null);
  const [activeStroke, setActiveStroke] = useState<ActiveStroke>(null);

  const dragStartRef = useRef<{ nodeId: string; fromX: number; fromY: number } | null>(null);
  const textDragStartRef = useRef<{ textId: string; fromX: number; fromY: number } | null>(null);
  const lastMoveTimeRef = useRef(0);
  const pendingMoveRef = useRef<null | {
    nodeId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }>(null);
  const pendingTextMoveRef = useRef<null | {
    textId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }>(null);

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      const currentEditingId = useDiagramStore.getState().editingTextId;
      if (currentEditingId) {
        return;
      }

      const sx = e.clientX;
      const sy = e.clientY;

      setLastPointer({ x: sx, y: sy });
      const p = screenToWorld(sx, sy);
      const { x, y } = p;

      // Text tool: create new text box and enter edit mode
      if (tool === "text") {
        const text = buildText(x - 110, y - 23);
        const action = {
          id: crypto.randomUUID(),
          userId,
          ts: Date.now(),
          type: "ADD_TEXT" as const,
          payload: { text },
        };
        
        console.log("🎨 Text tool: creating ADD_TEXT action", action.id);
        
        // ✅ Apply locally first
        applyAction(action);
        
        // ✅ Broadcast to others
        sendAction(wsRef, roomId, action);
        
        // ✅ Set selection and editing intent
        setSelectedTextId(text.id);
        setEditingTextId(text.id);
        
        return;
      }

      // Pen/Highlighter: start stroke
      if (tool === "pen" || tool === "highlighter") {
        console.log("✍️ Starting stroke:", tool);
        setActiveStroke({
          id: crypto.randomUUID(),
          tool,
          points: [{ x, y }],
        });
        return;
      }

      // Eraser: delete stroke at cursor
      if (tool === "eraser") {
        const hitStroke = hitTestStroke(x, y, strokes);
        if (hitStroke) {
          const action = {
            id: crypto.randomUUID(),
            userId,
            ts: Date.now(),
            type: "DELETE_STROKE" as const,
            payload: { stroke: hitStroke },
          };
          
          console.log("🧹 Eraser: deleting stroke", action.id);
          
          applyAction(action);
          sendAction(wsRef, roomId, action);
        }
        return;
      }

      // Check for edge click in select mode
      if (tool === "select") {
        const hitEdge = hitTestEdge(x, y, edges, nodes);
        if (hitEdge) {
          setSelectedEdgeId(hitEdge.id);
          setSelectedNodeId(null);
          setSelectedTextId(null);
          return;
        }

        // Check for text click
        const hitT = hitTestText(x, y, texts);
        if (hitT) {
          setSelectedTextId(hitT.id);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);

          textDragStartRef.current = { textId: hitT.id, fromX: hitT.x, fromY: hitT.y };

          setDrag({
            mode: "text",
            textId: hitT.id,
            offsetX: x - hitT.x,
            offsetY: y - hitT.y,
          });
          return;
        }
      }

      const hit = hitTestNode(x, y, nodes);
      const connectIntent = tool === "connect" || e.shiftKey;

      // SELECT TOOL: Check for selection first
      if (hit && tool === "select") {
        setSelectedNodeId(hit.id);
        setSelectedEdgeId(null);
        setSelectedTextId(null);

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
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedTextId(null);
      }

      // Otherwise, start drawing ink
      if (tool === "select") {
        setDrag({ mode: "ink" });
        inkHandlers.inkStart(x, y);
      }
    },
    [tool, strokes, edges, nodes, texts, userId, applyAction, wsRef, roomId, setLastPointer, setSelectedNodeId, setSelectedEdgeId, setSelectedTextId, setEditingTextId, buildText, inkHandlers]
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const sx = e.clientX;
      const sy = e.clientY;

      setLastPointer({ x: sx, y: sy });
      const p = screenToWorld(sx, sy);
      const { x, y } = p;

      // Active stroke: add points
      if (activeStroke) {
        setActiveStroke((prev) =>
          prev ? { ...prev, points: [...prev.points, { x, y }] } : prev
        );
        return;
      }

      if (edgeDraft) {
        setEdgeDraft({ ...edgeDraft, toX: x, toY: y });

        const hit = hitTestNode(x, y, nodes);

        if (hit && isWithinSnapDistance(hit, x, y)) {
          const port = getNearestPort(hit, x, y);
          setSnapPreview({ nodeId: hit.id, port });
        } else {
          setSnapPreview(null);
        }
        return;
      }

      if (drag.mode === "text") {
        const newX = x - drag.offsetX;
        const newY = y - drag.offsetY;

        const from = textDragStartRef.current;
        if (!from || from.textId !== drag.textId) return;

        const action = {
          id: crypto.randomUUID(),
          userId,
          ts: Date.now(),
          type: "MOVE_TEXT" as const,
          payload: {
            textId: drag.textId,
            from: { x: from.fromX, y: from.fromY },
            to: { x: newX, y: newY },
          },
        };

        applyAction(action);

        // Throttled broadcast
        const now = Date.now();
        if (now - lastMoveTimeRef.current >= THROTTLE.mouseMoveMs) {
          sendAction(wsRef, roomId, action);
          lastMoveTimeRef.current = now;
          pendingTextMoveRef.current = null;
        } else {
          pendingTextMoveRef.current = {
            textId: drag.textId,
            fromX: from.fromX,
            fromY: from.fromY,
            toX: newX,
            toY: newY,
          };
        }
        return;
      }

      if (drag.mode === "node") {
        const newX = x - drag.offsetX;
        const newY = y - drag.offsetY;

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

        // Throttled broadcast
        const now = Date.now();
        if (now - lastMoveTimeRef.current >= THROTTLE.mouseMoveMs) {
          sendAction(wsRef, roomId, action);
          lastMoveTimeRef.current = now;
          pendingMoveRef.current = null;
        } else {
          pendingMoveRef.current = {
            nodeId: drag.nodeId,
            fromX: from.fromX,
            fromY: from.fromY,
            toX: newX,
            toY: newY,
          };
        }
        return;
      }

      if (drag.mode === "ink") {
        inkHandlers.inkMove(x, y);
      }
    },
    [activeStroke, edgeDraft, drag, nodes, texts, userId, applyAction, wsRef, roomId, setLastPointer, inkHandlers]
  );

  const onUp = useCallback(() => {
    // Send any pending MOVE_TEXT action
    if (drag.mode === "text" && pendingTextMoveRef.current) {
      const pending = pendingTextMoveRef.current;
      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "MOVE_TEXT" as const,
        payload: {
          textId: pending.textId,
          from: { x: pending.fromX, y: pending.fromY },
          to: { x: pending.toX, y: pending.toY },
        },
      };

      console.log("📍 Final MOVE_TEXT (pending):", action.id);
      applyAction(action);
      sendAction(wsRef, roomId, action);
      pendingTextMoveRef.current = null;
    }

    // Send any pending MOVE_NODE action
    if (drag.mode === "node" && pendingMoveRef.current) {
      const pending = pendingMoveRef.current;
      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "MOVE_NODE" as const,
        payload: {
          nodeId: pending.nodeId,
          from: { x: pending.fromX, y: pending.fromY },
          to: { x: pending.toX, y: pending.toY },
        },
      };

      console.log("📍 Final MOVE_NODE (pending):", action.id);
      applyAction(action);
      sendAction(wsRef, roomId, action);
      pendingMoveRef.current = null;
    }

    // Commit active stroke
    if (activeStroke) {
      const stroke = {
        id: activeStroke.id,
        tool: activeStroke.tool,
        points: activeStroke.points,
        width: activeStroke.tool === "pen" ? STROKE.penWidth : STROKE.highlighterWidth,
        opacity: activeStroke.tool === "pen" ? STROKE.penOpacity : STROKE.highlighterOpacity,
      };

      const action = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "ADD_STROKE" as const,
        payload: { stroke },
      };

      console.log("✍️ Committing stroke:", action.id);
      applyAction(action);
      sendAction(wsRef, roomId, action);
      setActiveStroke(null);
      return;
    }

    if (edgeDraft) {
      const hit = hitTestNode(edgeDraft.toX, edgeDraft.toY, nodes);

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

      console.log("🔗 Creating edge:", action.id);
      applyAction(action);
      sendAction(wsRef, roomId, action);

      setEdgeDraft(null);
      setSnapPreview(null);
      setDrag({ mode: "idle" });
      return;
    }

    dragStartRef.current = null;
    textDragStartRef.current = null;
    setDrag({ mode: "idle" });
  }, [drag, activeStroke, edgeDraft, nodes, texts, userId, applyAction, wsRef, roomId]);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const p = screenToWorld(e.clientX, e.clientY);
      
      // Check text hit
      const hitT = hitTestText(p.x, p.y, texts);
      
      if (hitT) {
        setSelectedTextId(hitT.id);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setEditingTextId(hitT.id);
        return;
      }
    },
    [texts, setSelectedNodeId, setSelectedEdgeId, setSelectedTextId, setEditingTextId]
  );

  return {
    edgeDraft,
    snapPreview,
    activeStroke,
    onDown,
    onMove,
    onUp,
    onDoubleClick,
  };
}