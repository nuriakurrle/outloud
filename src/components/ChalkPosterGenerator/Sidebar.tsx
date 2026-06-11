import { useState } from "react";
import type {
  BorderConfig,
  DividerStyle,
  PatternConfig,
  PosterSize,
} from "../../types/poster";
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
}

interface SidebarProps {
  fonts: FontOption[];
  sizes: PosterSize[];
  posterSizeIndex: number;
  setPosterSizeIndex: (v: number) => void;

  patternStyle: PatternConfig["style"];
  setPatternStyle: (v: PatternConfig["style"]) => void;
  patternDensity: number;
  setPatternDensity: (v: number) => void;
  patternStroke: number;
  setPatternStroke: (v: number) => void;
  patternOpacity: number;
  setPatternOpacity: (v: number) => void;
  onRegenerate: () => void;

  borderStyle: BorderConfig["style"];
  setBorderStyle: (v: BorderConfig["style"]) => void;
  borderWeight: number;
  setBorderWeight: (v: number) => void;
  dividerStyle: DividerStyle["style"];
  setDividerStyle: (v: DividerStyle["style"]) => void;

  header: TextFieldState;
  sub: TextFieldState;
  body: TextFieldState;
  detail: TextFieldState;

  assetSection: React.ReactNode;

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
  return (
    <div className={styles.field}>
      <div className={styles.sliderRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.sliderValue}>
          {value}
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
    </>
  );
}

const PATTERN_OPTIONS = [
  { label: "Fließend", value: "flowing" },
  { label: "Wirbel", value: "swirls" },
  { label: "Topografie", value: "topo" },
  { label: "Gestreut", value: "scattered" },
  { label: "Keins", value: "none" },
];

const BORDER_OPTIONS = [
  { label: "Gestrichelt", value: "dashed" },
  { label: "Doppelt", value: "double" },
  { label: "Ornament", value: "ornament" },
  { label: "Kreide", value: "chalk" },
  { label: "Keiner", value: "none" },
];

const DIVIDER_OPTIONS = [
  { label: "Linie", value: "line" },
  { label: "Doppellinie", value: "doubleline" },
  { label: "Punkte", value: "dots" },
  { label: "Ornament", value: "ornament" },
  { label: "Keiner", value: "none" },
];

export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState<string>("pattern");
  const toggle = (key: string) => setOpen((o) => (o === key ? "" : key));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h1 className={styles.sidebarTitle}>Kreide-Poster</h1>
        <p className={styles.sidebarSubtitle}>Generator · weiß auf Tafel</p>
      </div>

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
        </Section>

        <Section
          title="Kreide-Muster"
          isOpen={open === "pattern"}
          onToggle={() => toggle("pattern")}
        >
          <Select
            label="Stil"
            value={props.patternStyle}
            options={PATTERN_OPTIONS}
            onChange={(v) =>
              props.setPatternStyle(v as PatternConfig["style"])
            }
          />
          <Slider
            label="Dichte"
            value={props.patternDensity}
            min={0}
            max={100}
            onChange={props.setPatternDensity}
          />
          <Slider
            label="Strichstärke"
            value={props.patternStroke}
            min={1}
            max={8}
            step={0.5}
            onChange={props.setPatternStroke}
          />
          <Slider
            label="Deckkraft"
            value={props.patternOpacity}
            min={5}
            max={100}
            suffix="%"
            onChange={props.setPatternOpacity}
          />
          <button className={styles.regenButton} onClick={props.onRegenerate}>
            ↻ Neues Muster erzeugen
          </button>
        </Section>

        <Section
          title="Rahmen & Trenner"
          isOpen={open === "border"}
          onToggle={() => toggle("border")}
        >
          <Select
            label="Rahmenstil"
            value={props.borderStyle}
            options={BORDER_OPTIONS}
            onChange={(v) => props.setBorderStyle(v as BorderConfig["style"])}
          />
          <Slider
            label="Rahmenstärke"
            value={props.borderWeight}
            min={1}
            max={5}
            onChange={props.setBorderWeight}
          />
          <Select
            label="Trennerstil"
            value={props.dividerStyle}
            options={DIVIDER_OPTIONS}
            onChange={(v) => props.setDividerStyle(v as DividerStyle["style"])}
          />
          <p className={styles.hint}>Trenner ist auf dem Poster verschiebbar ↕</p>
        </Section>

        <Section
          title="Logos"
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
        <button className={styles.exportButton} onClick={props.onExport}>
          Export PNG
        </button>
      </div>
    </aside>
  );
}
