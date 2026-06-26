import { useMemo } from "react";
import type { ToolMode } from "../../types/poster";
import { getAllBrushes, brushPreviewPath } from "../../lib/brushStrokes";
import { useT } from "../../i18n";

export const CHALK_COLORS = [
  { label: "Weiß", hex: "#FFFFFF" },
  { label: "Schwarz", hex: "#000000" },
];

const ALL_BRUSHES = getAllBrushes();

const DIVIDER: React.CSSProperties = {
  alignSelf: "stretch", width: 1, background: "rgba(255,255,255,0.12)",
};

interface DrawingToolbarProps {
  mode: ToolMode; setMode: (m: ToolMode) => void;
  chalkColor: string; setChalkColor: (hex: string) => void;
  brushName: string; setBrushName: (n: string) => void;
  brushWidth: number; setBrushWidth: (v: number) => void;
  brushOpacity: number; setBrushOpacity: (v: number) => void;
  onUndo: () => void; canUndo: boolean;
  onRedo: () => void; canRedo: boolean;
}

export function DrawingToolbar({
  mode, setMode, chalkColor, setChalkColor,
  brushName, setBrushName, brushWidth, setBrushWidth,
  brushOpacity, setBrushOpacity,
  onUndo, canUndo, onRedo, canRedo,
}: DrawingToolbarProps) {
  const isDraw = mode === "draw";
  const { t } = useT();
  const previews = useMemo(() => ALL_BRUSHES.map((b) => ({
    name: b.name, label: b.name.replace("Figma ", ""), path: brushPreviewPath(b.name, 1),
  })), []);

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 6,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#ddd", fontSize: 16, cursor: "pointer", flexShrink: 0,
  };

  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(20,20,20,0.92)", backdropFilter: "blur(12px)",
      borderRadius: 10, padding: "8px 14px",
      border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      zIndex: 50, maxWidth: "calc(100vw - 32px)",
    }}>
      <button onClick={() => setMode(isDraw ? "move" : "draw")}
        style={{
          display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 12px", borderRadius: 6,
          background: isDraw ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.06)",
          border: isDraw ? "2px solid #fff" : "2px solid rgba(255,255,255,0.12)",
          color: isDraw ? "#1e1e1e" : "#ddd", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
        }}>
        ✏️ {isDraw ? t.drawOn : t.drawOff}
      </button>
      {isDraw && <div style={DIVIDER} />}
      {isDraw && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[{ label: "Weiß", hex: "#FFFFFF" }, { label: "Schwarz", hex: "#000000" }].map((c) => (
            <button key={c.hex} data-no-chalk
              onClick={() => setChalkColor(c.hex)}
              style={{ width: 20, height: 20, borderRadius: "50%", background: c.hex, padding: 0, cursor: "pointer", flexShrink: 0,
                border: chalkColor === c.hex ? "2px solid #fff" : "2px solid rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      )}
      {isDraw && <div style={DIVIDER} />}
      {isDraw && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#aaa", fontSize: 12, minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(brushWidth * 100)}%
            </span>
            <input type="range" min={1} max={100} step={1} value={Math.round(brushWidth * 100)}
              onChange={(e) => setBrushWidth(Number(e.target.value) / 100)}
              style={{ width: 80, accentColor: "#fff", height: 4, cursor: "pointer" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#aaa", fontSize: 12, minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(brushOpacity * 100)}%
            </span>
            <input type="range" min={20} max={100} value={Math.round(brushOpacity * 100)}
              onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
              style={{ width: 80, accentColor: "#fff", height: 4, cursor: "pointer" }} />
          </div>
        </div>
      )}
      {isDraw && <div style={DIVIDER} />}
      {isDraw && (
        <div style={{ display: "flex", gap: 5, alignItems: "center", overflowX: "auto", maxWidth: 420 }}>
          {previews.map((b) => {
            const active = brushName === b.name;
            return (
              <button key={b.name} onClick={() => setBrushName(b.name)} title={b.name}
                style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "3px 5px", borderRadius: 6, cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.14)" : "transparent",
                  border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
                }}>
                <svg viewBox="0 0 100 100" style={{ width: 44, height: 22, display: "block" }}>
                  <path d={b.path} fill={active ? "#fff" : "#777"} />
                </svg>
                <span style={{ color: active ? "#fff" : "#555", fontSize: 9, whiteSpace: "nowrap" }}>{b.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {isDraw && <div style={DIVIDER} />}
      <button onClick={onUndo} disabled={!canUndo} title="Rückgängig"
        style={{ ...btnBase, cursor: canUndo ? "pointer" : "not-allowed", opacity: canUndo ? 1 : 0.4 }}>↩</button>
      <button onClick={onRedo} disabled={!canRedo} title="Wiederholen"
        style={{ ...btnBase, cursor: canRedo ? "pointer" : "not-allowed", opacity: canRedo ? 1 : 0.4 }}>↪</button>
    </div>
  );
}
