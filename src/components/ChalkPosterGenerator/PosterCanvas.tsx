import { forwardRef, useImperativeHandle } from "react";
import type { ChalkStroke, PatternConfig, PatternStroke, PosterSize } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

export interface PosterCanvasProps {
  size: PosterSize;
  pattern: PatternConfig;
  patternStrokes: PatternStroke[];
  strokes: ChalkStroke[];
  bg: string;
  scale: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundClick?: () => void;
  children: React.ReactNode;
  backdrop?: React.ReactNode;
  liveStrokePath?: string;
  liveStrokeColor?: string;
  liveStrokeOpacity?: number;
  // Stroke interaction
  selectedStrokeId?: string | null;
  onStrokePointerDown?: (id: string, e: React.PointerEvent) => void;
  selectedPatternId?: string | null;
  onPatternPointerDown?: (id: string, e: React.PointerEvent) => void;
  drawMode?: boolean;
}

export interface PosterCanvasHandle {
  redraw: () => void;
}

const patternFill = (color: "white" | "black"): string =>
  color === "white" ? "#FFFFFF" : "#000000";

export const PosterCanvas = forwardRef<PosterCanvasHandle, PosterCanvasProps>(
  function PosterCanvas(
    {
      size, pattern, patternStrokes, strokes, bg, scale,
      containerRef, onBackgroundClick, children, backdrop,
      liveStrokePath, liveStrokeColor = "#ffffff", liveStrokeOpacity = 0.8,
      selectedStrokeId, onStrokePointerDown,
      selectedPatternId, onPatternPointerDown,
      drawMode,
    },
    ref
  ) {
    useImperativeHandle(ref, () => ({ redraw: () => {} }), []);

    const displayW = size.w * scale;
    const displayH = size.h * scale;
    const fillColor = patternFill(pattern.color);
    const ordered = [...strokes].sort((a, b) => a.zIndex - b.zIndex);

    return (
      <div
        ref={containerRef}
        className={styles.posterWrap}
        style={{ width: displayW, height: displayH, background: bg }}
      >
        {backdrop && <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>{backdrop}</div>}
        {/* SVG: background patterns + freehand strokes + live preview */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            overflow: "visible", zIndex: 1,
            pointerEvents: drawMode ? "none" : "auto",
          }}
        >
          {/* Background click catcher — below all paths */}
          <rect x="0" y="0" width="100" height="100" fill="transparent"
            onClick={onBackgroundClick}
            style={{ cursor: "default" }}
          />

          {patternStrokes.map((ps) => (
            <g key={ps.id}
              opacity={ps.opacity}
              transform={`translate(${ps.offsetX ?? 0} ${ps.offsetY ?? 0})`}
              style={{ cursor: onPatternPointerDown ? "grab" : "default" }}
              onPointerDown={onPatternPointerDown ? (e) => { e.stopPropagation(); onPatternPointerDown(ps.id, e); } : undefined}
            >
              <path d={ps.svgPath} fill={fillColor} />
              {selectedPatternId === ps.id && (
                <path d={ps.svgPath} fill="none" stroke="rgba(255,255,255,0.5)"
                  strokeWidth={0.5} strokeDasharray="2 1.5" />
              )}
            </g>
          ))}

          {ordered.map((s) => (
            <g key={s.id}
              opacity={s.opacity}
              transform={`translate(${s.offsetX} ${s.offsetY})`}
              style={{ cursor: onStrokePointerDown ? "grab" : "default" }}
              onPointerDown={onStrokePointerDown ? (e) => { e.stopPropagation(); onStrokePointerDown(s.id, e); } : undefined}
            >
              <path d={s.svgPath} fill={s.color} />
              {selectedStrokeId === s.id && (
                <path d={s.svgPath} fill="none" stroke="rgba(255,255,255,0.5)"
                  strokeWidth={0.5} strokeDasharray="2 1.5" />
              )}
            </g>
          ))}

          {liveStrokePath && (
            <path d={liveStrokePath} fill={liveStrokeColor} opacity={liveStrokeOpacity} />
          )}
        </svg>

        {/* Interactive overlay: text, assets, handles, draw capture */}
        <div
          className={styles.overlayLayer}
          style={{ zIndex: 2, pointerEvents: "none" }}
        >
          {children}
        </div>
      </div>
    );
  }
);
