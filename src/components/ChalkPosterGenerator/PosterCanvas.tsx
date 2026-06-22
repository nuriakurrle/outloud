import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type {
  ChalkStroke,
  PatternConfig,
  PatternStroke,
  PosterSize,
} from "../../types/poster";
import { drawChalkBackground } from "../../lib/chalkBackground";
import {
  renderStroke,
  compositeStroke,
  strokeGeometrySignature,
} from "../../lib/chalkStrokes";
import styles from "../../styles/chalkPoster.module.css";

interface PosterCanvasProps {
  size: PosterSize;
  pattern: PatternConfig;
  patternStrokes: PatternStroke[];
  strokes: ChalkStroke[];
  scale: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
  children: React.ReactNode;
}

/** Imperative Steuerung für die Pattern-Selbstzeichen-Animation. */
export interface PosterCanvasHandle {
  /** Zeichnet den Hintergrund bei gegebenem Animations-Fortschritt (0–1). */
  renderAt: (progress: number) => void;
  /** Zeichnet das vollständige, statische Poster neu (progress = 1). */
  redraw: () => void;
}

export const PosterCanvas = forwardRef<PosterCanvasHandle, PosterCanvasProps>(
  function PosterCanvas(
    {
      size,
      pattern,
      patternStrokes,
      strokes,
      scale,
      containerRef,
      onBackgroundClick,
      children,
    },
    ref
  ) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Cache gerenderter Strich-Texturen: id → { sig, canvas }. Transform
  // (offset/rotation/scale) invalidiert den Cache nicht.
  const strokeCache = useRef<
    Map<string, { sig: string; canvas: HTMLCanvasElement }>
  >(new Map());

  // `progress` < 1 = Pattern-Selbstzeichen-Animation; die fetten Striche und
  // alles andere bleiben dabei voll sichtbar.
  const draw = useCallback(
    (progress = 1) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Doppelte Auflösung für scharfe Kreide-Textur
      const dpr = 2;
      if (canvas.width !== size.w * dpr) canvas.width = size.w * dpr;
      if (canvas.height !== size.h * dpr) canvas.height = size.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);

      // Tafel + Grain + Hintergrund-Muster (gecachte Tafel, animierbar)
      drawChalkBackground(ctx, size.w, size.h, patternStrokes, pattern.seed, progress);

      // Fette Kreide-Striche (generiert + freihand) in zIndex-Reihenfolge
      const cache = strokeCache.current;
      const liveIds = new Set(strokes.map((s) => s.id));
      for (const id of [...cache.keys()]) {
        if (!liveIds.has(id)) cache.delete(id);
      }
      const ordered = [...strokes].sort((a, b) => a.zIndex - b.zIndex);
      for (const stroke of ordered) {
        const sig = strokeGeometrySignature(stroke, size.w, size.h);
        let entry = cache.get(stroke.id);
        if (!entry || entry.sig !== sig) {
          entry = { sig, canvas: renderStroke(stroke, size.w, size.h) };
          cache.set(stroke.id, entry);
        }
        compositeStroke(ctx, entry.canvas, stroke, size.w, size.h);
      }
    },
    [size, pattern.seed, patternStrokes, strokes]
  );

  useEffect(() => {
    draw();
  }, [draw]);

  useImperativeHandle(
    ref,
    () => ({
      renderAt: (progress: number) => draw(progress),
      redraw: () => draw(1),
    }),
    [draw]
  );

  const displayW = size.w * scale;
  const displayH = size.h * scale;

  return (
    <div
      ref={containerRef}
      className={styles.posterWrap}
      style={{ width: displayW, height: displayH }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: displayW, height: displayH }}
      />
      <div
        className={styles.overlayLayer}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onBackgroundClick?.();
        }}
      >
        {children}
      </div>
    </div>
  );
  }
);
