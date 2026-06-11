import { useCallback, useEffect, useRef } from "react";
import type {
  BorderConfig,
  DividerStyle,
  PatternConfig,
  PosterSize,
} from "../../types/poster";
import { drawChalkPatterns } from "../../lib/chalkPatterns";
import { drawChalkBorder } from "../../lib/chalkBorders";
import { drawChalkDivider } from "../../lib/chalkDividers";
import styles from "../../styles/chalkPoster.module.css";

const POSTER_BG = "#1e1e1e";

interface PosterCanvasProps {
  size: PosterSize;
  pattern: PatternConfig;
  border: BorderConfig;
  divider: DividerStyle;
  dividerY: number; // Prozent
  scale: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
  children: React.ReactNode;
}

export function PosterCanvas({
  size,
  pattern,
  border,
  divider,
  dividerY,
  scale,
  containerRef,
  onBackgroundClick,
  children,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Doppelte Auflösung für scharfe Kreide-Textur
    const dpr = 2;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Tafel-Hintergrund
    ctx.fillStyle = POSTER_BG;
    ctx.fillRect(0, 0, size.w, size.h);

    drawChalkPatterns(ctx, size.w, size.h, pattern);
    drawChalkBorder(ctx, size.w, size.h, border);
    drawChalkDivider(ctx, size.w, (dividerY / 100) * size.h, divider);
  }, [size, pattern, border, divider, dividerY]);

  useEffect(() => {
    draw();
  }, [draw]);

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
