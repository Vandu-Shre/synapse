import type { DiagramStroke } from "@/types/diagram";

export type ActiveStroke = {
  id: string;
  tool: "pen" | "highlighter";
  points: Array<{ x: number; y: number }>;
} | null;

function getPenColor(isDark: boolean): string {
  return isDark ? "#e0e7ff" : "#03060d"; 
}

function getHighlighterColor(isDark: boolean): string {
  return isDark ? "rgba(244, 243, 239, 0.5)" : "rgba(225, 211, 85, 0.62)";
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DiagramStroke[],
  activeStroke: ActiveStroke,
  isDark: boolean = false
): void {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;

    const color = stroke.tool === "pen" ? getPenColor(isDark) : getHighlighterColor(isDark);
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke.width;
    ctx.globalAlpha = stroke.opacity;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Render active stroke
  if (activeStroke && activeStroke.points.length > 0) {
    const color = activeStroke.tool === "pen" ? getPenColor(isDark) : getHighlighterColor(isDark);
    ctx.strokeStyle = color;
    ctx.lineWidth = activeStroke.tool === "pen" ? 3 : 14;
    ctx.globalAlpha = activeStroke.tool === "pen" ? 1 : 0.35;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(activeStroke.points[0].x, activeStroke.points[0].y);
    for (let i = 1; i < activeStroke.points.length; i++) {
      ctx.lineTo(activeStroke.points[i].x, activeStroke.points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
