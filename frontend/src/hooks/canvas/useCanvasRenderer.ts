"use client";

import { useEffect, RefObject } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { renderEdges, renderNodes, renderStrokes, clearCanvas } from "@/lib/diagram/render";
import type { EdgeDraft, SnapPreview, ActiveStroke } from "@/lib/diagram/render";

export function useCanvasRenderer(
  nodesRef: RefObject<HTMLCanvasElement | null>,
  strokesRef: RefObject<HTMLCanvasElement | null>,
  edgeDraft: EdgeDraft,
  snapPreview: SnapPreview,
  activeStroke: ActiveStroke
): void {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const strokes = useDiagramStore((s) => s.strokes);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  // Draw strokes layer
  useEffect(() => {
    const canvas = strokesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { getViewTransform } = require("@/lib/viewTransform");
    const view = getViewTransform();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    clearCanvas(ctx);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    renderStrokes(ctx, strokes, activeStroke, isDark);
  }, [strokes, activeStroke, strokesRef, isDark]);

  // Draw nodes layer
  useEffect(() => {
    const canvas = nodesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { getViewTransform } = require("@/lib/viewTransform");
    const view = getViewTransform();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    clearCanvas(ctx);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    renderEdges(ctx, nodes, edges, selectedEdgeId, edgeDraft, isDark);
    renderNodes(ctx, nodes, selectedNodeId, snapPreview, !!edgeDraft, isDark);
  }, [nodes, edges, edgeDraft, snapPreview, selectedNodeId, selectedEdgeId, nodesRef, isDark]);
}
