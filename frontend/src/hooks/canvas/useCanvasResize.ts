import { useEffect, RefObject, useState } from "react";

export function useCanvasResize(
  containerRef: RefObject<HTMLElement | null>,
  canvasRefs: RefObject<HTMLCanvasElement | null>[]
): number {
  const [resizeTick, setResizeTick] = useState(0);

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

        // Only write if changed to avoid extra clears
        if (c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;
      }

      setResizeTick((t) => t + 1);
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    return () => ro.disconnect();
  }, [containerRef, canvasRefs]);

  return resizeTick;
}
