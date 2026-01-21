"use client";

import { RefObject, useRef, useCallback, useMemo } from "react";
import { canvasStyles } from "@/ui/canvasStyles";
import { CanvasLayers, CanvasHud } from "@/components/canvas";
import {
  useCanvasResize,
  useCanvasSeed,
  useCanvasRenderer,
  useCanvasInteractions,
} from "@/hooks/canvas";

type CanvasProps = {
  wsRef: RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
  wsReady: boolean;
  hasRoomState: boolean;
};

export default function Canvas({
  wsRef,
  roomId,
  userId,
  wsReady,
  hasRoomState,
}: CanvasProps) {
  const inkRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<HTMLCanvasElement>(null);

  // Memoize canvas refs array
  const canvasRefs = useMemo(
    () => [inkRef, strokesRef, nodesRef],
    []
  );

  // Setup canvas sizes
  useCanvasResize(canvasRefs);

  // Seed initial nodes
  useCanvasSeed(wsRef, roomId, userId, wsReady, hasRoomState);

  // Ink drawing handlers
  const inkStart = useCallback((x: number, y: number) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const inkMove = useCallback((x: number, y: number) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const inkHandlers = useMemo(
    () => ({ inkStart, inkMove }),
    [inkStart, inkMove]
  );

  // Interaction handlers
  const { edgeDraft, snapPreview, activeStroke, onDown, onMove, onUp } =
    useCanvasInteractions(wsRef, roomId, userId, inkHandlers);

  // Render canvas layers
  useCanvasRenderer(nodesRef, strokesRef, edgeDraft, snapPreview, activeStroke);

  return (
    <div
      style={canvasStyles.wrapper}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      <CanvasLayers
        inkRef={inkRef}
        strokesRef={strokesRef}
        nodesRef={nodesRef}
      />
      <CanvasHud wsRef={wsRef} roomId={roomId} userId={userId} />
    </div>
  );
}
