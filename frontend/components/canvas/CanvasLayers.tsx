"use client";

import { forwardRef } from "react";
import { canvasStyles } from "@/ui/canvasStyles";

type CanvasLayersProps = {
  inkRef: React.RefObject<HTMLCanvasElement | null>;
  strokesRef: React.RefObject<HTMLCanvasElement | null>;
  nodesRef: React.RefObject<HTMLCanvasElement | null>;
};

export const CanvasLayers = forwardRef<HTMLDivElement, CanvasLayersProps>(
  function CanvasLayers({ inkRef, strokesRef, nodesRef }, ref) {
    return (
      <>
        {/* Background layer with sparkly grid */}
        <div style={canvasStyles.background} />

        {/* Ink layer */}
        <canvas ref={inkRef} style={canvasStyles.inkLayer} />

        {/* Strokes layer (synced drawings) */}
        <canvas ref={strokesRef} style={canvasStyles.layer} />

        {/* Nodes layer */}
        <canvas ref={nodesRef} style={canvasStyles.layer} />
      </>
    );
  }
);
