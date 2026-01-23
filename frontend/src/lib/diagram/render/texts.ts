import type { DiagramText } from "@/types/diagram";
import { roundRectPath } from "./primitives";
import { TEXT } from "@/ui/constants";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Word-wrap a paragraph into multiple lines that fit maxWidth
 * Tries to break at spaces, falls back to character-level if needed
 */
function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number
): string[] {
  if (maxWidth <= 0) return [paragraph];

  const words = paragraph.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width <= maxWidth) {
      currentLine = testLine;
    } else {
      // Line would overflow
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word longer than maxWidth - break at character level
        let remaining = word;
        while (remaining.length > 0) {
          let lo = 0;
          let hi = remaining.length;
          
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            const candidate = remaining.slice(0, mid);
            if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
            else hi = mid - 1;
          }
          
          const chunk = remaining.slice(0, Math.max(1, lo));
          lines.push(chunk);
          remaining = remaining.slice(chunk.length);
        }
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

/**
 * Fit text with ellipsis if it overflows
 */
function fitLineWithEllipsis(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number
): string {
  if (ctx.measureText(line).width <= maxWidth) return line;

  let lo = 0;
  let hi = line.length;
  
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = line.slice(0, mid) + "…";
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  
  return line.slice(0, lo) + "…";
}

export function renderTexts(
  ctx: CanvasRenderingContext2D,
  texts: DiagramText[],
  selectedTextId: string | null,
  editingTextId: string | null,
  isDark: boolean
) {
  for (const t of texts) {
    // ✅ Skip rendering if this text is being edited (prevents ghost box)
    if (editingTextId && t.id === editingTextId) continue;

    const selected = t.id === selectedTextId;

    ctx.save();

    // ✅ Subtle shadow matching overlay
    ctx.shadowColor = isDark ? "rgba(0,0,0,0.25)" : "rgba(15,23,42,0.08)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;

    roundRectPath(ctx, t.x, t.y, t.width, t.height, TEXT.cornerRadius);

    // ✅ Glass fill matching overlay exactly
    ctx.fillStyle = isDark ? "rgba(17, 24, 39, 0.45)" : "rgba(255, 255, 255, 0.55)";
    ctx.fill();

    // Border
    ctx.shadowColor = "transparent";
    ctx.lineWidth = selected ? 2.3 : 1.4;
    ctx.strokeStyle = selected
      ? (isDark ? "rgba(199,210,254,0.85)" : "rgba(109,94,252,0.55)")
      : (isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.14)");
    ctx.stroke();

    // ✅ Text content with word-wrapping
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.86)" : "rgba(15,23,42,0.88)";
    ctx.font = "500 14px ui-sans-serif, system-ui, -apple-system";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const padding = TEXT.padding;
    const availableW = Math.max(0, t.width - padding * 2);
    const availableH = Math.max(0, t.height - padding * 2);

    const maxLines = Math.max(1, Math.floor(availableH / TEXT.lineHeight));
    const rawParagraphs = (t.value || "").split("\n");

    // ✅ Word-wrap each paragraph
    const renderLines: string[] = [];
    for (const para of rawParagraphs) {
      const wrapped = wrapParagraph(ctx, para, availableW);
      renderLines.push(...wrapped);
    }

    // Draw up to maxLines
    const linesToDraw = renderLines.slice(0, maxLines);
    const hasOverflow = renderLines.length > maxLines;

    for (let i = 0; i < linesToDraw.length; i++) {
      const yy = t.y + padding + i * TEXT.lineHeight;
      let line = linesToDraw[i];

      // ✅ Add ellipsis to last line if overflow
      if (i === linesToDraw.length - 1 && hasOverflow) {
        line = fitLineWithEllipsis(ctx, line, availableW);
      }

      ctx.fillText(line, t.x + padding, yy);
    }

    ctx.restore();
  }
}
