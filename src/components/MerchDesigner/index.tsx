import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Align, PlacedAsset, Position } from "../../types/poster";
import { getAllBrushes } from "../../lib/brushStrokes";
import { ASSET_REGISTRY, LOGO_REGISTRY } from "../../assetRegistry";
import { type TextFieldState } from "../ChalkPosterGenerator/Sidebar";
import { TextPopup } from "../ChalkPosterGenerator/TextPopup";
import { AssetPanel } from "../ChalkPosterGenerator/AssetPanel";
import { type PosterScene, type SceneAsset, loadSceneImages, renderPosterScene, loadImage } from "../../lib/posterRender";
import { downloadBlob } from "../../lib/exporter";
import styles from "../../styles/chalkPoster.module.css";
import { POS_KEYS, type PosKey, FONTS } from "../ChalkPosterGenerator/constants";
import { useT } from "../../i18n";
import { MerchSidebar } from "./MerchSidebar";
import { TshirtCanvas, type PosterCanvasHandle, FRONT_IMG, BACK_IMG } from "./TshirtCanvas";
import { MERCH_SIZE, TSHIRT_VIEWS, EMPTY_PATTERN, MERCH_ITEMS, type MerchProduct } from "./constants";
import type { CapViewerHandle } from "./CapViewer";
import { DesignerProvider } from "../DesignerBase/DesignerProvider";
import { DesignerCanvas } from "../DesignerBase/DesignerCanvas";
import { useDesignerContext } from "../DesignerBase/context";
import type { BaseSnapshot, ExtraText } from "../DesignerBase/types";

// three.js ist schwer – Cap-3D-Viewer nur bei Bedarf laden.
const CapViewer = lazy(() => import("./CapViewer").then(m => ({ default: m.CapViewer })));

const DEFAULT_POSITIONS: Record<PosKey, Position> = {
  header: { x: 50, y: 33 }, sub: { x: 50, y: 43 }, body: { x: 50, y: 53 }, detail: { x: 50, y: 63 },
};

const DEFAULT_LETTER: PlacedAsset = { id: "default-letter", assetId: "logos/Letter.svg", x: 50, y: 44, scale: 0.25, rotation: 0, opacity: 1, flipX: false, zIndex: 1 };

// Grouped named-text state to limit prop count
interface MerchText {
  headerText: string; headerFont: string; headerSize: number; headerWeight: string; headerOutline: boolean;
  subText: string; subFont: string; subSize: number; subOutline: boolean;
  bodyText: string; bodyFont: string; bodySize: number; bodyOutline: boolean;
  detailText: string; detailFont: string; detailSize: number;
}

const DEFAULT_TEXT: MerchText = {
  headerText: "", headerFont: "Oswald", headerSize: 36, headerWeight: "700", headerOutline: false,
  subText: "", subFont: "Oswald", subSize: 22, subOutline: false,
  bodyText: "", bodyFont: "Oswald", bodySize: 16, bodyOutline: false,
  detailText: "", detailFont: "Oswald", detailSize: 13,
};

// ── MerchDesignerInner — consumes context ──────────────────────

interface InnerProps {
  side: "front" | "back";
  setSide: (s: "front" | "back") => void;
  shirtColor: "black" | "white";
  setShirtColor: (c: "black" | "white") => void;
  product: MerchProduct;
  setProduct: (p: MerchProduct) => void;
  capMode: "edit" | "view";
  setCapMode: (m: "edit" | "view") => void;
  otherSnap: BaseSnapshot;
  setOtherSnap: (s: BaseSnapshot) => void;
  text: MerchText;
  updateText: (patch: Partial<MerchText>) => void;
}

const toSlug = (s: string) =>
  s.replace(/[^а-яА-ЯіІїЇєЄa-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "merch";

function MerchDesignerInner({ side, setSide, shirtColor, setShirtColor, product, setProduct, capMode, setCapMode, otherSnap, setOtherSnap, text, updateText }: InnerProps) {
  const { t } = useT();
  const {
    strokes, setStrokes, selectedStrokeId, setSelectedStrokeId,
    placedAssets, setPlacedAssets, selectedAsset, allAssets, getAssetSrc,
    positions, setPositions, textAligns, setTextAligns,
    extraTexts, setExtraTexts, selectedTextId, setSelectedTextId,
    mode, brushOpacity, liveStrokePath, chalkColor,
    handlePlace, handleDragPlace, handleUpload, handleUploadStencil,
    updateAssetChalk, updateSelected, deleteSelected,
    deleteSelectedStroke, updateSelectedStroke,
    handleStrokePointerDown, addText,
    logoAssets, illustrationAssets,
    containerRef,
  } = useDesignerContext();

  const canvasRef = useRef<PosterCanvasHandle>(null);
  const textColor = shirtColor === "white" ? "#000000" : "#FFFFFF";

  // ── Responsive scale ────────────────────────────────────────
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => setScale(Math.min(
      (window.innerWidth - 334) / MERCH_SIZE.w,
      (window.innerHeight - 172) / MERCH_SIZE.h, // -172: Navbar + unterer Toolbar/Hinweis-Streifen
      1.4
    ));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  const displayW = MERCH_SIZE.w * scale;
  const displayH = MERCH_SIZE.h * scale;

  // ── Switch side ─────────────────────────────────────────────
  const switchSide = useCallback((newSide: "front" | "back") => {
    if (newSide === side) return;
    setOtherSnap({ strokes, placedAssets, positions, extraTexts });
    setStrokes(otherSnap.strokes);
    setPlacedAssets(otherSnap.placedAssets);
    setPositions(otherSnap.positions);
    setExtraTexts(otherSnap.extraTexts as ExtraText[]);
    setSelectedStrokeId(null);
    setSelectedTextId(null);
    setSide(newSide);
  }, [side, strokes, placedAssets, positions, extraTexts, otherSnap,
      setOtherSnap, setStrokes, setPlacedAssets, setPositions, setExtraTexts,
      setSelectedStrokeId, setSelectedTextId, setSide]);

  // ── Text items (for canvas + export) ───────────────────────
  const textItems = useMemo(() => [
    { key: "header" as PosKey, text: text.headerText, font: text.headerFont, size: text.headerSize, weight: text.headerWeight, color: textColor, align: textAligns.header ?? "center" as Align, outline: text.headerOutline, position: positions.header ?? { x: 50, y: 33 } },
    { key: "sub" as PosKey, text: text.subText, font: text.subFont, size: text.subSize, weight: "600", color: textColor, align: textAligns.sub ?? "center" as Align, outline: text.subOutline, position: positions.sub ?? { x: 50, y: 43 } },
    { key: "body" as PosKey, text: text.bodyText, font: text.bodyFont, size: text.bodySize, weight: "400", color: textColor, align: textAligns.body ?? "center" as Align, outline: text.bodyOutline, position: positions.body ?? { x: 50, y: 53 } },
    { key: "detail" as PosKey, text: text.detailText, font: text.detailFont, size: text.detailSize, weight: "400", color: textColor, align: textAligns.detail ?? "center" as Align, outline: false, position: positions.detail ?? { x: 50, y: 63 } },
    ...extraTexts.map(et => ({ key: et.id, text: et.text, font: et.font, size: et.size, weight: et.weight, color: textColor, align: et.align, outline: et.outline, position: et.position })),
  ], [text, textColor, textAligns, positions, extraTexts]);

  // ── Build scene (for export) ────────────────────────────────
  const buildSceneFrom = useCallback((snap: BaseSnapshot): PosterScene => {
    const p = snap.positions as Record<PosKey, Position>;
    const snapTexts = [
      { key: "header" as PosKey, text: text.headerText, font: text.headerFont, size: text.headerSize, weight: text.headerWeight, color: textColor, align: (textAligns.header ?? "center") as Align, outline: text.headerOutline, position: p.header ?? { x: 50, y: 33 } },
      { key: "sub" as PosKey, text: text.subText, font: text.subFont, size: text.subSize, weight: "600", color: textColor, align: (textAligns.sub ?? "center") as Align, outline: text.subOutline, position: p.sub ?? { x: 50, y: 43 } },
      { key: "body" as PosKey, text: text.bodyText, font: text.bodyFont, size: text.bodySize, weight: "400", color: textColor, align: (textAligns.body ?? "center") as Align, outline: text.bodyOutline, position: p.body ?? { x: 50, y: 53 } },
      { key: "detail" as PosKey, text: text.detailText, font: text.detailFont, size: text.detailSize, weight: "400", color: textColor, align: (textAligns.detail ?? "center") as Align, outline: false, position: p.detail ?? { x: 50, y: 63 } },
      ...(snap.extraTexts as ExtraText[]).map(et => ({ key: et.id, text: et.text, font: et.font, size: et.size, weight: et.weight, color: textColor, align: et.align, outline: et.outline, position: et.position })),
    ];
    return {
      w: MERCH_SIZE.w, h: MERCH_SIZE.h, bg: "rgba(0,0,0,0)",
      pattern: EMPTY_PATTERN, patternStrokes: [], strokes: snap.strokes,
      texts: snapTexts.map(tx => ({ key: tx.key, text: tx.text, font: tx.font, size: tx.size, weight: tx.weight, color: tx.color, align: tx.align, outline: tx.outline, x: tx.position.x, y: tx.position.y })),
      assets: snap.placedAssets.map((a): SceneAsset => { const item = allAssets.find(x => x.id === a.assetId); return { ...a, src: item?.src ?? getAssetSrc(a.assetId), category: item?.category ?? "logos", naturalWidth: item?.naturalWidth, naturalHeight: item?.naturalHeight }; }),
    };
  }, [text, textColor, textAligns, allAssets, getAssetSrc]);

  // ── Cap: Design-Canvas (Textur) + 3D-Snapshot ───────────────
  const [designCanvas, setDesignCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capReady, setCapReady] = useState(false);
  const capViewerRef = useRef<CapViewerHandle>(null);

  // Aktuelles Design auf transparentes Canvas rendern (gleiche Szene wie Export)
  // – dient als Textur fürs 3D-Cap.
  const renderDesign = useCallback(async () => {
    const scene = buildSceneFrom({ strokes, placedAssets, positions, extraTexts });
    const images = await loadSceneImages(scene);
    const texScale = 2;
    const c = document.createElement("canvas");
    c.width = MERCH_SIZE.w * texScale; c.height = MERCH_SIZE.h * texScale;
    const ctx = c.getContext("2d")!;
    ctx.scale(texScale, texScale);
    await renderPosterScene(ctx, scene, images);
    setDesignCanvas(c);
  }, [buildSceneFrom, strokes, placedAssets, positions, extraTexts]);

  useEffect(() => {
    if (product === "cap" && capMode === "view") { setCapReady(false); renderDesign(); }
  }, [product, capMode, renderDesign]);

  const handleCapDownload = useCallback(async () => {
    const blob = await capViewerRef.current?.capture();
    if (blob) downloadBlob(blob, `${toSlug(text.headerText)}-Cap.png`);
  }, [text.headerText]);

  const handleOrder = useCallback(async () => {
    const SCALE = 3;
    const { w, h } = MERCH_SIZE;
    const liveSnap: BaseSnapshot = { strokes, placedAssets, positions, extraTexts };
    const frontSnap = side === "front" ? liveSnap : otherSnap;
    const backSnap  = side === "back"  ? liveSnap : otherSnap;

    async function renderSide(snap: BaseSnapshot, shirtSrc: string): Promise<HTMLCanvasElement> {
      const c = document.createElement("canvas");
      c.width = w * SCALE; c.height = h * SCALE;
      const cx = c.getContext("2d")!;
      const img = await loadImage(shirtSrc);
      cx.drawImage(img, 0, 0, w * SCALE, h * SCALE);
      if (shirtColor === "white") {
        const d = cx.getImageData(0, 0, w * SCALE, h * SCALE);
        for (let i = 0; i < d.data.length; i += 4) { d.data[i] = 255 - d.data[i]; d.data[i + 1] = 255 - d.data[i + 1]; d.data[i + 2] = 255 - d.data[i + 2]; }
        cx.putImageData(d, 0, 0);
      }
      const scene = buildSceneFrom(snap);
      const images = await loadSceneImages(scene);
      cx.scale(SCALE, SCALE);
      await renderPosterScene(cx, scene, images);
      return c;
    }

    const [frontCanvas, backCanvas] = await Promise.all([
      renderSide(frontSnap, FRONT_IMG),
      renderSide(backSnap, BACK_IMG),
    ]);
    const combined = document.createElement("canvas");
    combined.width = frontCanvas.width * 2;
    combined.height = frontCanvas.height;
    const ctx = combined.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, combined.width, combined.height);
    ctx.drawImage(frontCanvas, 0, 0);
    ctx.drawImage(backCanvas, frontCanvas.width, 0);
    const productLabel = MERCH_ITEMS.find(i => i.id === product)?.label ?? "merch";
    combined.toBlob(blob => downloadBlob(blob!, `${toSlug(text.headerText)}-${productLabel}.png`), "image/png");
  }, [side, shirtColor, strokes, placedAssets, positions, extraTexts, otherSnap, buildSceneFrom, product, text.headerText]);

  // ── Text popup panel ────────────────────────────────────────
  const textPanel = (() => {
    if (!selectedTextId) return undefined;
    const u = (k: keyof MerchText) => (v: string | number | boolean) => updateText({ [k]: v } as Partial<MerchText>);
    const namedFields: Record<PosKey, TextFieldState> = {
      header: { text: text.headerText, setText: u("headerText") as (v: string) => void, font: text.headerFont, setFont: u("headerFont") as (v: string) => void, size: text.headerSize, setSize: u("headerSize") as (v: number) => void, sizeMin: 18, sizeMax: 80, weight: text.headerWeight, setWeight: u("headerWeight") as (v: string) => void, outline: text.headerOutline, setOutline: u("headerOutline") as (v: boolean) => void },
      sub: { text: text.subText, setText: u("subText") as (v: string) => void, font: text.subFont, setFont: u("subFont") as (v: string) => void, size: text.subSize, setSize: u("subSize") as (v: number) => void, sizeMin: 12, sizeMax: 50, outline: text.subOutline, setOutline: u("subOutline") as (v: boolean) => void },
      body: { text: text.bodyText, setText: u("bodyText") as (v: string) => void, font: text.bodyFont, setFont: u("bodyFont") as (v: string) => void, size: text.bodySize, setSize: u("bodySize") as (v: number) => void, sizeMin: 10, sizeMax: 36, multiline: true, outline: text.bodyOutline, setOutline: u("bodyOutline") as (v: boolean) => void },
      detail: { text: text.detailText, setText: u("detailText") as (v: string) => void, font: text.detailFont, setFont: u("detailFont") as (v: string) => void, size: text.detailSize, setSize: u("detailSize") as (v: number) => void, sizeMin: 8, sizeMax: 28, multiline: true },
    };
    if ((POS_KEYS as readonly string[]).includes(selectedTextId)) {
      const k = selectedTextId as PosKey;
      return <TextPopup field={namedFields[k]} align={(textAligns[k] ?? "center") as Align} onAlignChange={a => setTextAligns(prev => ({ ...prev, [k]: a }))} fonts={FONTS} onClose={() => setSelectedTextId(null)} />;
    }
    const et = extraTexts.find(t => t.id === selectedTextId);
    if (!et) return undefined;
    const upd = (patch: Partial<ExtraText>) => setExtraTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, ...patch } : t));
    const etField: TextFieldState = { text: et.text, setText: v => upd({ text: v }), font: et.font, setFont: v => upd({ font: v }), size: et.size, setSize: v => upd({ size: v }), sizeMin: 8, sizeMax: 120, multiline: true, weight: et.weight, setWeight: v => upd({ weight: v }), outline: et.outline, setOutline: v => upd({ outline: v }) };
    return <TextPopup field={etField} align={et.align} onAlignChange={a => upd({ align: a })} fonts={FONTS} onClose={() => setSelectedTextId(null)} onDelete={() => { setExtraTexts(prev => prev.filter(t => t.id !== selectedTextId)); setSelectedTextId(null); }} />;
  })();

  // ── Stroke panel ────────────────────────────────────────────
  const strokePanel = (() => {
    if (!selectedStrokeId) return undefined;
    const s = strokes.find(st => st.id === selectedStrokeId);
    if (!s) return undefined;
    const btn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "5px 0", borderRadius: 5, cursor: "pointer", background: active ? "var(--state-active-bg)" : "var(--state-inactive-bg)", border: active ? "1px solid var(--state-active-border)" : "1px solid var(--state-inactive-border)", color: "var(--text-primary)", fontSize: 14 });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.strokeTitle}</span>
          <button onClick={() => setSelectedStrokeId(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
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

  const capView = product === "cap" && capMode === "view";

  return (
    <div className={`${styles.app} chalk-ui`}>
      {!capView && (
      <MerchSidebar
        product={product}
        onProductChange={setProduct}
        shirtColor={shirtColor}
        onColorChange={setShirtColor}
        textPanel={textPanel}
        strokePanel={strokePanel}
        onAddText={addText}
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
        onOrder={product === "cap" ? () => setCapMode("view") : handleOrder}
      />
      )}

      {/* View strip (nur T-Shirt) */}
      {product === "tshirt" && (
      <div style={{ width: 44, flexShrink: 0, background: "var(--surface-panel)", borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4 }}>
        {TSHIRT_VIEWS.map(v => (
          <button key={v.id} onClick={() => switchSide(v.id)} title={v.label}
            style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "'Inria Sans', system-ui, sans-serif", textTransform: "uppercase",
              background: side === v.id ? "var(--state-active-bg)" : "transparent",
              color: side === v.id ? "var(--text-primary)" : "var(--text-muted)",
            }}>
            {v.label}
          </button>
        ))}
      </div>
      )}

      <div className={styles.preview}>
        {/* Produkt-Umschalter (T-Shirt / Cap) */}
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 90, display: "flex", gap: 4, background: "rgba(20,20,20,0.85)", border: "1px solid #2a2a2a", borderRadius: 8, padding: 3 }}>
          {MERCH_ITEMS.map(p => (
            <button key={p.id} onClick={() => setProduct(p.id)}
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: "0.03em", fontFamily: "'Inria Sans', system-ui, sans-serif",
                background: product === p.id ? "#fff" : "transparent", color: product === p.id ? "#111" : "rgba(255,255,255,0.55)" }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Cap: 2D-/3D-Umschalter */}
        {product === "cap" && (
          <div style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)", zIndex: 90, display: "flex", gap: 4, background: "rgba(20,20,20,0.85)", border: "1px solid #2a2a2a", borderRadius: 8, padding: 3 }}>
            {([["edit", "2D"], ["view", "3D"]] as const).map(([m, label]) => (
              <button key={m} onClick={() => setCapMode(m)}
                style={{ padding: "4px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Inria Sans', system-ui, sans-serif",
                  background: capMode === m ? "#fff" : "transparent", color: capMode === m ? "#111" : "rgba(255,255,255,0.55)" }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {capView ? (
          <Suspense fallback={<div style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14, fontFamily: "'Inria Sans', system-ui, sans-serif" }}>{t.capLoading}</div>}>
            {/* Absolut füllen → R3F-Canvas misst echte Pixel (sonst bleibt er 300×150 und die Cap ist unsichtbar). */}
            <div style={{ position: "absolute", inset: 0 }}>
              <CapViewer ref={capViewerRef} design={designCanvas} color={shirtColor} onReady={() => setCapReady(true)} />
            </div>
            <button onClick={handleCapDownload} disabled={!capReady}
              style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 90, padding: "10px 28px", borderRadius: 8, border: "none", cursor: capReady ? "pointer" : "default", background: capReady ? "#fff" : "rgba(255,255,255,0.3)", color: "#111", fontSize: 14, fontWeight: 700, letterSpacing: "0.03em", fontFamily: "'Inria Sans', system-ui, sans-serif" }}>
              {t.order}
            </button>
          </Suspense>
        ) : (
        <DesignerCanvas
          renderBackground={overlays => (
            <TshirtCanvas
              ref={canvasRef}
              side={side}
              shirtColor={shirtColor}
              garment={product === "tshirt"}
              size={MERCH_SIZE}
              scale={scale}
              containerRef={containerRef}
              strokes={strokes}
              liveStrokePath={liveStrokePath}
              liveStrokeColor={chalkColor}
              liveStrokeOpacity={brushOpacity}
              selectedStrokeId={selectedStrokeId}
              onStrokePointerDown={mode === "move" ? handleStrokePointerDown : undefined}
              drawMode={mode === "draw"}
              onBackgroundClick={() => { setSelectedTextId(null); setSelectedStrokeId(null); }}
            >
              {overlays}
            </TshirtCanvas>
          )}
          textItems={textItems}
          displayW={displayW}
          displayH={displayH}
          scale={scale}
        />
        )}
      </div>
    </div>
  );
}

// ── Outer shell — shirt-specific state + DesignerProvider ──────

export function MerchDesigner() {
  const [side, setSide] = useState<"front" | "back">("front");
  const [shirtColor, setShirtColor] = useState<"black" | "white">("black");
  const [product, setProduct] = useState<MerchProduct>("tshirt");
  const [capMode, setCapMode] = useState<"edit" | "view">("edit");
  const [otherSnap, setOtherSnap] = useState<BaseSnapshot>({ strokes: [], placedAssets: [], positions: DEFAULT_POSITIONS, extraTexts: [] });
  const [text, setText] = useState<MerchText>(DEFAULT_TEXT);
  const updateText = useCallback((patch: Partial<MerchText>) => setText(prev => ({ ...prev, ...patch })), []);

  const onClearNamedText = useCallback((key: string) => {
    updateText({ [`${key}Text`]: "" } as Partial<MerchText>);
  }, [updateText]);

  const onCommitNamedText = useCallback((key: string, newText: string) => {
    updateText({ [`${key}Text`]: newText } as Partial<MerchText>);
  }, [updateText]);

  const extraSnapshot = useMemo(() => ({ side, shirtColor, otherSnap }), [side, shirtColor, otherSnap]);

  return (
    <DesignerProvider
      logoRegistry={LOGO_REGISTRY}
      illustrationRegistry={ASSET_REGISTRY}
      storageKey="vholos-merch-uploads"
      aspectRatio={MERCH_SIZE.w / MERCH_SIZE.h}
      initialMargins={{ left: 20, right: 20, top: 18, bottom: 30 }}
      initialPositions={DEFAULT_POSITIONS}
      initialTextAligns={{ header: "center", sub: "center", body: "center", detail: "center" }}
      initialAssets={[DEFAULT_LETTER]}
      extraSnapshot={extraSnapshot}
      onApplyExtraSnapshot={s => { setSide(s.side); setShirtColor(s.shirtColor); setOtherSnap(s.otherSnap); }}
      onClearNamedText={onClearNamedText}
      onCommitNamedText={onCommitNamedText}
      defaultFont={text.headerFont}
    >
      <MerchDesignerInner
        side={side} setSide={setSide}
        shirtColor={shirtColor} setShirtColor={setShirtColor}
        product={product} setProduct={setProduct}
        capMode={capMode} setCapMode={setCapMode}
        otherSnap={otherSnap} setOtherSnap={setOtherSnap}
        text={text} updateText={updateText}
      />
    </DesignerProvider>
  );
}
