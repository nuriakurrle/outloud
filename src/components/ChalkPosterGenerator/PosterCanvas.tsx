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
import {
  drawChalkBackground,
  patternChalkRgb,
  renderPatternStrokeCanvas,
} from "../../lib/chalkBackground";
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
  bg: string;
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
      bg,
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
  // Cache der Hintergrund-Linien (Pattern): id → { sig, canvas }. Der Offset
  // (Drag) fließt NICHT in die Signatur ein → Verschieben ist nur ein
  // drawImage und bleibt flüssig.
  const patternCache = useRef<
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

      // Hintergrund + Pattern-Linien.
      if (progress < 1) {
        // Selbstzeichen-Animation: voller Re-Render (Offsets werden in
        // renderPatternStrokes berücksichtigt).
        drawChalkBackground(
          ctx,
          size.w,
          size.h,
          patternStrokes,
          pattern.seed,
          progress,
          bg,
          patternChalkRgb(pattern.color)
        );
      } else {
        // Statische Vorschau: jede Linie aus dem Cache compositen + Offset.
        // → Verschieben ist flüssig (kein Grain-Re-Render pro Frame).
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size.w, size.h);
        const chalkRgb = patternChalkRgb(pattern.color);
        const pcache = patternCache.current;
        const liveP = new Set(patternStrokes.map((s) => s.id));
        for (const id of [...pcache.keys()]) {
          if (!liveP.has(id)) pcache.delete(id);
        }
        for (const ps of patternStrokes) {
          const sig = `${ps.seed}|${Math.round(ps.weight)}|${ps.opacity.toFixed(
            2
          )}|${size.w}x${size.h}|${chalkRgb}`;
          let entry = pcache.get(ps.id);
          if (!entry || entry.sig !== sig) {
            entry = {
              sig,
              canvas: renderPatternStrokeCanvas(ps, size.w, size.h, dpr, chalkRgb),
            };
            pcache.set(ps.id, entry);
          }
          const ox = ((ps.offsetX ?? 0) / 100) * size.w;
          const oy = ((ps.offsetY ?? 0) / 100) * size.h;
          ctx.drawImage(entry.canvas, ox, oy, size.w, size.h);
        }
      }

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
    [size, pattern.seed, pattern.color, patternStrokes, strokes, bg]
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
