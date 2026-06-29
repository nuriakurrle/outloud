import { useRef, useState } from "react";
import type {
  AssetCategory,
  AssetItem,
  PlacedAsset,
} from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";
import { CHALK_COLORS } from "./DrawingToolbar";
import { useT } from "../../i18n";
import { stencilize } from "../../lib/stencilize";
const isMaskAsset = (cat: string) => cat === "strokes" || cat === "shapes";

// Formen sollen laut Vorgabe nur Weiß oder Schwarz sein.
const SHAPE_COLORS = [
  { label: "Weiß", hex: "#FFFFFF" },
  { label: "Schwarz", hex: "#000000" },
];

interface AssetPanelProps {
  assets: AssetItem[];
  onPlace: (assetId: string) => void;
  onDragPlace?: (assetId: string, clientX: number, clientY: number) => void;
  onUpload: (file: File) => void;
  selected: PlacedAsset | null;
  onUpdateSelected: (patch: Partial<PlacedAsset>) => void;
  onDeleteSelected: () => void;
  onLayer: (dir: 1 | -1) => void;
  // Kreide-Filter eines hochgeladenen Fotos ändern (an/aus + Parameter)
  onChalkChange: (
    assetId: string,
    patch: Partial<{
      enabled: boolean;
      contrast: number;
      brightness: number;
      threshold: number;
    }>
  ) => void;
  onUploadStencil: (dataUrl: string, name: string) => void;
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
  onDragPlace,
  onUpload,
  selected,
  onUpdateSelected,
  onDeleteSelected,
  onLayer,
  onChalkChange,
  onUploadStencil,
}: AssetPanelProps) {
  const selectedAsset = selected
    ? assets.find((a) => a.id === selected.assetId)
    : undefined;

  // Hochgeladenes Foto (kein SVG) → Kreide-Filter anbietbar.
  const isPhoto = !!selectedAsset?.originalSrc;
  const chalk = selectedAsset?.chalk;

  // Striche & Formen teilen sich den Masken-/Tint-Pfad, brauchen aber leicht
  // andere Beschriftungen und Farb-Paletten.
  const isStroke = selectedAsset?.category === "strokes";
  const isShape = selectedAsset?.category === "shapes";
  const isMaskSel = selectedAsset ? isMaskAsset(selectedAsset.category) : false;
  const tintPalette = isShape ? SHAPE_COLORS : CHALK_COLORS;

  const { t } = useT();
  const CAT: Record<string, string> = {
    all: t.all, portraits: t.portraits, buildings: t.buildings,
    icons: t.icons, ornaments: t.ornaments, logos: "Logos",
    shapes: "Shapes", strokes: "Strokes",
  };

  const [filter, setFilter] = useState<AssetCategory | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState<{ id: string; src: string; startX: number; startY: number; curX: number; curY: number; started: boolean } | null>(null);
  const [pending, setPending] = useState<{ file: File; img: HTMLImageElement; originalUrl: string; previewUrl: string; name: string; blockSize: number; c: number; useStencil: boolean } | null>(null);

  const applyStencil = (blockSize: number, c: number) => {
    if (!pending) return;
    setPending(prev => prev ? { ...prev, previewUrl: stencilize(prev.img, blockSize, c) } : null);
  };

  const confirmStencil = () => {
    if (!pending) return;
    if (pending.useStencil) onUploadStencil(pending.previewUrl, pending.name);
    else onUpload(pending.file);
    URL.revokeObjectURL(pending.originalUrl);
    setPending(null);
  };

  const cancelStencil = () => {
    if (pending) { URL.revokeObjectURL(pending.originalUrl); setPending(null); }
  };

  const availableCats = Array.from(new Set(assets.map((a) => a.category)));
  const shown =
    filter === "all" ? assets : assets.filter((a) => a.category === filter);
  const showFilter = availableCats.length > 1;

  return (
    <>
      {showFilter && (
        <select
          className={styles.select}
          value={filter}
          onChange={(e) => setFilter(e.target.value as AssetCategory | "all")}
        >
          <option value="all">{CAT.all}</option>
          {availableCats.map((c) => (
            <option key={c} value={c}>{CAT[c] ?? c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      )}

      <div className={styles.assetGrid}>
        {shown.map((a) => (
          <button
            key={a.id}
            className={styles.assetThumb}
            title={a.name}
            data-no-chalk
            style={
              a.category === "strokes"
                ? { background: "#1e1e1e", gridColumn: "1 / -1" }
                : a.category === "shapes"
                  ? { background: "#1e1e1e" }
                  : undefined
            }
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ id: a.id, src: a.src, startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY, started: false });
            }}
            onPointerMove={(e) => {
              if (!drag || drag.id !== a.id) return;
              const started = drag.started || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6;
              setDrag((prev) => prev ? { ...prev, curX: e.clientX, curY: e.clientY, started } : null);
            }}
            onPointerUp={(e) => {
              if (!drag || drag.id !== a.id) { setDrag(null); return; }
              if (drag.started && onDragPlace) {
                onDragPlace(a.id, e.clientX, e.clientY);
              } else {
                onPlace(a.id);
              }
              setDrag(null);
            }}
            onPointerCancel={() => setDrag(null)}
          >
            <img className={styles.assetThumbImg} src={a.src} alt={a.name} />
          </button>
        ))}
      </div>
      {drag?.started && (
        <div style={{ position: "fixed", left: drag.curX - 24, top: drag.curY - 24, width: 48, height: 48, pointerEvents: "none", zIndex: 9999, opacity: 0.8 }}>
          <img src={drag.src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      )}
      {shown.length === 0 && <p className={styles.hint}>{t.noItems}</p>}
      <p className={styles.hint}>{t.assetHint}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const isSvg = /svg/i.test(file.type) || /\.svg$/i.test(file.name);
          if (isSvg) {
            const reader = new FileReader();
            reader.onload = (ev) => onUploadStencil(ev.target!.result as string, file.name.replace(/\.svg$/i, ""));
            reader.readAsDataURL(file);
            return;
          }
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            const previewUrl = stencilize(img, 300, 0);
            setPending({ file, img, originalUrl: url, previewUrl, name: file.name.replace(/\.(png|jpe?g|bmp)$/i, ""), blockSize: 300, c: 0, useStencil: true });
          };
          img.src = url;
        }}
      />
      <button
        className={styles.regenButton}
        onClick={() => fileInputRef.current?.click()}
      >
        {t.upload}
      </button>

      {pending && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", overflow: "hidden" }}>
              <img src={pending.useStencil ? pending.previewUrl : pending.originalUrl} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="preview" />
            </div>
            <div style={{ width: 220, background: "#111", borderLeft: "1px solid #1a1a1a", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={pending.useStencil} onChange={e => setPending(prev => prev ? { ...prev, useStencil: e.target.checked } : null)} />
                Stencil Filter
              </label>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", opacity: pending.useStencil ? 1 : 0.3 }}>Variables</div>
              {pending.useStencil && <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#666" }}>Blocksize</label>
                  <input
                    type="number" value={pending.blockSize} min={3} max={800} step={1}
                    onChange={e => setPending(prev => prev ? { ...prev, blockSize: Number(e.target.value) } : null)}
                    style={{ background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "6px 8px", borderRadius: 4, fontSize: 13, width: "100%" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#666" }}>Stroke</label>
                  <input
                    type="number" value={pending.c} min={-50} max={50} step={1}
                    onChange={e => setPending(prev => prev ? { ...prev, c: Number(e.target.value) } : null)}
                    style={{ background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "6px 8px", borderRadius: 4, fontSize: 13, width: "100%" }}
                  />
                </div>
                <button
                  onClick={() => applyStencil(pending.blockSize, pending.c)}
                  style={{ padding: "9px 0", background: "#fff", color: "#111", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Apply
                </button>
              </>}
            </div>
          </div>
          <div style={{ padding: "12px 24px", background: "#111", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={cancelStencil} style={{ padding: "9px 20px", background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={confirmStencil} style={{ padding: "9px 20px", background: "#fff", color: "#111", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Upload</button>
          </div>
        </div>
      )}

      {selected && (
        <div className={styles.assetControls}>
          <span className={styles.label}>
            {t.selected} {selectedAsset?.name ?? ""}
          </span>
          {isPhoto && (
            <>
              <div className={styles.field}>
                <span className={styles.label}>{t.chalkFilter}</span>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {[
                    { label: t.chalk, on: true },
                    { label: t.original, on: false },
                  ].map((o) => {
                    const active = (chalk?.enabled ?? false) === o.on;
                    return (
                      <button
                        key={o.label}
                        onClick={() =>
                          onChalkChange(selected.assetId, { enabled: o.on })
                        }
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
                          color: "#FFFFFF",
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
              {chalk?.enabled && (
                <>
                  <AssetSlider
                    label={t.contrast}
                    value={chalk.contrast}
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    format={(v) => v.toFixed(2)}
                    onChange={(v) =>
                      onChalkChange(selected.assetId, { contrast: v })
                    }
                  />
                  <AssetSlider
                    label={t.brightness}
                    value={chalk.brightness}
                    min={-0.3}
                    max={0.3}
                    step={0.02}
                    format={(v) => v.toFixed(2)}
                    onChange={(v) =>
                      onChalkChange(selected.assetId, { brightness: v })
                    }
                  />
                  <AssetSlider
                    label={t.threshold}
                    value={chalk.threshold}
                    min={0}
                    max={0.9}
                    step={0.02}
                    format={(v) => (v < 0.02 ? "weich" : v.toFixed(2))}
                    onChange={(v) =>
                      onChalkChange(selected.assetId, { threshold: v })
                    }
                  />
                </>
              )}
            </>
          )}
          <AssetSlider
            label={isStroke ? t.assetLength : t.assetSize}
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
                label={isStroke ? t.assetStrength : t.assetHeight}
                value={selected.scaleY ?? 1}
                min={0.2}
                max={4}
                step={0.1}
                format={(v) => v.toFixed(1)}
                onChange={(v) => onUpdateSelected({ scaleY: v })}
              />
              <div className={styles.field}>
                <span className={styles.label}>
                  {isStroke ? t.chalkColor : t.color}
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
                      (selected.tint ?? "#FFFFFF").toLowerCase() ===
                      c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        title={c.label}
                        data-no-chalk
                        onClick={() =>
                          onUpdateSelected({
                            tint: c.hex === "#FFFFFF" ? undefined : c.hex,
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
            label={t.rotation}
            value={selected.rotation}
            min={0}
            max={360}
            step={1}
            suffix="°"
            onChange={(v) => onUpdateSelected({ rotation: v })}
          />
          <AssetSlider
            label={t.assetOpacity}
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
              {t.mirror}
            </button>
            {isMaskSel && (
              <button
                className={styles.smallButton}
                onClick={() => onUpdateSelected({ flipY: !selected.flipY })}
              >
                {t.mirrorV}
              </button>
            )}
            <button
              className={`${styles.smallButton} ${styles.danger}`}
              onClick={onDeleteSelected}
            >
              {t.deleteBtn}
            </button>
          </div>
          <div className={styles.assetButtonRow}>
            <button className={styles.smallButton} onClick={() => onLayer(1)}>
              {t.layerUp}
            </button>
            <button className={styles.smallButton} onClick={() => onLayer(-1)}>
              {t.layerDown}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
