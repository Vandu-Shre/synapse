import type { DiagramNode, DiagramEdge, Port } from "@/types/diagram";
import { getPortPosition, getNearestPort } from "../ports";

export type EdgeDraft = {
  fromNodeId: string;
  startX: number;
  startY: number;
  toX: number;
  toY: number;
} | null;

export function renderEdges(
  ctx: CanvasRenderingContext2D,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  selectedEdgeId: string | null,
  edgeDraft: EdgeDraft
): void {
  // Draw saved edges
  for (const e of edges) {
    const from = nodes.find((n) => n.id === e.fromNodeId);
    const to = nodes.find((n) => n.id === e.toNodeId);
    if (!from || !to) continue;

    const p1 = getPortPosition(from, e.fromPort);
    const p2 = getPortPosition(to, e.toPort);

    const isSelected = e.id === selectedEdgeId;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineWidth = isSelected ? 3.5 : 2;
    ctx.strokeStyle = isSelected
      ? "rgba(109, 94, 252, 0.80)"
      : "rgba(15,23,42,0.38)";
    ctx.stroke();

    // Draw selection indicator
    if (isSelected) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(109, 94, 252, 0.80)";
      ctx.fill();
    }
  }

  // Draw edge draft
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
}
