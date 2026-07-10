import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { unzipSync, strFromU8 } from "fflate";
import { exportDesignZip, type DesignFileState } from "../../lib/layeredExport";
import type {
  Align, AssetItem, PatternConfig, PatternStroke, PlacedAsset, Position,
} from "../../types/poster";
import { generatePatternStrokes, getAllBrushes } from "../../lib/brushStrokes";
import { ASSET_REGISTRY, LOGO_REGISTRY } from "../../assetRegistry";
import { Sidebar, type TextFieldState } from "./Sidebar";
import { TextPopup } from "./TextPopup";
import { PosterCanvas, type PosterCanvasHandle } from "./PosterCanvas";
import { AssetPanel } from "./AssetPanel";
import { LayoutPanel } from "./LayoutPanel";
import { LAYOUTS, type PosterLayout } from "./layouts";
import { type PosterScene, type SceneAsset } from "../../lib/posterRender";
import { exportPNG, downloadBlob } from "../../lib/exporter";
import styles from "../../styles/chalkPoster.module.css";
import { makeId, POS_KEYS, type PosKey, FONTS, POSTER_SIZES, POSTER_BG } from "./constants";
import { useT } from "../../i18n";
import { DesignerProvider } from "../DesignerBase/DesignerProvider";
import { DesignerCanvas } from "../DesignerBase/DesignerCanvas";
import { useDesignerContext } from "../DesignerBase/context";
import type { ExtraText } from "../DesignerBase/types";

// ── Grouped named-text state ──────────────────────────────────
interface PosterText {
  headerText: string; headerFont: string; headerSize: number; headerWeight: string; headerOutline: boolean;
  subText: string; subFont: string; subSize: number; subOutline: boolean;
  bodyText: string; bodyFont: string; bodySize: number; bodyOutline: boolean;
  detailText: string; detailFont: string; detailSize: number;
}

const DEFAULT_TEXT: PosterText = {
  headerText: "Незабутній Захід", headerFont: "Oswald", headerSize: 52, headerWeight: "700", headerOutline: false,
  subText: "Який ви не пропустите", subFont: "Oswald", subSize: 26, subOutline: false,
  bodyText: "15:00 01.01\nMicado Café\nSchertlinstr. 6", bodyFont: "Oswald", bodySize: 18, bodyOutline: false,
  detailText: "Реєстрація в Інстаграм", detailFont: "Oswald", detailSize: 14,
};

const INITIAL_POSITIONS: Record<PosKey, Position> = LAYOUTS[0].positions as Record<PosKey, Position>;
const INITIAL_ALIGNS: Record<PosKey, Align> = {
  header: LAYOUTS[0].aligns?.header ?? "center",
  sub: LAYOUTS[0].aligns?.sub ?? "center",
  body: LAYOUTS[0].aligns?.body ?? "center",
  detail: LAYOUTS[0].aligns?.detail ?? "center",
};
const INITIAL_ASSETS: PlacedAsset[] = LOGO_REGISTRY.length === 0
  ? []
  : LAYOUTS[0].logoSlots.map((slot, i) => ({
      id: makeId(), assetId: LOGO_REGISTRY[i % LOGO_REGISTRY.length].id,
      x: slot.x, y: slot.y, scale: slot.scale, rotation: 0, opacity: 1, flipX: false, zIndex: i + 1,
    }));

// ── Inner component — uses context ────────────────────────────

interface InnerProps {
  posterSizeIndex: number;
  setPosterSizeIndex: (v: number) => void;
  inverted: boolean;
  setInverted: (v: boolean) => void;
  patternConfig: PatternConfig;
  updatePattern: (patch: Partial<PatternConfig>) => void;
  patternStrokes: PatternStroke[];
  setPatternStrokes: React.Dispatch<React.SetStateAction<PatternStroke[]>>;
  selectedPatternId: string | null;
  setSelectedPatternId: (id: string | null) => void;
  selectedLayoutId: string;
  setSelectedLayoutId: (id: string) => void;
  text: PosterText;
  updateText: (patch: Partial<PosterText>) => void;
  applyPattern: (strokes: PatternStroke[], config: PatternConfig) => void;
}

function ChalkPosterGeneratorInner({
  posterSizeIndex, setPosterSizeIndex, inverted, setInverted,
  patternConfig, updatePattern, patternStrokes, setPatternStrokes,
  selectedPatternId, setSelectedPatternId, selectedLayoutId, setSelectedLayoutId,
  text, updateText, applyPattern,
}: InnerProps) {
  const { t } = useT();
  const {
    strokes, setStrokes, selectedStrokeId, setSelectedStrokeId,
    placedAssets, setPlacedAssets, selectedAsset, allAssets, getAssetSrc,
    positions, setPositions, textAligns, setTextAligns,
    extraTexts, setExtraTexts, selectedTextId, setSelectedTextId,
    mode, brushOpacity, liveStrokePath, chalkColor,
    commit, deleteSelectedStroke, updateSelectedStroke,
    handlePlace, handleDragPlace, handleUpload, handleUploadStencil,
    updateAssetChalk, updateSelected, deleteSelected,
    handleStrokePointerDown, addText,
    logoAssets, illustrationAssets,
    containerRef, beginDeltaDrag,
    setSelectedAssetId, textWidths, setTextWidths,
    margins, setMargins,
  } = useDesignerContext();

  const posterCanvasRef = useRef<PosterCanvasHandle>(null);
  const size = POSTER_SIZES[posterSizeIndex];
  const bgColor = inverted ? "#ffffff" : POSTER_BG;
  const textColor = inverted ? "#000000" : "#FFFFFF";
  const effectivePatternConfig = { ...patternConfig, color: inverted ? "black" as const : "white" as const };

  // ── Responsive scale ──────────────────────────────────────
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => setScale(Math.min(
      (window.innerWidth - 344) / size.w,
      (window.innerHeight - 172) / size.h, // -172: Navbar + unterer Toolbar/Hinweis-Streifen
      1.4
    ));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [size.w, size.h]);
  const displayW = size.w * scale;
  const displayH = size.h * scale;

  // ── Pattern drag ──────────────────────────────────────────
  const handlePatternPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (mode !== "move") return;
    const ps = patternStrokes.find(p => p.id === id);
    if (!ps) return;
    setSelectedPatternId(id);
    setSelectedStrokeId(null);
    setSelectedTextId(null);
    setSelectedAssetId(null);
    beginDeltaDrag(id, e,
      { min: -80, max: 80 },
      () => ({ offX: ps.offsetX ?? 0, offY: ps.offsetY ?? 0 }),
      (offX, offY) => setPatternStrokes(prev => prev.map(p => p.id === id ? { ...p, offsetX: offX, offsetY: offY } : p)),
    );
  }, [mode, patternStrokes, setSelectedPatternId, setSelectedStrokeId, setSelectedTextId, setSelectedAssetId, beginDeltaDrag, setPatternStrokes]);

  // ── Layout / Randomize ────────────────────────────────────
  const applyLayout = useCallback((layout: PosterLayout) => {
    setPositions(layout.positions);
    setTextAligns({ header: layout.aligns?.header ?? "center", sub: layout.aligns?.sub ?? "center", body: layout.aligns?.body ?? "center", detail: layout.aligns?.detail ?? "center" });
    setSelectedLayoutId(layout.id);
    if (LOGO_REGISTRY.length === 0) { setPlacedAssets([]); setSelectedAssetId(null); return; }
    setPlacedAssets(layout.logoSlots.map((slot, i) => ({
      id: makeId(), assetId: LOGO_REGISTRY[i % LOGO_REGISTRY.length].id,
      x: slot.x, y: slot.y, scale: slot.scale, rotation: 0, opacity: 1, flipX: false, zIndex: i + 1,
    })));
    setSelectedAssetId(null);
  }, [setPositions, setTextAligns, setSelectedLayoutId, setPlacedAssets, setSelectedAssetId]);

  const generateAll = useCallback(() => {
    commit();
    const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    setPositions(layout.positions);
    setTextAligns({ header: layout.aligns?.header ?? "center", sub: layout.aligns?.sub ?? "center", body: layout.aligns?.body ?? "center", detail: layout.aligns?.detail ?? "center" });
    setSelectedLayoutId(layout.id);
    setPlacedAssets(prev => {
      const others = prev.filter(p => allAssets.find(a => a.id === p.assetId)?.category !== "logos");
      if (LOGO_REGISTRY.length === 0) return others;
      const baseZ = others.reduce((m, p) => Math.max(m, p.zIndex), 0);
      return [...others, ...layout.logoSlots.map((slot, i) => ({ id: makeId(), assetId: LOGO_REGISTRY[i % LOGO_REGISTRY.length].id, x: slot.x, y: slot.y, scale: slot.scale, rotation: 0, opacity: 1, flipX: false, zIndex: baseZ + i + 1 }))];
    });
    setSelectedAssetId(null);
    updatePattern({ count: Math.round(3 + Math.random() * 8), opacity: Math.round(45 + Math.random() * 45), seed: Math.floor(Math.random() * 999999) });
  }, [commit, allAssets, setPositions, setTextAligns, setSelectedLayoutId, setPlacedAssets, setSelectedAssetId, updatePattern]);

  // ── Text items ────────────────────────────────────────────
  const textItems = useMemo(() => [
    { key: "header" as PosKey, text: text.headerText, font: text.headerFont, size: text.headerSize, weight: text.headerWeight, color: textColor, align: (textAligns.header ?? "center") as Align, outline: text.headerOutline, position: positions.header ?? INITIAL_POSITIONS.header },
    { key: "sub" as PosKey, text: text.subText, font: text.subFont, size: text.subSize, weight: "600", color: textColor, align: (textAligns.sub ?? "center") as Align, outline: text.subOutline, position: positions.sub ?? INITIAL_POSITIONS.sub },
    { key: "body" as PosKey, text: text.bodyText, font: text.bodyFont, size: text.bodySize, weight: "400", color: textColor, align: (textAligns.body ?? "center") as Align, outline: text.bodyOutline, position: positions.body ?? INITIAL_POSITIONS.body },
    { key: "detail" as PosKey, text: text.detailText, font: text.detailFont, size: text.detailSize, weight: "400", color: textColor, align: (textAligns.detail ?? "center") as Align, outline: false, position: positions.detail ?? INITIAL_POSITIONS.detail },
    ...extraTexts.map(et => ({ key: et.id, text: et.text, font: et.font, size: et.size, weight: et.weight, color: textColor, align: et.align, outline: et.outline, position: et.position })),
  ], [text, textColor, textAligns, positions, extraTexts]);

  // ── Scene / Export ────────────────────────────────────────
  const buildScene = useCallback((): PosterScene => ({
    w: size.w, h: size.h, bg: bgColor,
    pattern: effectivePatternConfig, patternStrokes, strokes,
    texts: textItems.map(tx => ({ key: tx.key, text: tx.text, font: tx.font, size: tx.size, weight: tx.weight, color: tx.color, align: tx.align, outline: tx.outline, x: tx.position.x, y: tx.position.y, ...(textWidths[tx.key] !== undefined ? { maxWidth: textWidths[tx.key] } : {}) })),
    assets: placedAssets.map((a): SceneAsset => { const item = allAssets.find(x => x.id === a.assetId); return { ...a, src: item?.src ?? getAssetSrc(a.assetId), category: item?.category ?? "logos", naturalWidth: item?.naturalWidth, naturalHeight: item?.naturalHeight }; }),
  }), [size, bgColor, effectivePatternConfig, patternStrokes, strokes, textItems, textWidths, placedAssets, allAssets, getAssetSrc]);

  const FORMAT_NAMES = ["A3", "A4", "Flyer", "Insta"] as const;
  const toSlug = (s: string) => s.replace(/[^а-яА-ЯіІїЇєЄa-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "poster";

  const handleExport = useCallback(async () => {
    const blob = await exportPNG(buildScene(), 3);
    downloadBlob(blob, `${toSlug(text.headerText)}-${FORMAT_NAMES[posterSizeIndex] ?? "poster"}.png`);
  }, [buildScene, text.headerText, posterSizeIndex]);

  const handleExportDesign = useCallback(async () => {
    const designState: DesignFileState = {
      v: 2, app: "outloud-poster",
      snap: { strokes, placedAssets, positions, extraTexts, patternStrokes, patternConfig } as Record<string, unknown>,
      textAligns, textWidths, margins,
      text: { headerText: text.headerText, subText: text.subText, bodyText: text.bodyText, detailText: text.detailText },
      inverted, posterSizeIndex,
    };
    const blob = await exportDesignZip(buildScene(), designState);
    downloadBlob(blob, `${toSlug(text.headerText)}-${FORMAT_NAMES[posterSizeIndex] ?? "poster"}.zip`);
  }, [buildScene, strokes, placedAssets, positions, extraTexts, patternStrokes, patternConfig, textAligns, textWidths, margins, text, inverted, posterSizeIndex]);

  const handleImportDesign = useCallback(async (file: File) => {
    try {
      const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const state = JSON.parse(strFromU8(unzipped["design.json"])) as DesignFileState;
      if (state.v !== 2 || state.app !== "outloud-poster") return;
      const snap = state.snap as { strokes: typeof strokes; placedAssets: typeof placedAssets; positions: typeof positions; extraTexts: typeof extraTexts; patternStrokes: typeof patternStrokes; patternConfig: typeof patternConfig };
      setStrokes(snap.strokes);
      setPlacedAssets(snap.placedAssets);
      setPositions(snap.positions);
      setExtraTexts(snap.extraTexts);
      setTextAligns(state.textAligns as typeof textAligns);
      setTextWidths(state.textWidths);
      setMargins(state.margins);
      applyPattern(snap.patternStrokes, snap.patternConfig);
      updateText(state.text as Partial<PosterText>);
      setInverted(state.inverted);
      setPosterSizeIndex(state.posterSizeIndex);
    } catch (e) { console.warn("Import failed:", e); }
  }, [setStrokes, setPlacedAssets, setPositions, setExtraTexts, setTextAligns, setTextWidths, setMargins, applyPattern, updateText, setInverted, setPosterSizeIndex]);

  // ── Text popup ────────────────────────────────────────────
  const textPanel = (() => {
    if (!selectedTextId) return undefined;
    const u = (k: keyof PosterText) => (v: string | number | boolean) => updateText({ [k]: v } as Partial<PosterText>);
    const namedFields: Record<PosKey, TextFieldState> = {
      header: { text: text.headerText, setText: u("headerText") as (v: string) => void, font: text.headerFont, setFont: u("headerFont") as (v: string) => void, size: text.headerSize, setSize: u("headerSize") as (v: number) => void, sizeMin: 18, sizeMax: 120, weight: text.headerWeight, setWeight: u("headerWeight") as (v: string) => void, outline: text.headerOutline, setOutline: u("headerOutline") as (v: boolean) => void },
      sub: { text: text.subText, setText: u("subText") as (v: string) => void, font: text.subFont, setFont: u("subFont") as (v: string) => void, size: text.subSize, setSize: u("subSize") as (v: number) => void, sizeMin: 12, sizeMax: 80, outline: text.subOutline, setOutline: u("subOutline") as (v: boolean) => void },
      body: { text: text.bodyText, setText: u("bodyText") as (v: string) => void, font: text.bodyFont, setFont: u("bodyFont") as (v: string) => void, size: text.bodySize, setSize: u("bodySize") as (v: number) => void, sizeMin: 10, sizeMax: 50, multiline: true, outline: text.bodyOutline, setOutline: u("bodyOutline") as (v: boolean) => void },
      detail: { text: text.detailText, setText: u("detailText") as (v: string) => void, font: text.detailFont, setFont: u("detailFont") as (v: string) => void, size: text.detailSize, setSize: u("detailSize") as (v: number) => void, sizeMin: 8, sizeMax: 36, multiline: true },
    };
    if ((POS_KEYS as readonly string[]).includes(selectedTextId)) {
      const k = selectedTextId as PosKey;
      return <TextPopup field={namedFields[k]} align={(textAligns[k] ?? "center") as Align} onAlignChange={a => setTextAligns(prev => ({ ...prev, [k]: a }))} fonts={FONTS} onClose={() => setSelectedTextId(null)} />;
    }
    const et = extraTexts.find(tx => tx.id === selectedTextId);
    if (!et) return undefined;
    const upd = (patch: Partial<ExtraText>) => setExtraTexts(prev => prev.map(tx => tx.id === selectedTextId ? { ...tx, ...patch } : tx));
    const etField: TextFieldState = { text: et.text, setText: v => upd({ text: v }), font: et.font, setFont: v => upd({ font: v }), size: et.size, setSize: v => upd({ size: v }), sizeMin: 8, sizeMax: 120, multiline: true, weight: et.weight, setWeight: v => upd({ weight: v }), outline: et.outline, setOutline: v => upd({ outline: v }) };
    return <TextPopup field={etField} align={et.align} onAlignChange={a => upd({ align: a })} fonts={FONTS} onClose={() => setSelectedTextId(null)} onDelete={() => { setExtraTexts(prev => prev.filter(tx => tx.id !== selectedTextId)); setSelectedTextId(null); }} />;
  })();

  // ── Stroke panel ──────────────────────────────────────────
  const strokePanel = (() => {
    if (!selectedStrokeId) return undefined;
    const s = strokes.find(st => st.id === selectedStrokeId);
    if (!s) return undefined;
    const btn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "5px 0", borderRadius: 5, cursor: "pointer", background: active ? "var(--state-active-bg)" : "var(--state-inactive-bg)", border: active ? "1px solid var(--state-active-border)" : "1px solid var(--state-inactive-border)", color: "var(--text-primary)", fontSize: 14 });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.strokeTitle}</span>
          <button onClick={() => setSelectedStrokeId(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 0, display: "flex" }}><X size={16}/></button>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[{ label: t.colorWhite, hex: "#FFFFFF" }, { label: t.colorBlack, hex: "#000000" }].map(c => <button key={c.hex} onClick={() => updateSelectedStroke({ color: c.hex })} style={btn(s.color.toUpperCase() === c.hex)}>{c.label}</button>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--text-secondary)", fontSize: 13, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(s.opacity * 100)}%</span>
          <input type="range" min={10} max={100} value={Math.round(s.opacity * 100)} onChange={e => updateSelectedStroke({ opacity: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: "var(--white)", cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--text-secondary)", fontSize: 13, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(s.strokeWidth * 100)}%</span>
          <input type="range" min={1} max={100} value={Math.round(s.strokeWidth * 100)} onChange={e => updateSelectedStroke({ strokeWidth: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: "var(--white)", cursor: "pointer" }} />
        </div>
        <select value={s.brushName} onChange={e => updateSelectedStroke({ brushName: e.target.value })} style={{ background: "var(--surface-input)", border: "1px solid var(--border-default)", color: "var(--text-body)", borderRadius: 5, padding: "8px 9px", fontSize: 15, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }}>
          {getAllBrushes().map(b => <option key={b.name} value={b.name}>{b.name.replace("Figma ", "")}</option>)}
        </select>
        <button onClick={deleteSelectedStroke} style={{ padding: "7px 0", borderRadius: 6, background: "var(--btn-danger-bg)", border: "1px solid var(--btn-danger-border)", color: "var(--btn-danger-text)", fontSize: 14, cursor: "pointer" }}>{t.deleteLabel}</button>
      </div>
    );
  })();

  return (
    <div className={`${styles.app} chalk-ui`}>
      <Sidebar
        sizes={POSTER_SIZES}
        posterSizeIndex={posterSizeIndex}
        setPosterSizeIndex={setPosterSizeIndex}
        inverted={inverted}
        onInvert={() => setInverted(!inverted)}
        pattern={patternConfig}
        setPattern={updatePattern}
        onRegenerate={() => updatePattern({ seed: Math.floor(Math.random() * 999999) })}
        brushNames={getAllBrushes().map(b => b.name)}
        layoutSection={<LayoutPanel layouts={LAYOUTS} onApply={applyLayout} hasLogos={LOGO_REGISTRY.length > 0} selectedId={selectedLayoutId} />}
        logoSection={
          <AssetPanel assets={logoAssets} onPlace={handlePlace} onDragPlace={handleDragPlace}
            onUpload={file => handleUpload(file, "logos")}
            onUploadStencil={(dataUrl, name) => handleUploadStencil(dataUrl, name, "logos")}
            selected={allAssets.find(a => a.id === selectedAsset?.assetId)?.category === "logos" ? selectedAsset : null}
            onUpdateSelected={updateSelected} onDeleteSelected={deleteSelected} onChalkChange={updateAssetChalk} />
        }
        illustrationSection={
          <AssetPanel assets={illustrationAssets} onPlace={handlePlace} onDragPlace={handleDragPlace}
            onUpload={file => handleUpload(file, "icons")}
            onUploadStencil={(dataUrl, name) => handleUploadStencil(dataUrl, name, "icons")}
            selected={allAssets.find(a => a.id === selectedAsset?.assetId)?.category !== "logos" ? selectedAsset : null}
            onUpdateSelected={updateSelected} onDeleteSelected={deleteSelected} onChalkChange={updateAssetChalk} />
        }
        strokePanel={strokePanel}
        textPanel={textPanel}
        onAddText={addText}
        onRandomize={generateAll}
        onExport={handleExport}
        onExportDesign={handleExportDesign}
        onImportDesign={handleImportDesign}
      />

      <div className={styles.preview}>
        <DesignerCanvas
          renderBackground={overlays => (
            <PosterCanvas
              ref={posterCanvasRef}
              size={size}
              scale={scale}
              bg={bgColor}
              pattern={effectivePatternConfig}
              containerRef={containerRef}
              strokes={strokes}
              liveStrokePath={liveStrokePath}
              liveStrokeColor={chalkColor}
              liveStrokeOpacity={brushOpacity}
              selectedStrokeId={selectedStrokeId}
              onStrokePointerDown={mode === "move" ? handleStrokePointerDown : undefined}
              patternStrokes={patternStrokes}
              selectedPatternId={selectedPatternId}
              onPatternPointerDown={mode === "move" ? handlePatternPointerDown : undefined}
              drawMode={mode === "draw"}
              onBackgroundClick={() => {
                setSelectedTextId(null);
                setSelectedStrokeId(null);
                setSelectedAssetId(null);
                setSelectedPatternId(null);
              }}
            >
              {overlays}
            </PosterCanvas>
          )}
          textItems={textItems}
          displayW={displayW}
          displayH={displayH}
          scale={scale}
        />
      </div>
    </div>
  );
}

// ── Outer shell — poster/pattern state + DesignerProvider ──────

export function ChalkPosterGenerator() {
  const [posterSizeIndex, setPosterSizeIndex] = useState(0);
  const [inverted, setInverted] = useState(false);
  const [patternConfig, setPatternConfig] = useState<PatternConfig>({
    patternType: "lines", count: 5, brushName: "Figma Verite",
    strokeWidth: 0.3, opacity: 100, color: "white",
    seed: Math.floor(Math.random() * 999999),
  });
  const [patternStrokes, setPatternStrokes] = useState<PatternStroke[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState(LAYOUTS[0].id);
  const [text, setText] = useState<PosterText>(DEFAULT_TEXT);
  const updateText = useCallback((patch: Partial<PosterText>) => setText(prev => ({ ...prev, ...patch })), []);
  const updatePattern = useCallback((patch: Partial<PatternConfig>) => setPatternConfig(prev => ({ ...prev, ...patch })), []);
  const applyPattern = useCallback((strokes: PatternStroke[], config: PatternConfig) => {
    skipRegenRef.current = true;
    setPatternStrokes(strokes);
    setPatternConfig(config);
  }, []);
  const size = POSTER_SIZES[posterSizeIndex];

  const skipRegenRef = useRef(false);
  useEffect(() => {
    if (skipRegenRef.current) { skipRegenRef.current = false; return; }
    // Neue Linien generieren, aber die manuell gezogene Platzierung (offsetX/Y)
    // je Linie beibehalten – sonst springen verschobene Linien zurück.
    setPatternStrokes(prev =>
      generatePatternStrokes(patternConfig, size.w, size.h).map((s, i) =>
        prev[i] ? { ...s, offsetX: prev[i].offsetX, offsetY: prev[i].offsetY } : s
      )
    );
  }, [patternConfig, size.w, size.h]);

  const onClearNamedText = useCallback((key: string) => {
    updateText({ [`${key}Text`]: "" } as Partial<PosterText>);
  }, [updateText]);

  const onCommitNamedText = useCallback((key: string, newText: string) => {
    updateText({ [`${key}Text`]: newText } as Partial<PosterText>);
  }, [updateText]);

  type PosterExtra = { patternStrokes: PatternStroke[]; patternConfig: PatternConfig };
  const extraSnapshot = useMemo((): PosterExtra => ({ patternStrokes, patternConfig }), [patternStrokes, patternConfig]);

  const onBuildNewAsset = useCallback((item: AssetItem): Partial<PlacedAsset> => {
    const isStroke = item.category === "strokes";
    return { rotation: isStroke ? -8 + Math.random() * 16 : 0, opacity: isStroke ? 0.9 : 1 };
  }, []);

  return (
    <DesignerProvider
      logoRegistry={LOGO_REGISTRY}
      illustrationRegistry={ASSET_REGISTRY}
      storageKey="vholos-poster-uploads"
      uploadsKey="vholos-shared-uploads"
      aspectRatio={size.w / size.h}
      initialMargins={{ left: 5, right: 5, top: 5, bottom: 5 }}
      initialPositions={INITIAL_POSITIONS}
      initialTextAligns={INITIAL_ALIGNS}
      initialAssets={INITIAL_ASSETS}
      extraSnapshot={extraSnapshot}
      onApplyExtraSnapshot={s => {
        skipRegenRef.current = true;
        setPatternStrokes(s.patternStrokes);
        setPatternConfig(s.patternConfig);
      }}
      onBuildNewAsset={onBuildNewAsset}
      onClearNamedText={onClearNamedText}
      onCommitNamedText={onCommitNamedText}
      onDeleteExtra={() => { if (selectedPatternId) { setPatternStrokes(prev => prev.filter(p => p.id !== selectedPatternId)); setSelectedPatternId(null); } }}
      defaultFont={text.headerFont}
    >
      <ChalkPosterGeneratorInner
        posterSizeIndex={posterSizeIndex} setPosterSizeIndex={setPosterSizeIndex}
        inverted={inverted} setInverted={setInverted}
        patternConfig={patternConfig} updatePattern={updatePattern}
        patternStrokes={patternStrokes} setPatternStrokes={setPatternStrokes}
        selectedPatternId={selectedPatternId} setSelectedPatternId={setSelectedPatternId}
        selectedLayoutId={selectedLayoutId} setSelectedLayoutId={setSelectedLayoutId}
        text={text} updateText={updateText}
        applyPattern={applyPattern}
      />
    </DesignerProvider>
  );
}
