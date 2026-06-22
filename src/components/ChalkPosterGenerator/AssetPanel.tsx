import { useRef, useState } from "react";
import type {
  AssetCategory,
  AssetItem,
  PlacedAsset,
} from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";
import { CHALK_COLORS } from "./DrawingToolbar";
import { isMaskAsset } from "../../lib/strokeStamps";

// Formen sollen laut Vorgabe nur Weiß oder Schwarz sein.
const SHAPE_COLORS = [
  { label: "Weiß", hex: "#e8e5e0" },
  { label: "Schwarz", hex: "#000000" },
];

interface AssetPanelProps {
  assets: AssetItem[]; // Registry + hochgeladene Illustrationen
  onPlace: (assetId: string) => void;
  onUpload: (file: File) => void;
  selected: PlacedAsset | null;
  onUpdateSelected: (patch: Partial<PlacedAsset>) => void;
  onDeleteSelected: () => void;
  onLayer: (dir: 1 | -1) => void;
}

const CATEGORY_LABELS: Record<AssetCategory | "all", string> = {
  all: "Alle",
  portraits: "Personen",
  buildings: "Gebäude",
  icons: "Objekte",
  ornaments: "Ornamente",
  logos: "Logos",
  shapes: "Formen",
  strokes: "Striche",
};

function AssetSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.sliderRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.sliderValue}>
          {format ? format(value) : value}
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

export function AssetPanel({
  assets,
  onPlace,
  onUpload,
  selected,
  onUpdateSelected,
  onDeleteSelected,
  onLayer,
}: AssetPanelProps) {
  const selectedAsset = selected
    ? assets.find((a) => a.id === selected.assetId)
    : undefined;

  // Striche & Formen teilen sich den Masken-/Tint-Pfad, brauchen aber leicht
  // andere Beschriftungen und Farb-Paletten.
  const isStroke = selectedAsset?.category === "strokes";
  const isShape = selectedAsset?.category === "shapes";
  const isMaskSel = selectedAsset ? isMaskAsset(selectedAsset.category) : false;
  const tintPalette = isShape ? SHAPE_COLORS : CHALK_COLORS;

  const [filter, setFilter] = useState<AssetCategory | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nur Kategorien anbieten, die tatsächlich Assets enthalten
  const availableCats = Array.from(new Set(assets.map((a) => a.category)));
  const shown =
    filter === "all" ? assets : assets.filter((a) => a.category === filter);

  return (
    <>
      <select
        className={styles.select}
        value={filter}
        onChange={(e) => setFilter(e.target.value as AssetCategory | "all")}
      >
        <option value="all">{CATEGORY_LABELS.all}</option>
        {availableCats.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>

      <div className={styles.assetGrid}>
        {shown.map((a) => (
          <button
            key={a.id}
            className={styles.assetThumb}
            title={a.name}
            onClick={() => onPlace(a.id)}
            // Weiß-auf-transparent → dunkler Hintergrund nötig; Striche zudem
            // über die volle Breite (lange Stamps).
            style={
              a.category === "strokes"
                ? { background: "#1e1e1e", gridColumn: "1 / -1" }
                : a.category === "shapes"
                  ? { background: "#1e1e1e" }
                  : undefined
            }
          >
            <img className={styles.assetThumbImg} src={a.src} alt={a.name} />
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <p className={styles.hint}>Keine Illustrationen in dieser Kategorie.</p>
      )}
      <p className={styles.hint}>Klick = aufs Poster · dann frei verschieben</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <button
        className={styles.regenButton}
        onClick={() => fileInputRef.current?.click()}
      >
        ⬆ SVG/PNG hochladen
      </button>

      {selected && (
        <div className={styles.assetControls}>
          <span className={styles.label}>
            Ausgewählt: {selectedAsset?.name ?? "Element"}
          </span>
          <AssetSlider
            label={isStroke ? "Länge" : "Größe"}
            value={selected.scale}
            min={0.05}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => onUpdateSelected({ scale: v })}
          />
          {isMaskSel && (
            <>
              <AssetSlider
                label={isStroke ? "Stärke" : "Höhe"}
                value={selected.scaleY ?? 1}
                min={0.2}
                max={4}
                step={0.1}
                format={(v) => v.toFixed(1)}
                onChange={(v) => onUpdateSelected({ scaleY: v })}
              />
              <div className={styles.field}>
                <span className={styles.label}>
                  {isStroke ? "Kreide-Farbe" : "Farbe"}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {tintPalette.map((c) => {
                    const active =
                      (selected.tint ?? "#e8e5e0").toLowerCase() ===
                      c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        title={c.label}
                        onClick={() =>
                          onUpdateSelected({
                            tint: c.hex === "#e8e5e0" ? undefined : c.hex,
                          })
                        }
                        style={{
                          width: 20,
                          height: 20,
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
            </>
          )}
          <AssetSlider
            label="Drehung"
            value={selected.rotation}
            min={0}
            max={360}
            step={1}
            suffix="°"
            onChange={(v) => onUpdateSelected({ rotation: v })}
          />
          <AssetSlider
            label="Deckkraft"
            value={Math.round(selected.opacity * 100)}
            min={10}
            max={100}
            step={1}
            suffix="%"
            onChange={(v) => onUpdateSelected({ opacity: v / 100 })}
          />
          <div className={styles.assetButtonRow}>
            <button
              className={styles.smallButton}
              onClick={() => onUpdateSelected({ flipX: !selected.flipX })}
            >
              ⇋ Spiegeln
            </button>
            {isMaskSel && (
              <button
                className={styles.smallButton}
                onClick={() => onUpdateSelected({ flipY: !selected.flipY })}
              >
                ⇅ V-Spiegeln
              </button>
            )}
            <button
              className={`${styles.smallButton} ${styles.danger}`}
              onClick={onDeleteSelected}
            >
              🗑 Löschen
            </button>
          </div>
          <div className={styles.assetButtonRow}>
            <button className={styles.smallButton} onClick={() => onLayer(1)}>
              ↑ Ebene
            </button>
            <button className={styles.smallButton} onClick={() => onLayer(-1)}>
              ↓ Ebene
            </button>
          </div>
        </div>
      )}
    </>
  );
}
