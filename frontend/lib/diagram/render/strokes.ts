import type { DiagramStroke, StrokeTool } from "@/types/diagram";

export type ActiveStroke = {
  id: string;
  tool: StrokeTool;
  points: Array<{ x: number; y: number }>;
} | null;

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DiagramStroke[],
  activeStroke: ActiveStroke
): void {
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
}
