import { useState } from "react";
import type { PatternConfig, PosterSize } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

interface FontOption {
  label: string;
  value: string;
}

export interface TextFieldState {
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
  color?: string;
  setColor?: (v: string) => void;
  // Umriss-Stil: hohle Buchstaben mit Kontur (wie der Referenz-Titel)
  outline?: boolean;
  setOutline?: (v: boolean) => void;
}

const TEXT_COLORS = [
  { label: "Weiß", hex: "#ffffff" },
  { label: "Schwarz", hex: "#000000" },
];

const BG_COLORS = [
  { label: "Schwarz", hex: "#000000" },
  { label: "Weiß", hex: "#ffffff" },
];

interface SidebarProps {
  fonts: FontOption[];
  sizes: PosterSize[];
  posterSizeIndex: number;
  setPosterSizeIndex: (v: number) => void;

  // Hintergrundfarbe (Tafel/Papier)
  bg: string;
  setBg: (hex: string) => void;

  // Kreide-Muster (Hintergrund)
  pattern: PatternConfig;
  setPattern: (patch: Partial<PatternConfig>) => void;
  onRegenerate: () => void; // neuer Seed → neues Muster (entsperrt)
  onAddLines: () => void; // weitere Linien an aktuelles Muster anhängen
  patternLocked: boolean; // Muster gespeichert/eingefroren?
  onToggleLock: () => void;
  // Pattern-Selbstzeichen-Animation
  isPlaying: boolean;
  onTogglePlay: () => void;
  animDuration: number;
  setAnimDuration: (v: number) => void;

  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  layoutSection: React.ReactNode;

  header: TextFieldState;
  sub: TextFieldState;
  body: TextFieldState;
  detail: TextFieldState;

  assetSection: React.ReactNode;

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
  // Einheitliche Anzeige: Nachkomma-Slider (step < 1) immer mit 2 Stellen,
  // ganzzahlige gerundet — sonst zeigt z. B. Spread „0.6500000000001".
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

function TextSection({ fonts, field }: { fonts: FontOption[]; field: TextFieldState }) {
  return (
    <>
      <div className={styles.field}>
        <span className={styles.label}>Text</span>
        {field.multiline ? (
          <textarea
            className={styles.textarea}
            value={field.text}
            rows={3}
            onChange={(e) => field.setText(e.target.value)}
          />
        ) : (
          <input
            className={styles.input}
            value={field.text}
            onChange={(e) => field.setText(e.target.value)}
          />
        )}
      </div>
      <Select
        label="Schriftart"
        value={field.font}
        options={fonts}
        onChange={field.setFont}
      />
      <Slider
        label="Größe"
        value={field.size}
        min={field.sizeMin}
        max={field.sizeMax}
        onChange={field.setSize}
      />
      {field.setColor && (
        <div className={styles.field}>
          <span className={styles.label}>Farbe</span>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {TEXT_COLORS.map((c) => {
              const isBlack = c.hex === "#000000";
              const curBlack = (field.color ?? "#e0e0e0") === "#000000";
              const active = isBlack ? curBlack : !curBlack;
              return (
                <button
                  key={c.hex}
                  title={c.label}
                  data-no-chalk
                  onClick={() => field.setColor?.(c.hex)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: c.hex,
                    border: active
                      ? "2px solid #fff"
                      : "2px solid rgba(255,255,255,0.25)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
      {field.setWeight && (
        <Select
          label="Gewicht"
          value={field.weight ?? "400"}
          options={[
            { label: "Normal", value: "400" },
            { label: "Bold", value: "700" },
            { label: "Black", value: "900" },
          ]}
          onChange={field.setWeight}
        />
      )}
      {field.setOutline && (
        <div className={styles.field}>
          <span className={styles.label}>Stil</span>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[
              { label: "Gefüllt", val: false },
              { label: "Umriss", val: true },
            ].map((o) => {
              const active = (field.outline ?? false) === o.val;
              return (
                <button
                  key={o.label}
                  onClick={() => field.setOutline?.(o.val)}
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
      )}
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState<string>("layout");
  const toggle = (key: string) => setOpen((o) => (o === key ? "" : key));

  return (
    <aside className={styles.sidebar}>
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
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}
      >
        Alles neu generieren
      </button>

      {/* Werkzeug-Umschalter & Freihand-Regler leben jetzt komplett in der
          schwebenden Bar über dem Poster (siehe DrawingToolbar). */}

      <div className={styles.sidebarScroll}>
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
          <div className={styles.field}>
            <span className={styles.label}>Hintergrund</span>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {BG_COLORS.map((c) => {
                const active = props.bg.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    title={c.label}
                    data-no-chalk
                    onClick={() => props.setBg(c.hex)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: c.hex,
                      border: active
                        ? "2px solid #fff"
                        : "2px solid rgba(255,255,255,0.25)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
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
          title="Illustrationen & Logos"
          isOpen={open === "assets"}
          onToggle={() => toggle("assets")}
        >
          {props.assetSection}
        </Section>

        <Section
          title="Überschrift"
          isOpen={open === "header"}
          onToggle={() => toggle("header")}
        >
          <TextSection fonts={props.fonts} field={props.header} />
        </Section>

        <Section
          title="Untertitel"
          isOpen={open === "sub"}
          onToggle={() => toggle("sub")}
        >
          <TextSection fonts={props.fonts} field={props.sub} />
        </Section>

        <Section
          title="Fließtext"
          isOpen={open === "body"}
          onToggle={() => toggle("body")}
        >
          <TextSection fonts={props.fonts} field={props.body} />
        </Section>

        <Section
          title="Details"
          isOpen={open === "detail"}
          onToggle={() => toggle("detail")}
        >
          <TextSection fonts={props.fonts} field={props.detail} />
        </Section>
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.assetButtonRow}>
          <button
            className={styles.smallButton}
            onClick={props.onUndo}
            disabled={!props.canUndo}
          >
            ↶ Rückgängig
          </button>
          <button
            className={styles.smallButton}
            onClick={props.onRedo}
            disabled={!props.canRedo}
          >
            ↷ Wiederholen
          </button>
        </div>
        <button className={styles.exportButton} onClick={props.onExport}>
          Export PNG
        </button>
      </div>
    </aside>
  );
}
