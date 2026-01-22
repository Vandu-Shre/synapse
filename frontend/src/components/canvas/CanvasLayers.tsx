"use client";

import { forwardRef } from "react";
import styles from "@/app/room/[roomId]/room.module.css";

type CanvasLayersProps = {
  inkRef: React.RefObject<HTMLCanvasElement | null>;
  strokesRef: React.RefObject<HTMLCanvasElement | null>;
  nodesRef: React.RefObject<HTMLCanvasElement | null>;
};

export const CanvasLayers = forwardRef<HTMLDivElement, CanvasLayersProps>(
  function CanvasLayers({ inkRef, strokesRef, nodesRef }, ref) {
    return (
      <>
        <div className={styles.canvasBackground} />
        <canvas ref={inkRef} className={styles.inkLayer} />
        <canvas ref={strokesRef} className={styles.canvasLayer} />
        <canvas ref={nodesRef} className={styles.canvasLayer} />
      </>
    );
  }
);
