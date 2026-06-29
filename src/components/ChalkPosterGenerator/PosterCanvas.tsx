import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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
  patternFront?: boolean; // generierte Linien über Text & Illustrationen
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
      drawMode, patternFront,
    },
    ref
  ) {
    useImperativeHandle(ref, () => ({ redraw: () => {} }), []);

    const displayW = size.w * scale;
    const displayH = size.h * scale;

    // Live-Vorschau aufs Canvas zeichnen (statt SVG) – isoliert vom schweren
    // Hintergrund, daher flüssig. Pfad ist in 0–100 (%) Koordinaten.
    const liveCanvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const cv = liveCanvasRef.current;
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (liveStrokePath) {
        ctx.scale(cv.width / 100, cv.height / 100);
        ctx.globalAlpha = liveStrokeOpacity;
        ctx.fillStyle = liveStrokeColor;
        ctx.fill(new Path2D(liveStrokePath));
      }
    }, [liveStrokePath, liveStrokeColor, liveStrokeOpacity, displayW, displayH]);

    const fillColor = patternFill(pattern.color);
    const ordered = [...strokes].sort((a, b) => a.zIndex - b.zIndex);
    const backStrokes = ordered.filter((s) => !s.front);
    const frontStrokes = ordered.filter((s) => s.front);

    // Ein einzelner Strich (interaktiv) – für Hinter- wie Über-Text-Ebene.
    const renderStroke = (s: ChalkStroke) => (
      <g key={s.id}
        opacity={s.opacity}
        transform={`translate(${s.offsetX} ${s.offsetY})`}
        style={{ cursor: onStrokePointerDown ? "grab" : "default", pointerEvents: onStrokePointerDown ? "auto" : "none" }}
        onPointerDown={onStrokePointerDown ? (e) => { e.stopPropagation(); onStrokePointerDown(s.id, e); } : undefined}
      >
        <path d={s.svgPath} fill={s.color} />
        {selectedStrokeId === s.id && (
          <path d={s.svgPath} fill="none" stroke="rgba(255,255,255,0.5)"
            strokeWidth={0.5} strokeDasharray="2 1.5" />
        )}
      </g>
    );

    // Eine generierte Hintergrund-Linie (interaktiv) – Hinter- oder Über-Inhalt.
    const renderPattern = (ps: PatternStroke) => (
      <g key={ps.id}
        opacity={ps.opacity}
        transform={`translate(${ps.offsetX ?? 0} ${ps.offsetY ?? 0})`}
        style={{ cursor: onPatternPointerDown ? "grab" : "default", pointerEvents: onPatternPointerDown ? "auto" : "none" }}
        onPointerDown={onPatternPointerDown ? (e) => { e.stopPropagation(); onPatternPointerDown(ps.id, e); } : undefined}
      >
        <path d={ps.svgPath} fill={fillColor} />
        {selectedPatternId === ps.id && (
          <path d={ps.svgPath} fill="none" stroke="rgba(255,255,255,0.5)"
            strokeWidth={0.5} strokeDasharray="2 1.5" />
        )}
      </g>
    );

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

          {!patternFront && patternStrokes.map(renderPattern)}

          {backStrokes.map(renderStroke)}
        </svg>

        {/* Live-Strich auf eigenem Canvas: dessen Aktualisierung rastert NIE die
            darunterliegenden schweren SVG-Pfade neu (anders als ein Live-Pfad im
            selben SVG) → flüssiges Zeichnen auch auf vollem Poster. */}
        <canvas
          ref={liveCanvasRef}
          width={Math.max(1, Math.round(displayW))}
          height={Math.max(1, Math.round(displayH))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}
        />

        {/* Interactive overlay: text, assets, handles, draw capture */}
        <div
          className={styles.overlayLayer}
          style={{ zIndex: 2, pointerEvents: "none" }}
        >
          {children}

          {/* „Über-Inhalt"-Ebene – über Text & Illustrationen, aber unter den
              Bearbeitungs-Griffen. Leere Flächen lassen Klicks durch. Enthält
              die Über-Text-Striche und (optional) die generierten Linien. */}
          {(frontStrokes.length > 0 || (patternFront && patternStrokes.length > 0)) && (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                overflow: "visible", zIndex: 50, pointerEvents: "none",
              }}
            >
              {patternFront && patternStrokes.map(renderPattern)}
              {frontStrokes.map(renderStroke)}
            </svg>
          )}
        </div>
      </div>
    );
  }
);
