"use client";

import { useEffect, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { setViewTransform } from "@/lib/viewTransform";
import { BREAKPOINT, MOBILE } from "@/ui/constants";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeBounds(nodes: any[], strokes: any[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  if (minX === Infinity) return null;

  return { minX, minY, maxX, maxY };
}

/**
 * Hook to compute and apply view transform for the board
 * Handles responsive scaling for mobile devices
 */
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

    const measureViewport = () => {
      const el = wrapperRef.current;
      if (!el) {
        setViewport({ vw: window.innerWidth, vh: window.innerHeight });
        return;
      }
      const rect = el.getBoundingClientRect();
      setViewport({ vw: Math.floor(rect.width), vh: Math.floor(rect.height) });
    };

    measureViewport();

    const el = wrapperRef.current;
    if (!el || !("ResizeObserver" in window)) {
      window.addEventListener("resize", measureViewport);
      return () => window.removeEventListener("resize", measureViewport);
    }

    const resizeObserver = new ResizeObserver(measureViewport);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [wrapperRef]);

  // Compute + publish view transform
  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewportWidth = viewport.vw || window.innerWidth;
    const viewportHeight = viewport.vh || window.innerHeight;

    const isMobile = viewportWidth < BREAKPOINT.mobile;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (isMobile) {
      const bounds = computeBounds(nodes, strokes);
      if (bounds) {
        const contentWidth = Math.max(MOBILE.minDimension, bounds.maxX - bounds.minX);
        const contentHeight = Math.max(MOBILE.minDimension, bounds.maxY - bounds.minY);

        scale = Math.min(
          1,
          (viewportWidth - MOBILE.padding * 2) / contentWidth,
          (viewportHeight - MOBILE.padding * 2) / contentHeight
        );

        offsetX = (viewportWidth - contentWidth * scale) / 2 - bounds.minX * scale;
        offsetY = (viewportHeight - contentHeight * scale) / 2 - bounds.minY * scale;
      }
    }

    setViewTransform({ 
      vw: viewportWidth, 
      vh: viewportHeight, 
      scale, 
      offsetX, 
      offsetY 
    });
  }, [viewport.vw, viewport.vh, nodes, strokes]);
}
