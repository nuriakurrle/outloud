import { useMemo } from "react";
import { Pencil, Undo2, Redo2 } from "lucide-react";
import type { ToolMode } from "../../types/poster";
import { getAllBrushes, brushPreviewPath } from "../../lib/brushStrokes";
import { useT } from "../../i18n";
import styles from "../../styles/chalkPoster.module.css";

export const CHALK_COLORS = [
  { label: "Weiß", hex: "#FFFFFF" },
  { label: "Schwarz", hex: "#000000" },
];

const ALL_BRUSHES = getAllBrushes();

const DIVIDER: React.CSSProperties = {
  alignSelf: "stretch", width: 1, background: "var(--border-subtle)",
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
    width: 32, height: 32, borderRadius: "var(--radius-md)",
    background: "var(--state-inactive-bg)", border: "1px solid var(--border-subtle)",
    color: "var(--text-body)", fontSize: 16, cursor: "pointer", flexShrink: 0,
  };

  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
      borderRadius: "var(--radius-xl)", padding: "8px 14px",
      border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-float)",
      zIndex: 50, maxWidth: "calc(100vw - 32px)",
    }}>
      <button onClick={() => setMode(isDraw ? "move" : "draw")}
        style={{
          display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 12px", borderRadius: "var(--radius-md)",
          background: isDraw ? "var(--btn-primary-bg)" : "var(--state-inactive-bg)",
          border: isDraw ? "2px solid var(--white)" : "2px solid var(--border-subtle)",
          color: isDraw ? "var(--btn-primary-text)" : "var(--text-body)",
          fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
        }}>
        <Pencil size={16}/> {isDraw ? t.drawOn : t.drawOff}
      </button>

      {isDraw && <div style={DIVIDER} />}
      {isDraw && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {CHALK_COLORS.map((c) => (
            <button key={c.hex} data-no-chalk onClick={() => setChalkColor(c.hex)}
              style={{
                width: 20, height: 20, borderRadius: "50%", background: c.hex, padding: 0, cursor: "pointer", flexShrink: 0,
                border: chalkColor === c.hex ? "2px solid var(--white)" : "2px solid var(--border-strong)",
              }} />
          ))}
        </div>
      )}

      {isDraw && <div style={DIVIDER} />}
      {isDraw && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 12, minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(brushWidth * 100)}%
            </span>
            <input type="range" min={1} max={100} step={1} value={Math.round(brushWidth * 100)}
              onChange={(e) => setBrushWidth(Number(e.target.value) / 100)}
              style={{ width: 80, accentColor: "var(--white)", height: 4, cursor: "pointer" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 12, minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(brushOpacity * 100)}%
            </span>
            <input type="range" min={20} max={100} value={Math.round(brushOpacity * 100)}
              onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
              style={{ width: 80, accentColor: "var(--white)", height: 4, cursor: "pointer" }} />
          </div>
        </div>
      )}

      {isDraw && <div style={DIVIDER} />}
      {isDraw && (
        <div className={styles.brushScroll} style={{ display: "flex", gap: 5, alignItems: "center", overflowX: "auto", maxWidth: 420 }}>
          {previews.map((b) => {
            const active = brushName === b.name;
            return (
              <button key={b.name} onClick={() => setBrushName(b.name)} title={b.name}
                style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "3px 5px", borderRadius: "var(--radius-md)", cursor: "pointer",
                  background: active ? "var(--state-active-bg)" : "transparent",
                  border: active ? "1px solid var(--state-active-border)" : "1px solid transparent",
                }}>
                <svg viewBox="0 0 100 100" style={{ width: 44, height: 22, display: "block" }}>
                  <path d={b.path} fill={active ? "var(--white)" : "var(--text-secondary)"} />
                </svg>
                <span style={{ color: active ? "var(--text-primary)" : "var(--text-muted)", fontSize: 9, whiteSpace: "nowrap" }}>
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isDraw && <div style={DIVIDER} />}
      <button onClick={onUndo} disabled={!canUndo} title="Rückgängig"
        style={{ ...btnBase, cursor: canUndo ? "pointer" : "not-allowed", opacity: canUndo ? 1 : 0.4 }}><Undo2 size={16}/></button>
      <button onClick={onRedo} disabled={!canRedo} title="Wiederholen"
        style={{ ...btnBase, cursor: canRedo ? "pointer" : "not-allowed", opacity: canRedo ? 1 : 0.4 }}><Redo2 size={16}/></button>
    </div>
  );
}
