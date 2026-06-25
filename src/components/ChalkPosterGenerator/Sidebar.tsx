import { useState } from "react";
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

  // Kreide-Muster (Hintergrund)
  pattern: PatternConfig;
  setPattern: (patch: Partial<PatternConfig>) => void;
  onRegenerate: () => void;
  onAddLines: () => void;
  patternLocked: boolean;
  onToggleLock: () => void;
  // Pattern-Selbstzeichen-Animation
  isPlaying: boolean;
  onTogglePlay: () => void;
  animDuration: number;
  setAnimDuration: (v: number) => void;

  layoutSection: React.ReactNode;

  logoSection: React.ReactNode;
  illustrationSection: React.ReactNode;
  textPanel?: React.ReactNode;
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const display = step < 1 ? value.toFixed(2) : `${Math.round(value)}`;
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

  return (
    <aside className={styles.sidebar}>
      {/* Invert toggle — above "Alles neu generieren" */}
      <button
        onClick={props.onInvert}
        style={{
          margin: "0 12px 6px",
          padding: "10px 12px",
          background: props.inverted ? "#ffffff" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 8,
          color: props.inverted ? "#111111" : "#f5f2ed",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
          width: "calc(100% - 24px)",
        }}
      >
        {props.inverted ? "Schwarz auf Weiß" : "Weiß auf Schwarz"}
      </button>

      <button
        onClick={props.onRandomize}
        title="Komplett neues Design: Layout, Schriften & Hintergrund-Muster (Text-Inhalte & platzierte Illustrationen bleiben erhalten)"
        style={{
          margin: "0 12px 8px",
          padding: "10px 12px",
          background:
            "linear-gradient(135deg, rgba(245,230,163,0.18), rgba(140,184,212,0.18))",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 8,
          color: "#f5f2ed",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}
      >
        Alles neu generieren
      </button>

      <div className={styles.sidebarScroll}>
        {props.textPanel && (
          <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid #2a2a2a" }}>
            {props.textPanel}
          </div>
        )}
        {props.onAddText && (
          <div style={{ padding: "8px 12px 0" }}>
            <button
              onClick={props.onAddText}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px dashed rgba(255,255,255,0.25)",
                borderRadius: 7,
                color: "#ccc",
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              + Text hinzufügen
            </button>
          </div>
        )}
        <Section
          title="Größe"
          isOpen={open === "size"}
          onToggle={() => toggle("size")}
        >
          <Select
            label="Format"
            value={String(props.posterSizeIndex)}
            options={props.sizes.map((s, i) => ({
              label: `${s.label} (${s.w}×${s.h})`,
              value: String(i),
            }))}
            onChange={(v) => props.setPosterSizeIndex(Number(v))}
          />
        </Section>

        <Section
          title="Layout"
          isOpen={open === "layout"}
          onToggle={() => toggle("layout")}
        >
          {props.layoutSection}
        </Section>

        <Section
          title="Kreide-Muster (Hintergrund)"
          isOpen={open === "pattern"}
          onToggle={() => toggle("pattern")}
        >
          <button
            className={styles.regenButton}
            onClick={props.onRegenerate}
            title="Alle Hintergrund-Linien neu würfeln (entsperrt das Muster)"
          >
            Neue Linien
          </button>
          <div className={styles.assetButtonRow} style={{ marginTop: 8 }}>
            <button
              className={styles.smallButton}
              onClick={props.onAddLines}
              title="Weitere Linien zum aktuellen Muster hinzufügen (Muster bleibt erhalten)"
            >
              Mehr Linien
            </button>
            <button
              className={styles.smallButton}
              onClick={props.onToggleLock}
              title={
                props.patternLocked
                  ? "Muster ist gespeichert – Regler/Würfeln verändern es nicht. Zum Entsperren klicken."
                  : "Muster speichern/einfrieren, damit Regler es nicht überschreiben"
              }
              style={
                props.patternLocked
                  ? { borderColor: "rgba(245,230,163,0.8)", color: "#f5e6a3" }
                  : undefined
              }
            >
              {props.patternLocked ? "Gespeichert" : "Speichern"}
            </button>
          </div>
          <Slider
            label="Striche"
            value={props.pattern.count}
            min={1}
            max={15}
            onChange={(v) => props.setPattern({ count: v })}
          />
          <Slider
            label="Geradheit"
            value={props.pattern.straightness}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => props.setPattern({ straightness: v })}
          />
          <div className={styles.field}>
            <span className={styles.label}>Linienfarbe</span>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {([
                { label: "Weiß", val: "white" as const },
                { label: "Schwarz", val: "black" as const },
              ]).map((o) => {
                const active = props.pattern.color === o.val;
                return (
                  <button
                    key={o.val}
                    onClick={() => props.setPattern({ color: o.val })}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      borderRadius: 6,
                      background: active
                        ? "rgba(255,255,255,0.16)"
                        : "rgba(255,255,255,0.04)",
                      border: active
                        ? "1px solid rgba(255,255,255,0.5)"
                        : "1px solid rgba(255,255,255,0.15)",
                      color: "#f5f2ed",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Slider
            label="Stärke"
            value={props.pattern.weight}
            min={5}
            max={120}
            onChange={(v) => props.setPattern({ weight: v })}
          />
          <Slider
            label="Deckkraft"
            value={props.pattern.opacity}
            min={10}
            max={100}
            suffix="%"
            onChange={(v) => props.setPattern({ opacity: v })}
          />
          <Slider
            label="Richtung"
            value={props.pattern.direction}
            min={0}
            max={360}
            suffix="°"
            onChange={(v) => props.setPattern({ direction: v })}
          />
          <Slider
            label="Spread"
            value={props.pattern.spread}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => props.setPattern({ spread: v })}
          />

          <div className={styles.label} style={{ marginTop: 14 }}>
            Animation
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={styles.regenButton}
              style={{ flex: "0 0 auto", margin: 0 }}
              onClick={props.onTogglePlay}
            >
              {props.isPlaying ? "Stopp" : "Play"}
            </button>
            <div style={{ flex: 1 }}>
              <Slider
                label="Dauer"
                value={props.animDuration}
                min={1}
                max={15}
                suffix="s"
                onChange={props.setAnimDuration}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Logos"
          isOpen={open === "logos"}
          onToggle={() => toggle("logos")}
        >
          {props.logoSection}
        </Section>

        <Section
          title="Illustrationen"
          isOpen={open === "illustrations"}
          onToggle={() => toggle("illustrations")}
        >
          {props.illustrationSection}
        </Section>
      </div>

      <div className={styles.sidebarFooter}>
        <button className={styles.exportButton} onClick={props.onExport}>
          Export PNG
        </button>
      </div>
    </aside>
  );
}
