import { useCallback, useRef, useState } from "react";
import type React from "react";
import type { ChalkStroke, ToolMode } from "../../types/poster";
import { createLivePath, makeFreehandStroke } from "../../lib/brushStrokes";

interface Options {
  containerRef: React.RefObject<HTMLDivElement | null>;
  clampX: (v: number) => number;
  clampY: (v: number) => number;
  commit: () => void;
  setStrokes: React.Dispatch<React.SetStateAction<ChalkStroke[]>>;
}

export function useDrawing({ containerRef, clampX, clampY, commit, setStrokes }: Options) {
  const [mode, setMode] = useState<ToolMode>("move");
  const [brushName, setBrushName] = useState("Figma Verite");
  const [brushWidth, setBrushWidth] = useState(0.3);
  const [brushOpacity, setBrushOpacity] = useState(1.0);
  const [chalkColor, setChalkColor] = useState("#FFFFFF");
  const [isDrawing, setIsDrawing] = useState(false);
  const [liveStrokePath, setLiveStrokePath] = useState<string | undefined>();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const drawPointsRef = useRef<{ x: number; y: number }[]>([]);

  const getPointerPercent = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: clampX(((e.clientX - rect.left) / rect.width) * 100),
      y: clampY(((e.clientY - rect.top) / rect.height) * 100),
    };
  }, [containerRef, clampX, clampY]);

  const handleDrawStart = useCallback((e: React.PointerEvent) => {
    if (mode !== "draw") return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    drawPointsRef.current = [getPointerPercent(e)];
    setLiveStrokePath(undefined);
  }, [mode, getPointerPercent]);

  const handleDrawMove = useCallback((e: React.PointerEvent) => {
    if (mode === "draw") setCursorPos({ x: e.clientX, y: e.clientY });
    if (!isDrawing) return;
    const pos = getPointerPercent(e);
    const pts = drawPointsRef.current;
    const last = pts[pts.length - 1];
    if (Math.hypot(pos.x - last.x, pos.y - last.y) > 0.5) {
      drawPointsRef.current = [...pts, pos];
      if (drawPointsRef.current.length >= 2)
        setLiveStrokePath(createLivePath(drawPointsRef.current, brushName, brushWidth));
    }
  }, [mode, isDrawing, getPointerPercent, brushName, brushWidth]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pts = drawPointsRef.current;
    drawPointsRef.current = [];
    setLiveStrokePath(undefined);
    if (pts.length < 2) return;
    commit();
    setStrokes(prev => [
      ...prev,
      makeFreehandStroke(pts, brushName, brushWidth, chalkColor, brushOpacity, prev.length),
    ]);
  }, [isDrawing, commit, setStrokes, brushName, brushWidth, chalkColor, brushOpacity]);

  const handleDrawLeave = useCallback(() => {
    handleDrawEnd();
    setCursorPos(null);
  }, [handleDrawEnd]);

  return {
    mode, setMode,
    brushName, setBrushName,
    brushWidth, setBrushWidth,
    brushOpacity, setBrushOpacity,
    chalkColor, setChalkColor,
    isDrawing, liveStrokePath, cursorPos,
    handleDrawStart, handleDrawMove, handleDrawEnd, handleDrawLeave,
  };
}
