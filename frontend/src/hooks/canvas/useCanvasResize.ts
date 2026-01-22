import { useEffect, RefObject } from "react";

export function useCanvasResize(
  containerRef: RefObject<HTMLElement | null>,
  canvasRefs: RefObject<HTMLCanvasElement | null>[]
): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      for (const ref of canvasRefs) {
        const c = ref.current;
        if (!c) continue;
        c.width = w;
        c.height = h;
      }
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    return () => ro.disconnect();
  }, [containerRef, canvasRefs]);
}
