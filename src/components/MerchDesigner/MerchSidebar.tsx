import { useState } from "react";
import styles from "../../styles/chalkPoster.module.css";
import { useT } from "../../i18n";
import { MERCH_ITEMS, type MerchProduct } from "./constants";
import { MarginPanel } from "../DesignerBase/MarginPanel";

interface MerchSidebarProps {
  product: MerchProduct;
  onProductChange: (p: MerchProduct) => void;
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
  background: active ? "var(--state-active-bg)" : "var(--state-inactive-bg)",
  border: active ? "1px solid var(--state-active-border)" : "1px solid var(--state-inactive-border)",
  color: "var(--text-primary)", fontSize: 13,
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
            {MERCH_ITEMS.map(item => {
              const active = props.product === item.id;
              return (
                <button key={item.id} onClick={() => props.onProductChange(item.id)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 8, cursor: "pointer",
                  background: active ? "#fff" : "rgba(255,255,255,0.12)",
                  border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.4)",
                  color: active ? "#111" : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                }}>
                  {item.label}
                </button>
              );
            })}
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
          <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            {props.textPanel}
          </div>
        )}

        {/* Add text */}
        {props.onAddText && (
          <div style={{ padding: "8px 12px 0" }}>
            <button onClick={props.onAddText} style={{
              width: "100%", padding: "8px 12px", background: "var(--state-inactive-bg)",
              border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-lg)",
              color: "var(--text-body)", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>
              {t.addText}
            </button>
          </div>
        )}

        {/* Selected stroke panel */}
        {props.strokePanel && !props.textPanel && (
          <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            {props.strokePanel}
          </div>
        )}

        <Section title={t.sectionIllustrations} isOpen={open === "illustrations"} onToggle={() => toggle("illustrations")}>
          {props.illustrationSection}
        </Section>

        <Section title="Margins %" isOpen={open === "margins"} onToggle={() => toggle("margins")}>
          <MarginPanel />
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
