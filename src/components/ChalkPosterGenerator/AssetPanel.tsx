import type { AssetItem, PlacedAsset } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

interface AssetPanelProps {
  assets: AssetItem[]; // Die angefertigten Logos aus dem Registry
  onPlace: (assetId: string) => void;
  selected: PlacedAsset | null;
  onUpdateSelected: (patch: Partial<PlacedAsset>) => void;
  onDeleteSelected: () => void;
  onLayer: (dir: 1 | -1) => void;
}

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
  selected,
  onUpdateSelected,
  onDeleteSelected,
  onLayer,
}: AssetPanelProps) {
  const selectedAsset = selected
    ? assets.find((a) => a.id === selected.assetId)
    : undefined;

  return (
    <>
      <div className={styles.assetGrid}>
        {assets.map((a) => (
          <button
            key={a.id}
            className={styles.assetThumb}
            title={a.name}
            onClick={() => onPlace(a.id)}
          >
            <img className={styles.assetThumbImg} src={a.src} alt={a.name} />
          </button>
        ))}
      </div>
      {assets.length === 0 && (
        <p className={styles.hint}>Keine Logos vorhanden.</p>
      )}
      <p className={styles.hint}>Klick = aufs Poster · dann frei verschieben</p>

      {selected && (
        <div className={styles.assetControls}>
          <span className={styles.label}>
            Ausgewählt: {selectedAsset?.name ?? "Element"}
          </span>
          <AssetSlider
            label="Größe"
            value={selected.scale}
            min={0.05}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => onUpdateSelected({ scale: v })}
          />
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
