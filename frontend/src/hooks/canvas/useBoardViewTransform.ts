"use client";

import { useEffect, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { setViewTransform } from "@/lib/viewTransform";

function computeBounds(nodes: any[], strokes: any[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }

  for (const s of strokes) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export function useBoardViewTransform(
  wrapperRef: React.RefObject<HTMLDivElement | null>
) {
  const nodes = useDiagramStore((s) => s.nodes);
  const strokes = useDiagramStore((s) => s.strokes);

  // Start safe (SSR): 0x0. We compute real size in effects.
  const [viewport, setViewport] = useState({ vw: 0, vh: 0 });

  // Track wrapper size (ResizeObserver) + initial measure
  useEffect(() => {
    if (typeof window === "undefined") return;

    const measure = () => {
      const el = wrapperRef.current;
      if (!el) {
        setViewport({ vw: window.innerWidth, vh: window.innerHeight });
        return;
      }
      const r = el.getBoundingClientRect();
      setViewport({ vw: Math.floor(r.width), vh: Math.floor(r.height) });
    };

    measure();

    const el = wrapperRef.current;
    if (!el || !("ResizeObserver" in window)) {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrapperRef]);

  // Compute + publish view transform
  useEffect(() => {
    if (typeof window === "undefined") return;

    const vw = viewport.vw || window.innerWidth;
    const vh = viewport.vh || window.innerHeight;

    const isMobile = vw < 800;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (isMobile) {
      const b = computeBounds(nodes, strokes);
      if (b) {
        const pad = 24;
        const contentW = Math.max(1, b.maxX - b.minX);
        const contentH = Math.max(1, b.maxY - b.minY);

        scale = Math.min(
          1,
          (vw - pad * 2) / contentW,
          (vh - pad * 2) / contentH
        );

        offsetX = (vw - contentW * scale) / 2 - b.minX * scale;
        offsetY = (vh - contentH * scale) / 2 - b.minY * scale;
      }
    }

    setViewTransform({ vw, vh, scale, offsetX, offsetY });
  }, [viewport.vw, viewport.vh, nodes, strokes]);
}
