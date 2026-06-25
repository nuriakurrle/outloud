import type { TextFieldState } from "./Sidebar";
import type { Align } from "../../lib/layouts";
import styles from "../../styles/chalkPoster.module.css";

interface TextPopupProps {
  field: TextFieldState;
  align: Align;
  onAlignChange: (a: Align) => void;
  position: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  fonts: { label: string; value: string }[];
  onClose: () => void;
}

const PANEL_W = 280;

export function TextPopup({
  field,
  align,
  onAlignChange,
  position,
  containerRef,
  fonts,
  onClose,
}: TextPopupProps) {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return null;

  // Convert poster-% position to screen coords
  const screenX = rect.left + (position.x / 100) * rect.width;
  const screenY = rect.top + (position.y / 100) * rect.height;

  // Place panel above the text element, centred horizontally
  const panelH = 200;
  const left = Math.max(10, Math.min(screenX - PANEL_W / 2, window.innerWidth - PANEL_W - 10));
  const top = Math.max(10, screenY - panelH - 16);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "5px 0",
    borderRadius: 5,
    background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
    border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.12)",
    color: "#f5f2ed",
    fontSize: 14,
    cursor: "pointer",
  });

  return (
    <div
      data-no-chalk
      style={{
        position: "fixed",
        left,
        top,
        width: PANEL_W,
        background: "rgba(22,22,24,0.96)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "12px 14px",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 6px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          background: "none",
          border: "none",
          color: "#888",
          fontSize: 16,
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>

      {/* Text input */}
      <div className={styles.field}>
        {field.multiline ? (
          <textarea
            className={styles.textarea}
            value={field.text}
            rows={2}
            onChange={(e) => field.setText(e.target.value)}
            style={{ fontSize: 13 }}
          />
        ) : (
          <input
            className={styles.input}
            value={field.text}
            onChange={(e) => field.setText(e.target.value)}
            style={{ fontSize: 13 }}
          />
        )}
      </div>

      {/* Alignment */}
      <div style={{ display: "flex", gap: 5 }}>
        {(["left", "center", "right"] as Align[]).map((a) => (
          <button key={a} onClick={() => onAlignChange(a)} style={btnStyle(align === a)}>
            {a === "left" ? "←" : a === "center" ? "↔" : "→"}
          </button>
        ))}
      </div>

      {/* Font select */}
      <select
        className={styles.select}
        value={field.font}
        onChange={(e) => field.setFont(e.target.value)}
        style={{ fontSize: 13 }}
      >
        {fonts.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Size slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#888", fontSize: 12, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {field.size}
        </span>
        <input
          type="range"
          min={field.sizeMin}
          max={field.sizeMax}
          value={field.size}
          onChange={(e) => field.setSize(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#fff", cursor: "pointer" }}
        />
      </div>

      {/* Weight */}
      {field.setWeight && (
        <select
          className={styles.select}
          value={field.weight ?? "400"}
          onChange={(e) => field.setWeight!(e.target.value)}
          style={{ fontSize: 13 }}
        >
          <option value="400">Normal</option>
          <option value="700">Bold</option>
          <option value="900">Black</option>
        </select>
      )}

      {/* Outline toggle */}
      {field.setOutline && (
        <div style={{ display: "flex", gap: 5 }}>
          {[{ label: "Gefüllt", val: false }, { label: "Umriss", val: true }].map((o) => (
            <button
              key={o.label}
              onClick={() => field.setOutline!(o.val)}
              style={btnStyle((field.outline ?? false) === o.val)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
