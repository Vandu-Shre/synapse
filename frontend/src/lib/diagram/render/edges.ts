import type { DiagramNode, DiagramEdge, Port } from "@/types/diagram";
import { getPortPosition, getNearestPort } from "../ports";

export type EdgeDraft = {
  fromNodeId: string;
  startX: number;
  startY: number;
  toX: number;
  toY: number;
} | null;

function getEdgeColor(isDark: boolean): string {
  return isDark ? "#a5b4fc" : "#6d5efc"; // Light: purple, Dark: lighter indigo
}

export function renderEdges(
  ctx: CanvasRenderingContext2D,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  selectedEdgeId: string | null,
  edgeDraft: EdgeDraft,
  isDark: boolean = false
): void {
  // Draw saved edges
  for (const e of edges) {
    const from = nodes.find((n) => n.id === e.fromNodeId);
    const to = nodes.find((n) => n.id === e.toNodeId);
    if (!from || !to) continue;

    const p1 = getPortPosition(from, e.fromPort);
    const p2 = getPortPosition(to, e.toPort);

    const isSelected = e.id === selectedEdgeId;
    const edgeColor = getEdgeColor(isDark);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineWidth = isSelected ? 3.5 : 2;
    ctx.strokeStyle = isSelected ? edgeColor : `${edgeColor}99`;
    ctx.stroke();

    // Draw selection indicator
    if (isSelected) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 6, 0, Math.PI * 2);
      ctx.fillStyle = edgeColor;
      ctx.fill();
    }
  }

  // Draw edge draft
  if (edgeDraft) {
    const from = nodes.find((n) => n.id === edgeDraft.fromNodeId);
    if (from) {
      const fromPort = getNearestPort(from, edgeDraft.startX, edgeDraft.startY);
      const p1 = getPortPosition(from, fromPort);
      const edgeColor = getEdgeColor(isDark);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(edgeDraft.toX, edgeDraft.toY);
      ctx.strokeStyle = `${edgeColor}66`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
