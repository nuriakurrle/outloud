import { useState } from "react";
import styles from "../../styles/chalkPoster.module.css";
import { useT } from "../../i18n";
import { MERCH_ITEMS } from "./constants";

interface MerchSidebarProps {
  shirtColor: "black" | "white";
  onColorChange: (c: "black" | "white") => void;
  textPanel?: React.ReactNode;
  strokePanel?: React.ReactNode;
  onAddText?: () => void;
  logoSection: React.ReactNode;
  illustrationSection: React.ReactNode;
  onOrder: () => void;
}

function Section({ title, isOpen, onToggle, children }: {
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <button className={styles.sectionButton} onClick={onToggle}>
        <span>{title}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ""}`}>▶</span>
      </button>
      {isOpen && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

const colBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: "5px 8px", borderRadius: 6, cursor: "pointer",
  background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)",
  border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
  color: "#f5f2ed", fontSize: 13,
});

export function MerchSidebar(props: MerchSidebarProps) {
  const [open, setOpen] = useState("illustrations");
  const toggle = (k: string) => setOpen(o => o === k ? "" : k);
  const { t } = useT();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarScroll}>
        {/* Merch item selector */}
        <Section title="Merch" isOpen={open === "merch"} onToggle={() => toggle("merch")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MERCH_ITEMS.map(item => (
              <button key={item.id} style={{
                flex: 1, padding: "10px 8px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.4)",
                color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}>
                {item.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Shirt color */}
        <Section title={t.color} isOpen={open === "color"} onToggle={() => toggle("color")}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["black", "white"] as const).map(c => (
              <button key={c} onClick={() => props.onColorChange(c)} style={colBtn(props.shirtColor === c)}>
                {c === "black" ? t.colorBlack : t.colorWhite}
              </button>
            ))}
          </div>
        </Section>

        {/* Selected text element panel */}
        {props.textPanel && (
          <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid #2a2a2a" }}>
            {props.textPanel}
          </div>
        )}

        {/* Add text */}
        {props.onAddText && (
          <div style={{ padding: "8px 12px 0" }}>
            <button onClick={props.onAddText} style={{
              width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)",
              border: "1px dashed rgba(255,255,255,0.25)", borderRadius: 7,
              color: "#ccc", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>
              {t.addText}
            </button>
          </div>
        )}

        {/* Selected stroke panel */}
        {props.strokePanel && !props.textPanel && (
          <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid #2a2a2a" }}>
            {props.strokePanel}
          </div>
        )}

        <Section title={t.sectionIllustrations} isOpen={open === "illustrations"} onToggle={() => toggle("illustrations")}>
          {props.illustrationSection}
        </Section>

        <Section title={t.sectionLogos} isOpen={open === "logos"} onToggle={() => toggle("logos")}>
          {props.logoSection}
        </Section>
      </div>

      <div className={styles.sidebarFooter}>
        <button className={styles.exportButton} onClick={props.onOrder}>
          {t.order}
        </button>
      </div>
    </aside>
  );
}
