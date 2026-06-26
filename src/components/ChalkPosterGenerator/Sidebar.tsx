import { useState } from "react";
import { useT } from "../../i18n";
import type { PatternConfig, PosterSize } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";export interface TextFieldState {
  text: string;
  setText: (v: string) => void;
  font: string;
  setFont: (v: string) => void;
  size: number;
  setSize: (v: number) => void;
  sizeMin: number;
  sizeMax: number;
  multiline?: boolean;
  weight?: string;
  setWeight?: (v: string) => void;
  // Umriss-Stil: hohle Buchstaben mit Kontur (wie der Referenz-Titel)
  outline?: boolean;
  setOutline?: (v: boolean) => void;
}

interface SidebarProps {
  sizes: PosterSize[];
  posterSizeIndex: number;
  setPosterSizeIndex: (v: number) => void;

  // Invertiert: Schwarz auf Weiß statt Weiß auf Schwarz
  inverted: boolean;
  onInvert: () => void;

  pattern: PatternConfig;
  setPattern: (patch: Partial<PatternConfig>) => void;
  onRegenerate: () => void;
  brushNames: string[];

  layoutSection: React.ReactNode;

  logoSection: React.ReactNode;
  illustrationSection: React.ReactNode;
  textPanel?: React.ReactNode;
  strokePanel?: React.ReactNode;
  onAddText?: () => void;

  onRandomize: () => void;
  onExport: () => void;
}

// ── kleine Hilfs-Komponenten ─────────────────────────────
function Section({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <button className={styles.sectionButton} onClick={onToggle}>
        <span>{title}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ""}`}>
          ▶
        </span>
      </button>
      {isOpen && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const display = format ? format(value) : step < 1 ? value.toFixed(2) : `${Math.round(value)}`;
  return (
    <div className={styles.field}>
      <div className={styles.sliderRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.sliderValue}>
          {display}
          {suffix}
        </span>
      </div>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState<string>("layout");
  const toggle = (key: string) => setOpen((o) => (o === key ? "" : key));
  const { t } = useT();

  return (
    <aside className={styles.sidebar}>
      {/* Invert toggle — above "Alles neu generieren" */}
      <button
        onClick={props.onInvert}
        style={{
          margin: "0 12px 6px",
          padding: "10px 12px",
          background: props.inverted ? "#ffffff" : "#000",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 8,
          color: props.inverted ? "#000" : "#FFF",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
          width: "calc(100% - 24px)",
        }}
      >
        {props.inverted ? t.invertLight : t.invertDark}
      </button>

      <div className={styles.sidebarScroll}>
        {(props.textPanel || props.strokePanel) && (
          <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid #2a2a2a" }}>
            {props.textPanel ?? props.strokePanel}
          </div>
        )}
        {props.onAddText && (
          <div style={{ padding: "8px 12px 0" }}>
            <button onClick={props.onAddText}
              style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)",
                border: "1px dashed rgba(255,255,255,0.25)", borderRadius: 7,
                color: "#ccc", fontSize: 14, cursor: "pointer", letterSpacing: "0.02em" }}>
              {t.addText}
            </button>
          </div>
        )}

        <Section title={t.sectionSize} isOpen={open === "size"} onToggle={() => toggle("size")}>
          <Select label={t.format} value={String(props.posterSizeIndex)}
            options={props.sizes.map((s, i) => ({ label: `${s.label} (${s.w}×${s.h})`, value: String(i) }))}
            onChange={(v) => props.setPosterSizeIndex(Number(v))} />
        </Section>

        <Section title={t.sectionLayout} isOpen={open === "layout"} onToggle={() => toggle("layout")}>
          {props.layoutSection}
        </Section>

        <Section title={t.sectionPattern} isOpen={open === "pattern"} onToggle={() => toggle("pattern")}>
          <Select label={t.patternType} value={props.pattern.patternType}
            options={[
              { label: t.patternLines, value: "lines" },
              { label: t.patternWavy, value: "wavy" },
              { label: t.patternGrid, value: "grid" },
            ]}
            onChange={(v) => props.setPattern({ patternType: v as "lines" | "wavy" | "grid" })} />
          <div className={styles.field}>
            <span className={styles.label}>{t.brush}</span>
            <select className={styles.select} value={props.pattern.brushName}
              onChange={(e) => props.setPattern({ brushName: e.target.value })}>
              {props.brushNames.map((n) => <option key={n} value={n}>{n.replace("Figma ", "")}</option>)}
            </select>
          </div>
          <Slider label={t.strokes} value={props.pattern.count} min={1} max={20}
            onChange={(v) => props.setPattern({ count: v })} />
          <Slider label={t.strength} value={props.pattern.strokeWidth} min={0.01} max={1} step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => props.setPattern({ strokeWidth: v })} />
          <Slider label={t.opacity} value={props.pattern.opacity} min={10} max={100} suffix="%"
            onChange={(v) => props.setPattern({ opacity: v })} />
          <div className={styles.field}>
            <span className={styles.label}>{t.color}</span>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {(["white", "black"] as const).map((val) => {
                const active = props.pattern.color === val;
                return (
                  <button key={val} onClick={() => props.setPattern({ color: val })}
                    style={{ flex: 1, padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                      background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)",
                      border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
                      color: "#f5f2ed", fontSize: 13 }}>
                    {val === "white" ? t.colorWhite : t.colorBlack}
                  </button>
                );
              })}
            </div>
          </div>
          <button className={styles.regenButton} onClick={props.onRegenerate}>{t.regenerate}</button>
        </Section>

        <Section title={t.sectionLogos} isOpen={open === "logos"} onToggle={() => toggle("logos")}>
          {props.logoSection}
        </Section>

        <Section title={t.sectionIllustrations} isOpen={open === "illustrations"} onToggle={() => toggle("illustrations")}>
          {props.illustrationSection}
        </Section>
      </div>

      <div className={styles.sidebarFooter}>
        <button className={styles.exportButton} onClick={props.onExport}>{t.exportPng}</button>
      </div>
    </aside>
  );
}
