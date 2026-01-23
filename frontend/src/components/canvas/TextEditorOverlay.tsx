"use client";

import { useEffect, useRef, useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { sendAction } from "@/lib/ws/send";
import { getViewTransform, worldToScreen } from "@/lib/viewTransform";
import { TEXT } from "@/ui/constants";
import styles from "./TextEditorOverlay.module.css";

const MIN_W = 120;
const MIN_H = 80;
const MAX_W = 520;
const MAX_H = 320;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function TextEditorOverlay({
  wsRef,
  roomId,
  userId,
}: {
  wsRef: React.RefObject<WebSocket | null>;
  roomId: string;
  userId: string;
}) {
  const editingTextId = useDiagramStore((s) => s.editingTextId);
  const setEditingTextId = useDiagramStore((s) => s.setEditingTextId);
  const getText = useDiagramStore((s) => s.getText);
  const applyAction = useDiagramStore((s) => s.applyAction);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const text = editingTextId ? getText(editingTextId) : undefined;

  const [draft, setDraft] = useState("");
  const [sizeWorld, setSizeWorld] = useState<{ w: number; h: number }>({
    w: TEXT.defaultWidth,
    h: TEXT.defaultHeight,
  });

  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const hasUserInteractedRef = useRef(false);
  const isCommittingRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSizeRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!text || !editingTextId) {
      setDraft("");
      startSizeRef.current = null;
      hasUserInteractedRef.current = false;
      return;
    }

    setDraft(text.value ?? "");

    const w = clamp(text.width ?? TEXT.defaultWidth, MIN_W, MAX_W);
    const h = clamp(text.height ?? TEXT.defaultHeight, MIN_H, MAX_H);
    setSizeWorld({ w, h });
    startSizeRef.current = { w, h };

    hasUserInteractedRef.current = false;

    const focusTimer = setTimeout(() => {
      taRef.current?.focus();
    }, 50);

    return () => clearTimeout(focusTimer);
  }, [editingTextId, text?.id]);

  // ✅ Observe textarea size changes (native resize handle)
  useEffect(() => {
    if (!editingTextId) return;
    const el = taRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      // ✅ Read scale only when needed (inside observer callback)
      const view = getViewTransform();
      const scale = view.scale || 1;

      const wWorld = clamp(rect.width / scale, MIN_W, MAX_W);
      const hWorld = clamp(rect.height / scale, MIN_H, MAX_H);

      setSizeWorld({ w: wWorld, h: hWorld });
      hasUserInteractedRef.current = true;
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [editingTextId]);

  if (!text || !editingTextId) return null;

  const view = getViewTransform();
  const screenPos = worldToScreen(text.x, text.y);

  const widthPx = clamp(sizeWorld.w, MIN_W, MAX_W) * view.scale;
  const heightPx = clamp(sizeWorld.h, MIN_H, MAX_H) * view.scale;

  const commitAndClose = (deleteIfEmpty: boolean) => {
    if (isCommittingRef.current) return;
    isCommittingRef.current = true;

    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);

    const current = getText(editingTextId);
    if (!current) {
      setEditingTextId(null);
      isCommittingRef.current = false;
      return;
    }

    const nextValue = draft;
    const nextW = clamp(sizeWorld.w, MIN_W, MAX_W);
    const nextH = clamp(sizeWorld.h, MIN_H, MAX_H);

    const isEmpty = nextValue.trim().length === 0;
    const wasEmpty = (current.value ?? "").trim().length === 0;

    const valueChanged = nextValue !== (current.value ?? "");
    const sizeChanged = nextW !== current.width || nextH !== current.height;

    if (valueChanged || sizeChanged) {
      const updateAction = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "UPDATE_TEXT" as const,
        payload: {
          textId: current.id,
          from: { value: current.value, width: current.width, height: current.height },
          to: { value: nextValue, width: nextW, height: nextH },
        },
      };

      applyAction(updateAction);
      sendAction(wsRef, roomId, updateAction);
    } else if (deleteIfEmpty && isEmpty && wasEmpty) {
      const delAction = {
        id: crypto.randomUUID(),
        userId,
        ts: Date.now(),
        type: "DELETE_TEXT" as const,
        payload: { text: current },
      };

      applyAction(delAction);
      sendAction(wsRef, roomId, delAction);
    }

    setEditingTextId(null);
    isCommittingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    hasUserInteractedRef.current = true;

    if (e.key === "Escape") {
      e.preventDefault();
      commitAndClose(true);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitAndClose(true);
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    hasUserInteractedRef.current = true;
    setDraft(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!hasUserInteractedRef.current) return;

    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && taRef.current?.contains(relatedTarget)) return;

    blurTimerRef.current = setTimeout(() => {
      if (useDiagramStore.getState().editingTextId === editingTextId) {
        commitAndClose(false);
      }
    }, 200);
  };

  const themeClass = isDark ? styles.dark : styles.light;

  return (
    <textarea
      ref={taRef}
      value={draft}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPointerDown={(e) => {
        e.stopPropagation();
        hasUserInteractedRef.current = true;
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder="Type here..."
      title="Text editor"
      className={`${styles.textEditorInput} ${themeClass}`}
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
      }}
    />
  );
}
