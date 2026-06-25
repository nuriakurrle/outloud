import { useEffect, useRef } from "react";
import type { DrawBrush, ToolMode } from "../../types/poster";
import { STRETCH_BRUSHES, STRETCH_BRUSH_ORDER } from "../../lib/stretchBrush";
import { renderBrushPreview } from "../../lib/stretchBrushRenderer";

/** Kreide-Farben, die auf schwarzer Tafel gut aussehen (für Asset-Tönung). */
export const CHALK_COLORS = [
  { label: "Weiß", hex: "#FFFFFF" },
  { label: "Gelb", hex: "#f5e6a3" },
  { label: "Rosa", hex: "#e8a0b4" },
  { label: "Blau", hex: "#8cb8d4" },
  { label: "Grün", hex: "#9cc4a0" },
  { label: "Orange", hex: "#e8b87a" },
  { label: "Rot", hex: "#c45c5c" },
  { label: "Lila", hex: "#b89ad4" },
];

/** Zeichen-Farben in der Bar: nur Schwarz & Weiß. */
const DRAW_COLORS = [
  { label: "Weiß", hex: "#FFFFFF" },
  { label: "Schwarz", hex: "#000000" },
];

interface DrawingToolbarProps {
  mode: ToolMode;
  setMode: (m: ToolMode) => void;
  chalkColor: string;
  setChalkColor: (hex: string) => void;
  brushSize: number;
  setBrushSize: (n: number) => void;
  brushOpacity: number;
  setBrushOpacity: (n: number) => void;
  drawBrush: DrawBrush;
  setDrawBrush: (b: DrawBrush) => void;
  isErasing: boolean;
  setIsErasing: (v: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
}

const DIVIDER: React.CSSProperties = {
  alignSelf: "stretch",
  width: 1,
  background: "rgba(255,255,255,0.12)",
};

/** Einzelne Brush-Vorschau — rendert neu, wenn Brush oder Farbe wechselt. */
function BrushPreviewButton({
  brush,
  color,
  active,
  onClick,
}: {
  brush: DrawBrush;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderBrushPreview(ref.current, STRETCH_BRUSHES[brush], color);
  }, [brush, color]);
  return (
    <div
      onClick={onClick}
      title={STRETCH_BRUSHES[brush].label}
      style={{
        cursor: "pointer",
        borderRadius: 5,
        border: active
          ? "2px solid rgba(255,255,255,0.8)"
          : "2px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        transition: "border-color 0.15s",
        flexShrink: 0,
      }}
    >
      <canvas ref={ref} style={{ display: "block" }} />
      <div
        style={{
          fontSize: 9,
          textAlign: "center",
          color: active ? "#e0e0e0" : "#666",
          padding: "2px 0",
          background: "rgba(0,0,0,0.5)",
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
        }}
      >
        {STRETCH_BRUSHES[brush].label}
      </div>
    </div>
  );
}

export function DrawingToolbar({
  mode,
  setMode,
  chalkColor,
  setChalkColor,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  drawBrush,
  setDrawBrush,
  isErasing,
  setIsErasing,
  onUndo,
  canUndo,
}: DrawingToolbarProps) {
  const isDraw = mode === "draw";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(20, 20, 20, 0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        padding: "8px 16px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        zIndex: 50,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {/* Zeichnen-Umschalter: aus = alles direkt mit der Maus beweglich,
          ein = Freihand-Zeichnen. Kein separater „Bewegen"-Knopf nötig. */}
      <button
        onClick={() => setMode(isDraw ? "move" : "draw")}
        title={isDraw ? "Zeichnen aus (zum Bewegen)" : "Zeichnen einschalten"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 12px",
          borderRadius: 6,
          background: isDraw ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.06)",
          border: isDraw ? "2px solid #fff" : "2px solid rgba(255,255,255,0.12)",
          color: isDraw ? "#1e1e1e" : "#ddd",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13 }}>✏️</span>
        {isDraw ? "Zeichnen an" : "Zeichnen"}
      </button>

      {isDraw && <div style={DIVIDER} />}

      {/* Farb-Palette (nur Schwarz & Weiß) + Radiergummi */}
      {isDraw && (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {DRAW_COLORS.map((c) => (
          <button
            key={c.hex}
            data-no-chalk
            onClick={() => {
              setIsErasing(false);
              setChalkColor(c.hex);
            }}
            title={c.label}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: c.hex,
              border:
                !isErasing && chalkColor === c.hex
                  ? "2px solid #fff"
                  : "2px solid rgba(255,255,255,0.25)",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
        <button
          onClick={() => setIsErasing(!isErasing)}
          data-no-chalk
          title="Radiergummi"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 6,
            background: isErasing ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.06)",
            border: isErasing
              ? "2px solid #fff"
              : "2px solid rgba(255,255,255,0.15)",
            color: isErasing ? "#1e1e1e" : "#ddd",
            fontSize: 14,
            lineHeight: 1,
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
            marginLeft: 4,
          }}
        >
          🧽
        </button>
      </div>
      )}

      {isDraw && <div style={DIVIDER} />}

      {/* Strichstärke + Deckkraft */}
      {isDraw && (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              title="Pinselgröße"
              style={{
                color: "#aaa",
                fontSize: 13,
                fontWeight: 600,
                minWidth: 28,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {brushSize}
            </span>
            <input
              type="range"
              min={4}
              max={120}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{
                width: 100,
                accentColor: chalkColor,
                height: 4,
                cursor: "pointer",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              title="Deckkraft"
              style={{
                color: "#aaa",
                fontSize: 13,
                fontWeight: 600,
                minWidth: 34,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round(brushOpacity * 100)}%
            </span>
            <input
              type="range"
              min={20}
              max={100}
              value={Math.round(brushOpacity * 100)}
              onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
              style={{
                width: 90,
                accentColor: chalkColor,
                height: 4,
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      )}

      {isDraw && <div style={DIVIDER} />}

      {/* Brush-Auswahl */}
      {isDraw && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {STRETCH_BRUSH_ORDER.map((brush) => (
            <BrushPreviewButton
              key={brush}
              brush={brush}
              color={chalkColor}
              active={drawBrush === brush}
              onClick={() => setDrawBrush(brush)}
            />
          ))}
        </div>
      )}

      {isDraw && <div style={DIVIDER} />}

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Rückgängig (Strg+Z)"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#ddd",
          fontSize: 16,
          cursor: canUndo ? "pointer" : "not-allowed",
          opacity: canUndo ? 1 : 0.4,
          marginLeft: 4,
          flexShrink: 0,
        }}
      >
        ↩
      </button>
    </div>
  );
}
