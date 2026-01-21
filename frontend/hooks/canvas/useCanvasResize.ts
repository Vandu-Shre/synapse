import { useEffect, RefObject } from "react";

export function useCanvasResize(
  canvasRefs: RefObject<HTMLCanvasElement | null>[]
): void {
  useEffect(() => {
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      for (const ref of canvasRefs) {
        const c = ref.current;
        if (!c) continue;
        c.width = w;
        c.height = h;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRefs]);
}
