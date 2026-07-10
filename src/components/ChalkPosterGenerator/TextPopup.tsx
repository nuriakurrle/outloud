import { AlignLeft, AlignCenter, AlignRight, Trash2, X } from "lucide-react";
import type { TextFieldState } from "./Sidebar";
import type { Align } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";
import { useT } from "../../i18n";

interface TextPopupProps {
  field: TextFieldState;
  align: Align;
  onAlignChange: (a: Align) => void;
  fonts: { label: string; value: string }[];
  onClose: () => void;
  onDelete?: () => void;
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: "5px 0", borderRadius: 5, cursor: "pointer",
  background: active ? "var(--state-active-bg)" : "var(--state-inactive-bg)",
  border: active ? "1px solid var(--state-active-border)" : "1px solid var(--state-inactive-border)",
  color: "var(--text-primary)", fontSize: 14,
});

const ALIGN_ICONS = { left: <AlignLeft size={14}/>, center: <AlignCenter size={14}/>, right: <AlignRight size={14}/> };

export function TextPopup({ field, align, onAlignChange, fonts, onClose, onDelete }: TextPopupProps) {
  const { t } = useT();
  return (
    <div data-no-chalk style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t.editText}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {onDelete && (
            <button onClick={onDelete} style={{ background: "none", border: "none", color: "var(--btn-danger-text)", cursor: "pointer", padding: 0, display: "flex" }}><Trash2 size={16}/></button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 0, display: "flex" }}><X size={16}/></button>
        </div>
      </div>

      {field.multiline ? (
        <textarea className={styles.textarea} value={field.text} rows={2} onChange={(e) => field.setText(e.target.value)} />
      ) : (
        <input className={styles.input} value={field.text} onChange={(e) => field.setText(e.target.value)} />
      )}

      <div style={{ display: "flex", gap: 5 }}>
        {(["left", "center", "right"] as Align[]).map((a) => (
          <button key={a} onClick={() => onAlignChange(a)} style={{ ...btnStyle(align === a), display: "flex", alignItems: "center", justifyContent: "center" }}>
            {ALIGN_ICONS[a]}
          </button>
        ))}
      </div>

      <select className={styles.select} value={field.font} onChange={(e) => field.setFont(e.target.value)}>
        {fonts.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 13, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{field.size}</span>
        <input type="range" min={field.sizeMin} max={field.sizeMax} value={field.size}
          onChange={(e) => field.setSize(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--white)", cursor: "pointer" }} />
      </div>

      {field.setWeight && (
        <select className={styles.select} value={field.weight ?? "400"} onChange={(e) => field.setWeight!(e.target.value)}>
          <option value="400">{t.wNormal}</option>
          <option value="700">{t.wBold}</option>
          <option value="900">{t.wBlack}</option>
        </select>
      )}

      {field.setOutline && (
        <div style={{ display: "flex", gap: 5 }}>
          {[{ label: t.filled, val: false }, { label: t.outline, val: true }].map((o) => (
            <button key={o.label} onClick={() => field.setOutline!(o.val)} style={btnStyle((field.outline ?? false) === o.val)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
