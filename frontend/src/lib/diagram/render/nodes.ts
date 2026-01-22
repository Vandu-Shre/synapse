import type { DiagramNode, Port } from "@/types/diagram";
import { NODE_THEME } from "@/ui/nodeTheme";
import { getPortPosition } from "../ports";
import { roundRectPath } from "./primitives";

export type SnapPreview = {
  nodeId: string;
  port: Port;
} | null;

export function renderNodes(
  ctx: CanvasRenderingContext2D,
  nodes: DiagramNode[],
  selectedNodeId: string | null,
  snapPreview: SnapPreview,
  isConnecting: boolean,
  isDark: boolean
): void {
  for (const n of nodes) {
    const t = NODE_THEME[n.type];
    const isSelected = n.id === selectedNodeId;

    ctx.save();

    // Soft shadow for "floating glass"
    ctx.shadowColor = isDark ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.10)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;

    roundRectPath(ctx, n.x, n.y, n.width, n.height, 18);

    // Glass base (dark/light)
    ctx.fillStyle = isDark ? "rgba(17, 24, 39, 0.55)" : "rgba(255, 255, 255, 0.62)";
    ctx.fill();

    // Stop shadow for strokes
    ctx.shadowColor = "transparent";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? t.stroke : isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(15, 23, 42, 0.18)";
    ctx.stroke();

    // Tint overlay (type color)
    ctx.fillStyle = t.fill;
    ctx.fill();

    // Border tint
    ctx.lineWidth = isSelected ? 2.5 : 1.6;
    ctx.strokeStyle = t.stroke;
    ctx.stroke();

    // Label (centered)
    const label = n.label.toUpperCase();
    ctx.font = "600 14px ui-sans-serif, system-ui, -apple-system";
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.82)" : "rgba(15,23,42,0.82)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, n.x + n.width / 2, n.y + n.height / 2);

    ctx.restore();

    // Show snap hint while connecting
    if (isConnecting && snapPreview && snapPreview.nodeId === n.id) {
      const pos = getPortPosition(n, snapPreview.port);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = t.stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}
