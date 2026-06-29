import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import type { PlacedAsset, Position } from "../../types/poster";
import type { ExtraText } from "./types";

interface DeltaDragState {
  id: string;
  cx: number;
  cy: number;
  offX: number;
  offY: number;
  clamp: { min: number; max: number };
  setOffset: (offX: number, offY: number) => void;
}

// Distances from the anchor point to each edge of the element (in %).
// Measured once at drag start; constant throughout the drag.
interface AnchorBounds {
  fromLeft: number;
  fromRight: number;
  fromTop: number;
  fromBottom: number;
}

interface Options {
  containerRef: React.RefObject<HTMLDivElement | null>;
  positionsRef: React.RefObject<Record<string, Position>>;
  extraTextsRef: React.RefObject<ExtraText[]>;
  placedAssetsRef: React.RefObject<PlacedAsset[]>;
  clampX: (v: number) => number;
  clampY: (v: number) => number;
  margins: { left: number; right: number; top: number; bottom: number };
  commit: () => void;
  setPositions: React.Dispatch<React.SetStateAction<Record<string, Position>>>;
  setExtraTexts: React.Dispatch<React.SetStateAction<ExtraText[]>>;
  setPlacedAssets: React.Dispatch<React.SetStateAction<PlacedAsset[]>>;
  getElementRect?: (id: string) => DOMRect | null;
}

const SNAP = 2;

export function useDrag({
  containerRef,
  positionsRef,
  extraTextsRef,
  placedAssetsRef,
  clampX,
  clampY,
  margins,
  commit,
  setPositions,
  setExtraTexts,
  setPlacedAssets,
  getElementRect,
}: Options) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }[]>([]);
  const dragOffset = useRef({ x: 0, y: 0 });
  const deltaRef = useRef<DeltaDragState | null>(null);
  const anchorBoundsRef = useRef<AnchorBounds | null>(null);

  const beginDrag = useCallback((id: string, curX: number, curY: number, e: React.PointerEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    commit();
    setDragging(id);
    deltaRef.current = null;
    dragOffset.current = {
      x: e.clientX - rect.left - (curX / 100) * rect.width,
      y: e.clientY - rect.top - (curY / 100) * rect.height,
    };
    // Measure anchor-to-edge offsets for alignment-aware clamping
    const el = getElementRect?.(id);
    if (el) {
      anchorBoundsRef.current = {
        fromLeft:   curX - (el.left   - rect.left) / rect.width  * 100,
        fromRight:  (el.right  - rect.left) / rect.width  * 100 - curX,
        fromTop:    curY - (el.top    - rect.top)  / rect.height * 100,
        fromBottom: (el.bottom - rect.top)  / rect.height * 100 - curY,
      };
    } else {
      anchorBoundsRef.current = null;
    }
  }, [containerRef, commit, getElementRect]);

  const beginDeltaDrag = useCallback((
    id: string,
    e: React.PointerEvent,
    clamp: { min: number; max: number },
    getOffset: () => { offX: number; offY: number },
    setOffset: (offX: number, offY: number) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    commit();
    setDragging(id);
    anchorBoundsRef.current = null;
    const { offX, offY } = getOffset();
    deltaRef.current = { id, cx: e.clientX, cy: e.clientY, offX, offY, clamp, setOffset };
  }, [commit]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Delta-based drag (strokes, patterns)
      if (deltaRef.current?.id === dragging) {
        const dd = deltaRef.current;
        const offX = Math.max(dd.clamp.min, Math.min(dd.clamp.max, dd.offX + ((e.clientX - dd.cx) / rect.width) * 100));
        const offY = Math.max(dd.clamp.min, Math.min(dd.clamp.max, dd.offY + ((e.clientY - dd.cy) / rect.height) * 100));
        dd.setOffset(offX, offY);
        return;
      }

      // Absolute % drag — compute raw position, then clamp
      let px = ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
      let py = ((e.clientY - rect.top  - dragOffset.current.y) / rect.height) * 100;

      const ab = anchorBoundsRef.current;
      if (ab) {
        // Alignment-aware: keep the whole element inside margin bounds
        px = Math.max(margins.left  + ab.fromLeft,  Math.min(100 - margins.right  - ab.fromRight,  px));
        py = Math.max(margins.top   + ab.fromTop,   Math.min(100 - margins.bottom - ab.fromBottom, py));
      } else {
        px = clampX(px);
        py = clampY(py);
      }

      // Build snap targets: centers + edges of all non-dragged items
      const snapX: number[] = [];
      const snapY: number[] = [];

      const addTarget = (id: string, cx: number, cy: number) => {
        if (getElementRect) {
          const el = getElementRect(id);
          if (el) {
            const halfW = (el.width  / rect.width  / 2) * 100;
            const halfH = (el.height / rect.height / 2) * 100;
            snapX.push(cx - halfW, cx, cx + halfW);
            snapY.push(cy - halfH, cy, cy + halfH);
            return;
          }
        }
        snapX.push(cx);
        snapY.push(cy);
      };

      for (const [k, pos] of Object.entries(positionsRef.current)) {
        if (k !== dragging) addTarget(k, pos.x, pos.y);
      }
      for (const t of extraTextsRef.current) {
        if (t.id !== dragging) addTarget(t.id, t.position.x, t.position.y);
      }
      for (const a of placedAssetsRef.current) {
        if (a.id !== dragging) addTarget(a.id, a.x, a.y);
      }

      const lines: { x?: number; y?: number }[] = [];
      for (const tx of snapX) {
        if (Math.abs(px - tx) < SNAP) { px = tx; lines.push({ x: tx }); break; }
      }
      for (const ty of snapY) {
        if (Math.abs(py - ty) < SNAP) { py = ty; lines.push({ y: ty }); break; }
      }
      setSnapLines(lines);

      if (dragging in positionsRef.current) {
        setPositions(prev => ({ ...prev, [dragging]: { x: px, y: py } }));
      } else if (extraTextsRef.current.some(t => t.id === dragging)) {
        setExtraTexts(prev => prev.map(t => t.id === dragging ? { ...t, position: { x: px, y: py } } : t));
      } else {
        setPlacedAssets(prev => prev.map(a => a.id === dragging ? { ...a, x: px, y: py } : a));
      }
    };

    const onUp = () => {
      setDragging(null);
      deltaRef.current = null;
      anchorBoundsRef.current = null;
      setSnapLines([]);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, clampX, clampY, margins, containerRef, positionsRef, extraTextsRef, placedAssetsRef, setPositions, setExtraTexts, setPlacedAssets, getElementRect]);

  return { dragging, setDragging, snapLines, beginDrag, beginDeltaDrag };
}
