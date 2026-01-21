import { useEffect, RefObject } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
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

  // Draw strokes layer
  useEffect(() => {
    const canvas = strokesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas(ctx);
    renderStrokes(ctx, strokes, activeStroke);
  }, [strokes, activeStroke, strokesRef]);

  // Draw nodes layer
  useEffect(() => {
    const canvas = nodesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas(ctx);
    renderEdges(ctx, nodes, edges, selectedEdgeId, edgeDraft);
    renderNodes(ctx, nodes, selectedNodeId, snapPreview, !!edgeDraft);
  }, [nodes, edges, edgeDraft, snapPreview, selectedNodeId, selectedEdgeId, nodesRef]);
}
