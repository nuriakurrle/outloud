import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssetCategory, AssetItem, ChalkStroke, PlacedAsset, Position, ToolMode } from "../../types/poster";
import type { Align } from "../../types/poster";
import { makeFreehandStroke, rerenderStroke, getAllBrushes, createLivePath } from "../../lib/brushStrokes";
import { smartPlace } from "../../lib/smartPlace";
import { ASSET_REGISTRY, LOGO_REGISTRY } from "../../assetRegistry";
import { chalkifyImage, DEFAULT_CHALKIFY, type ChalkifyOptions } from "../../lib/chalkifyImage";
import { type TextFieldState } from "../ChalkPosterGenerator/Sidebar";
import { TextPopup } from "../ChalkPosterGenerator/TextPopup";
import { TextOverlay } from "../ChalkPosterGenerator/TextOverlay";
import { SelectionHandles } from "../ChalkPosterGenerator/SelectionHandles";
import { AssetPanel } from "../ChalkPosterGenerator/AssetPanel";
import { DrawingToolbar } from "../ChalkPosterGenerator/DrawingToolbar";
import { useUndoRedo } from "../ChalkPosterGenerator/useUndoRedo";
import { type PosterScene, type SceneAsset, loadSceneImages, renderPosterScene, loadImage } from "../../lib/posterRender";
import { downloadBlob } from "../../lib/exporter";
import styles from "../../styles/chalkPoster.module.css";
import { makeId, POS_KEYS, type PosKey, FONTS } from "../ChalkPosterGenerator/constants";
import { useT } from "../../i18n";
import { MerchSidebar } from "./MerchSidebar";
import { TshirtCanvas, type PosterCanvasHandle, FRONT_IMG, BACK_IMG } from "./TshirtCanvas";
import { MERCH_SIZE, TSHIRT_VIEWS, EMPTY_PATTERN } from "./constants";

const isMaskAsset = (cat: string) => cat === "strokes" || cat === "shapes";
const isDefaultWhite = (c: string) => c.toLowerCase() === "#ffffff";

const DEFAULT_POSITIONS: Record<PosKey, Position> = {
  header: { x: 50, y: 33 }, sub: { x: 50, y: 43 }, body: { x: 50, y: 53 }, detail: { x: 50, y: 63 },
};

export function MerchDesigner() {
  const { t } = useT();

  // ── Shirt state ────────────────────────────────────────
  const [side, setSide] = useState<"front" | "back">("front");
  const [shirtColor, setShirtColor] = useState<"black" | "white">("black");
  const textColor = shirtColor === "white" ? "#000000" : "#FFFFFF";

  // Inactive side's design — swapped in/out when switching front↔back.
  const [otherSnap, setOtherSnap] = useState<Snapshot>({ strokes: [], placedAssets: [], positions: DEFAULT_POSITIONS, extraTexts: [] });

  // ── Freehand strokes ────────────────────────────────────
  const [strokes, setStrokes] = useState<ChalkStroke[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // ── Drawing tools ───────────────────────────────────────
  const [mode, setMode] = useState<ToolMode>("move");
  const [brushName, setBrushName] = useState("Figma Verite");
  const [brushWidth, setBrushWidth] = useState(0.3);
  const [brushOpacity, setBrushOpacity] = useState(1.0);
  const [chalkColor, setChalkColor] = useState("#FFFFFF");
  const [isDrawing, setIsDrawing] = useState(false);
  const drawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [liveStrokePath, setLiveStrokePath] = useState<string | undefined>();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<PosterCanvasHandle>(null);

  // ── Text ────────────────────────────────────────────────
  const [headerText, setHeaderText] = useState("Вголос!");
  const [headerFont, setHeaderFont] = useState("Oswald");
  const [headerSize, setHeaderSize] = useState(36);
  const [headerWeight, setHeaderWeight] = useState("700");
  const [headerOutline, setHeaderOutline] = useState(false);
  const [subText, setSubText] = useState("");
  const [subFont, setSubFont] = useState("Oswald");
  const [subSize, setSubSize] = useState(22);
  const [subOutline, setSubOutline] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const [bodyFont, setBodyFont] = useState("Oswald");
  const [bodySize, setBodySize] = useState(16);
  const [bodyOutline, setBodyOutline] = useState(false);
  const [detailText, setDetailText] = useState("");
  const [detailFont, setDetailFont] = useState("Oswald");
  const [detailSize, setDetailSize] = useState(13);
  const [detailOutline] = useState(false);

  const [positions, setPositions] = useState<Record<PosKey, Position>>(DEFAULT_POSITIONS);
  const [textAligns, setTextAligns] = useState<Record<PosKey, Align>>({ header: "center", sub: "center", body: "center", detail: "center" });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  interface ExtraText { id: string; text: string; font: string; size: number; weight: string; align: Align; outline: boolean; position: Position; }
  const [extraTexts, setExtraTexts] = useState<ExtraText[]>([]);
  const extraTextsRef = useRef<ExtraText[]>([]);
  useEffect(() => { extraTextsRef.current = extraTexts; }, [extraTexts]);

  // ── Assets ──────────────────────────────────────────────
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [customAssets, setCustomAssets] = useState<AssetItem[]>([]);
  const imgRatios = useRef<Map<string, number>>(new Map());

  const logoAssets = useMemo(() => [...LOGO_REGISTRY, ...customAssets.filter(a => a.category === "logos")], [customAssets]);
  const illustrationAssets = useMemo(() => [...ASSET_REGISTRY, ...customAssets.filter(a => a.category !== "logos")], [customAssets]);
  const allAssets = useMemo(() => [...logoAssets, ...illustrationAssets], [logoAssets, illustrationAssets]);

  // ── Undo/Redo ───────────────────────────────────────────
  type Snapshot = { strokes: ChalkStroke[]; placedAssets: PlacedAsset[]; positions: Record<PosKey, Position>; extraTexts: ExtraText[]; };
  const getAssetSrc = useCallback((id: string) => allAssets.find(a => a.id === id)?.src ?? "", [allAssets]);
  const liveSnapshot: Snapshot = { strokes, placedAssets, positions, extraTexts };
  const applySnapshot = useCallback((s: Snapshot) => {
    setStrokes(s.strokes); setPlacedAssets(s.placedAssets); setPositions(s.positions); setExtraTexts(s.extraTexts);
  }, []);
  const { commit, undo, redo, canUndo, canRedo } = useUndoRedo(liveSnapshot, applySnapshot);

  const switchSide = useCallback((newSide: "front" | "back") => {
    if (newSide === side) return;
    setOtherSnap({ strokes, placedAssets, positions, extraTexts });
    setStrokes(otherSnap.strokes); setPlacedAssets(otherSnap.placedAssets);
    setPositions(otherSnap.positions); setExtraTexts(otherSnap.extraTexts);
    setSide(newSide);
    setSelectedAssetId(null); setSelectedStrokeId(null); setSelectedTextId(null);
  }, [side, strokes, placedAssets, positions, extraTexts, otherSnap]);

  // ── Drag ────────────────────────────────────────────────
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const strokeDrag = useRef<{ id: string; cx: number; cy: number; offX: number; offY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(positions);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  const placedAssetsRef = useRef(placedAssets);
  useEffect(() => { placedAssetsRef.current = placedAssets; }, [placedAssets]);

  // ── Responsive scale ────────────────────────────────────
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => setScale(Math.min(
      (window.innerWidth - 334) / MERCH_SIZE.w,  // sidebar(290) + strip(44)
      (window.innerHeight - 40) / MERCH_SIZE.h,
      1.4
    ));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const displayW = MERCH_SIZE.w * scale;
  const displayH = MERCH_SIZE.h * scale;

  // ── Snap lines ──────────────────────────────────────────
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }[]>([]);

  // ── Drag handler ─────────────────────────────────────────
  const beginDrag = useCallback((id: string, curX: number, curY: number, e: React.PointerEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    commit();
    setDragging(id);
    strokeDrag.current = null;
    dragOffset.current = { x: e.clientX - rect.left - (curX / 100) * rect.width, y: e.clientY - rect.top - (curY / 100) * rect.height };
  }, [commit]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (strokeDrag.current?.id === dragging) {
        const sd = strokeDrag.current;
        const offX = Math.max(-60, Math.min(60, sd.offX + ((e.clientX - sd.cx) / rect.width) * 100));
        const offY = Math.max(-60, Math.min(60, sd.offY + ((e.clientY - sd.cy) / rect.height) * 100));
        setStrokes(prev => prev.map(s => s.id === dragging ? { ...s, offsetX: offX, offsetY: offY } : s));
        return;
      }
      const clampX = (v: number) => Math.max(20, Math.min(80, v));
      const clampY = (v: number) => Math.max(18, Math.min(70, v));
      let px = clampX(((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100);
      let py = clampY(((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100);
      // snap
      const SNAP = 2;
      const targets = [...POS_KEYS.filter(k => k !== dragging).map(k => positionsRef.current[k]), ...extraTextsRef.current.filter(t => t.id !== dragging).map(t => t.position), ...placedAssetsRef.current.filter(a => a.id !== dragging).map(a => ({ x: a.x, y: a.y }))];
      const lines: { x?: number; y?: number }[] = [];
      for (const t of targets) { if (Math.abs(px - t.x) < SNAP) { px = t.x; lines.push({ x: t.x }); break; } }
      for (const t of targets) { if (Math.abs(py - t.y) < SNAP) { py = t.y; lines.push({ y: t.y }); break; } }
      setSnapLines(lines);
      if ((POS_KEYS as readonly string[]).includes(dragging)) setPositions(prev => ({ ...prev, [dragging as PosKey]: { x: px, y: py } }));
      else if (extraTextsRef.current.some(t => t.id === dragging)) setExtraTexts(prev => prev.map(t => t.id === dragging ? { ...t, position: { x: px, y: py } } : t));
      else setPlacedAssets(prev => prev.map(a => a.id === dragging ? { ...a, x: px, y: py } : a));
    };
    const onUp = () => { setDragging(null); strokeDrag.current = null; setSnapLines([]); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging]);

  // ── Asset actions ────────────────────────────────────────
  const handlePlace = useCallback((assetId: string) => {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;
    const existing = [...Object.values(positions), ...placedAssets.map(p => ({ x: p.x, y: p.y }))];
    const rawPos = smartPlace(asset, existing, MERCH_SIZE.w / MERCH_SIZE.h);
    const pos = { x: Math.max(20, Math.min(80, rawPos.x)), y: Math.max(18, Math.min(70, rawPos.y)) };
    const maxZ = placedAssets.reduce((m, p) => Math.max(m, p.zIndex), 0);
    const id = makeId();
    const isMask = isMaskAsset(asset.category);
    setPlacedAssets(prev => [...prev, { id, assetId, x: pos.x, y: pos.y, scale: asset.defaultScale, rotation: 0, opacity: 1, flipX: false, zIndex: maxZ + 1, ...(isMask ? { scaleY: 1, flipY: false, tint: isDefaultWhite(chalkColor) ? undefined : chalkColor } : {}) }]);
    setSelectedAssetId(id);
  }, [allAssets, placedAssets, positions, chalkColor]);

  const handleDragPlace = useCallback((assetId: string, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    const x = Math.max(20, Math.min(80, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(18, Math.min(70, ((clientY - rect.top) / rect.height) * 100));
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;
    commit();
    const maxZ = placedAssets.reduce((m, p) => Math.max(m, p.zIndex), 0);
    const id = makeId();
    const isMask = isMaskAsset(asset.category);
    setPlacedAssets(prev => [...prev, { id, assetId, x, y, scale: asset.defaultScale, rotation: 0, opacity: 1, flipX: false, zIndex: maxZ + 1, ...(isMask ? { scaleY: 1, flipY: false, tint: isDefaultWhite(chalkColor) ? undefined : chalkColor } : {}) }]);
    setSelectedAssetId(id);
  }, [allAssets, placedAssets, chalkColor, commit]);

  const handleUpload = useCallback((file: File, category: AssetCategory = "icons") => {
    const url = URL.createObjectURL(file);
    const id = `custom/${makeId()}`;
    const isSvg = /svg/i.test(file.type);
    const asset: AssetItem = { id, name: file.name.replace(/\.(svg|png|jpe?g)$/i, ""), category, src: url, defaultScale: 0.25, anchor: "center" };
    if (isSvg) { setCustomAssets(prev => [...prev, asset]); return; }
    asset.originalSrc = url; asset.chalk = { ...DEFAULT_CHALKIFY, enabled: true };
    setCustomAssets(prev => [...prev, asset]);
    chalkifyImage(url, DEFAULT_CHALKIFY).then(dataUrl => setCustomAssets(prev => prev.map(a => a.id === id ? { ...a, src: dataUrl } : a))).catch(() => {});
  }, []);

  const handleUploadStencil = useCallback((dataUrl: string, name: string, category: AssetCategory = "icons") => {
    setCustomAssets(prev => [...prev, { id: `custom/${makeId()}`, name, category, src: dataUrl, defaultScale: 0.25, anchor: "center" } as AssetItem]);
  }, []);

  const updateAssetChalk = useCallback((assetId: string, patch: Partial<ChalkifyOptions & { enabled: boolean }>) => {
    setCustomAssets(prev => {
      const target = prev.find(a => a.id === assetId);
      if (!target?.originalSrc) return prev;
      const next = { ...DEFAULT_CHALKIFY, enabled: true, ...target.chalk, ...patch };
      if (!next.enabled) return prev.map(a => a.id === assetId ? { ...a, chalk: next, src: a.originalSrc! } : a);
      chalkifyImage(target.originalSrc, next).then(dataUrl => setCustomAssets(cur => cur.map(a => a.id === assetId ? { ...a, src: dataUrl } : a)));
      return prev.map(a => a.id === assetId ? { ...a, chalk: next } : a);
    });
  }, []);

  const updateSelected = useCallback((patch: Partial<PlacedAsset>) => {
    if (!selectedAssetId) return;
    setPlacedAssets(prev => prev.map(a => a.id === selectedAssetId ? { ...a, ...patch } : a));
  }, [selectedAssetId]);

  const deleteSelected = useCallback(() => {
    if (!selectedAssetId) return;
    setPlacedAssets(prev => prev.filter(a => a.id !== selectedAssetId)); setSelectedAssetId(null);
  }, [selectedAssetId]);

  const handleLayer = useCallback((dir: 1 | -1) => {
    if (!selectedAssetId) return;
    setPlacedAssets(prev => { const zs = prev.map(p => p.zIndex); const target = dir === 1 ? Math.max(...zs) + 1 : Math.min(...zs) - 1; return prev.map(a => a.id === selectedAssetId ? { ...a, zIndex: target } : a); });
  }, [selectedAssetId]);

  // ── Stroke actions ────────────────────────────────────────
  const deleteSelectedStroke = useCallback(() => {
    if (!selectedStrokeId) return;
    commit(); setStrokes(prev => prev.filter(s => s.id !== selectedStrokeId)); setSelectedStrokeId(null);
  }, [selectedStrokeId, commit]);

  const updateSelectedStroke = useCallback((patch: Partial<{ color: string; opacity: number; brushName: string; strokeWidth: number }>) => {
    if (!selectedStrokeId) return;
    setStrokes(prev => prev.map(s => {
      if (s.id !== selectedStrokeId) return s;
      const next = { ...s, ...patch };
      if (patch.brushName !== undefined || patch.strokeWidth !== undefined) next.svgPath = rerenderStroke(next, next.brushName, next.strokeWidth);
      return next;
    }));
  }, [selectedStrokeId]);

  // ── Text actions ──────────────────────────────────────────
  const addText = useCallback(() => {
    const id = makeId();
    commit();
    setExtraTexts(prev => [...prev, { id, text: "Text", font: headerFont, size: 24, weight: "400", align: "center", outline: false, position: { x: 50, y: 50 } }]);
    setSelectedTextId(id);
  }, [commit, headerFont]);

  const deleteText = useCallback(() => {
    if (!selectedTextId) return;
    commit();
    if ((POS_KEYS as readonly string[]).includes(selectedTextId)) {
      const setters: Record<string, (v: string) => void> = { header: setHeaderText, sub: setSubText, body: setBodyText, detail: setDetailText };
      setters[selectedTextId]?.("");
    } else {
      setExtraTexts(prev => prev.filter(t => t.id !== selectedTextId));
    }
    setSelectedTextId(null);
  }, [selectedTextId, commit]);

  // ── Text pointer down ─────────────────────────────────────
  const handlePointerDown = useCallback((key: string, e: React.PointerEvent) => {
    setSelectedTextId(key); setSelectedAssetId(null); setSelectedStrokeId(null); setSelectedPatternId(null);
    if ((POS_KEYS as readonly string[]).includes(key)) beginDrag(key, positions[key as PosKey].x, positions[key as PosKey].y, e);
    else { const et = extraTextsRef.current.find(t => t.id === key); if (et) beginDrag(key, et.position.x, et.position.y, e); }
  }, [beginDrag, positions]);

  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  const handleStrokePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (mode !== "move") return;
    e.preventDefault(); e.stopPropagation();
    const s = strokes.find(st => st.id === id);
    if (!s) return;
    commit(); setSelectedStrokeId(id); setSelectedTextId(null); setSelectedAssetId(null); setDragging(id);
    strokeDrag.current = { id, cx: e.clientX, cy: e.clientY, offX: s.offsetX, offY: s.offsetY };
  }, [mode, strokes, commit]);

  const handleAssetPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    const a = placedAssets.find(p => p.id === id);
    if (!a) return;
    setSelectedAssetId(id); setSelectedTextId(null);
    beginDrag(id, a.x, a.y, e);
  }, [beginDrag, placedAssets]);

  // ── Drawing ────────────────────────────────────────────────
  const getPointerPercent = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  }, []);

  const handleDrawStart = useCallback((e: React.PointerEvent) => {
    if (mode !== "draw") return;
    e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDrawing(true); drawPointsRef.current = [getPointerPercent(e)]; setLiveStrokePath(undefined);
  }, [mode, getPointerPercent]);

  const handleDrawMove = useCallback((e: React.PointerEvent) => {
    if (mode === "draw") setCursorPos({ x: e.clientX, y: e.clientY });
    if (!isDrawing) return;
    const pos = getPointerPercent(e);
    const pts = drawPointsRef.current;
    const last = pts[pts.length - 1];
    if (Math.hypot(pos.x - last.x, pos.y - last.y) > 0.5) {
      drawPointsRef.current = [...pts, pos];
      if (drawPointsRef.current.length >= 2) setLiveStrokePath(createLivePath(drawPointsRef.current, brushName, brushWidth));
    }
  }, [mode, isDrawing, getPointerPercent, brushName, brushWidth]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pts = drawPointsRef.current; drawPointsRef.current = []; setLiveStrokePath(undefined);
    if (pts.length < 2) return;
    commit();
    setStrokes(prev => [...prev, makeFreehandStroke(pts, brushName, brushWidth, chalkColor, brushOpacity, prev.length)]);
  }, [isDrawing, commit, brushName, brushWidth, brushOpacity, chalkColor]);

  // ── Keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") { if (selectedStrokeId) deleteSelectedStroke(); else if (selectedAssetId) deleteSelected(); return; }
      if (e.key === "d" || e.key === "D") setMode("draw");
      else if (e.key === "v" || e.key === "V" || e.key === "Escape") setMode("move");
      else if (e.key === "[") setBrushWidth(w => Math.max(0.01, Math.round((w - 0.02) * 100) / 100));
      else if (e.key === "]") setBrushWidth(w => Math.min(1, Math.round((w + 0.02) * 100) / 100));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAssetId, deleteSelected, selectedStrokeId, deleteSelectedStroke, undo, redo]);

  // ── Scene / Export ─────────────────────────────────────────
  const selectedAsset = placedAssets.find(a => a.id === selectedAssetId) ?? null;

  const textItems = [
    { key: "header" as PosKey, text: headerText, font: headerFont, size: headerSize, weight: headerWeight, color: textColor, align: textAligns.header, outline: headerOutline, position: positions.header },
    { key: "sub" as PosKey, text: subText, font: subFont, size: subSize, weight: "600", color: textColor, align: textAligns.sub, outline: subOutline, position: positions.sub },
    { key: "body" as PosKey, text: bodyText, font: bodyFont, size: bodySize, weight: "400", color: textColor, align: textAligns.body, outline: bodyOutline, position: positions.body },
    { key: "detail" as PosKey, text: detailText, font: detailFont, size: detailSize, weight: "400", color: textColor, align: textAligns.detail, outline: detailOutline, position: positions.detail },
    ...extraTexts.map(et => ({ key: et.id, text: et.text, font: et.font, size: et.size, weight: et.weight, color: textColor, align: et.align, outline: et.outline, position: et.position })),
  ];

  const buildSceneFrom = useCallback((snap: Snapshot): PosterScene => {
    const snapTexts = [
      { key: "header" as PosKey, text: headerText, font: headerFont, size: headerSize, weight: headerWeight, color: textColor, align: textAligns.header, outline: headerOutline, position: snap.positions.header },
      { key: "sub" as PosKey, text: subText, font: subFont, size: subSize, weight: "600", color: textColor, align: textAligns.sub, outline: subOutline, position: snap.positions.sub },
      { key: "body" as PosKey, text: bodyText, font: bodyFont, size: bodySize, weight: "400", color: textColor, align: textAligns.body, outline: bodyOutline, position: snap.positions.body },
      { key: "detail" as PosKey, text: detailText, font: detailFont, size: detailSize, weight: "400", color: textColor, align: textAligns.detail, outline: detailOutline, position: snap.positions.detail },
      ...snap.extraTexts.map(et => ({ key: et.id, text: et.text, font: et.font, size: et.size, weight: et.weight, color: textColor, align: et.align, outline: et.outline, position: et.position })),
    ];
    return {
      w: MERCH_SIZE.w, h: MERCH_SIZE.h, bg: "rgba(0,0,0,0)",
      pattern: EMPTY_PATTERN, patternStrokes: [], strokes: snap.strokes,
      texts: snapTexts.map(t => ({ key: t.key, text: t.text, font: t.font, size: t.size, weight: t.weight, color: t.color, align: t.align, outline: t.outline, x: t.position.x, y: t.position.y })),
      assets: snap.placedAssets.map((a): SceneAsset => { const item = allAssets.find(x => x.id === a.assetId); return { ...a, src: item?.src ?? getAssetSrc(a.assetId), category: item?.category ?? "logos", naturalWidth: item?.naturalWidth, naturalHeight: item?.naturalHeight }; }),
    };
  }, [headerText, headerFont, headerSize, headerWeight, textColor, textAligns, headerOutline, subText, subFont, subSize, subOutline, bodyText, bodyFont, bodySize, bodyOutline, detailText, detailFont, detailSize, detailOutline, allAssets, getAssetSrc]);

  const buildScene = useCallback(() => buildSceneFrom({ strokes, placedAssets, positions, extraTexts }), [buildSceneFrom, strokes, placedAssets, positions, extraTexts]);

  const handleOrder = useCallback(async () => {
    const SCALE = 3;
    const { w, h } = MERCH_SIZE;
    const liveSnap: Snapshot = { strokes, placedAssets, positions, extraTexts };
    const frontSnap = side === "front" ? liveSnap : otherSnap;
    const backSnap  = side === "back"  ? liveSnap : otherSnap;

    async function renderSide(snap: Snapshot, shirtSrc: string): Promise<HTMLCanvasElement> {
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
    combined.toBlob(blob => downloadBlob(blob!, "merch-order.png"), "image/png");
  }, [side, shirtColor, strokes, placedAssets, positions, extraTexts, otherSnap, buildSceneFrom]);

  // ── Sidebar panels ─────────────────────────────────────────
  const headerField: TextFieldState = { text: headerText, setText: setHeaderText, font: headerFont, setFont: setHeaderFont, size: headerSize, setSize: setHeaderSize, sizeMin: 18, sizeMax: 80, weight: headerWeight, setWeight: setHeaderWeight, outline: headerOutline, setOutline: setHeaderOutline };
  const subField: TextFieldState = { text: subText, setText: setSubText, font: subFont, setFont: setSubFont, size: subSize, setSize: setSubSize, sizeMin: 12, sizeMax: 50, outline: subOutline, setOutline: setSubOutline };
  const bodyField: TextFieldState = { text: bodyText, setText: setBodyText, font: bodyFont, setFont: setBodyFont, size: bodySize, setSize: setBodySize, sizeMin: 10, sizeMax: 36, multiline: true, outline: bodyOutline, setOutline: setBodyOutline };
  const detailField: TextFieldState = { text: detailText, setText: setDetailText, font: detailFont, setFont: setDetailFont, size: detailSize, setSize: setDetailSize, sizeMin: 8, sizeMax: 28, multiline: true };

  const textPanel = (() => {
    if (!selectedTextId) return undefined;
    const namedFields: Record<PosKey, TextFieldState> = { header: headerField, sub: subField, body: bodyField, detail: detailField };
    if ((POS_KEYS as readonly string[]).includes(selectedTextId)) {
      const k = selectedTextId as PosKey;
      return <TextPopup field={namedFields[k]} align={textAligns[k]} onAlignChange={a => setTextAligns(prev => ({ ...prev, [k]: a }))} fonts={FONTS} onClose={() => setSelectedTextId(null)} />;
    }
    const et = extraTexts.find(t => t.id === selectedTextId);
    if (!et) return undefined;
    const upd = (patch: Partial<ExtraText>) => setExtraTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, ...patch } : t));
    const etField: TextFieldState = { text: et.text, setText: v => upd({ text: v }), font: et.font, setFont: v => upd({ font: v }), size: et.size, setSize: v => upd({ size: v }), sizeMin: 8, sizeMax: 120, multiline: true, weight: et.weight, setWeight: v => upd({ weight: v }), outline: et.outline, setOutline: v => upd({ outline: v }) };
    return <TextPopup field={etField} align={et.align} onAlignChange={a => upd({ align: a })} fonts={FONTS} onClose={() => setSelectedTextId(null)} onDelete={() => { setExtraTexts(prev => prev.filter(t => t.id !== selectedTextId)); setSelectedTextId(null); }} />;
  })();

  const strokePanel = (() => {
    if (!selectedStrokeId) return undefined;
    const s = strokes.find(st => st.id === selectedStrokeId);
    if (!s) return undefined;
    const btn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "5px 0", borderRadius: 5, cursor: "pointer", background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)", border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.12)", color: "#f5f2ed", fontSize: 14 });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.strokeTitle}</span>
          <button onClick={() => setSelectedStrokeId(null)} style={{ background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[{ label: t.colorWhite, hex: "#FFFFFF" }, { label: t.colorBlack, hex: "#000000" }].map(c => <button key={c.hex} onClick={() => updateSelectedStroke({ color: c.hex })} style={btn(s.color.toUpperCase() === c.hex)}>{c.label}</button>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#888", fontSize: 13, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(s.opacity * 100)}%</span>
          <input type="range" min={10} max={100} value={Math.round(s.opacity * 100)} onChange={e => updateSelectedStroke({ opacity: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: "#fff", cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#888", fontSize: 13, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(s.strokeWidth * 100)}%</span>
          <input type="range" min={1} max={100} value={Math.round(s.strokeWidth * 100)} onChange={e => updateSelectedStroke({ strokeWidth: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: "#fff", cursor: "pointer" }} />
        </div>
        <select value={s.brushName} onChange={e => updateSelectedStroke({ brushName: e.target.value })} style={{ background: "#252525", border: "1px solid #3a3a3a", color: "#ddd", borderRadius: 5, padding: "8px 9px", fontSize: 15, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }}>
          {getAllBrushes().map(b => <option key={b.name} value={b.name}>{b.name.replace("Figma ", "")}</option>)}
        </select>
        <button onClick={deleteSelectedStroke} style={{ padding: "7px 0", borderRadius: 6, background: "rgba(240,100,100,0.12)", border: "1px solid rgba(240,100,100,0.35)", color: "#f08080", fontSize: 14, cursor: "pointer" }}>{t.deleteLabel}</button>
      </div>
    );
  })();

  return (
    <div className={`${styles.app} chalk-ui`}>
      <MerchSidebar
        shirtColor={shirtColor}
        onColorChange={setShirtColor}
        textPanel={textPanel}
        strokePanel={strokePanel}
        onAddText={addText}
        logoSection={
          <AssetPanel assets={logoAssets} onPlace={handlePlace} onDragPlace={handleDragPlace} onUpload={file => handleUpload(file, "logos")}
            onUploadStencil={(dataUrl, name) => handleUploadStencil(dataUrl, name, "logos")}
            selected={allAssets.find(a => a.id === selectedAsset?.assetId)?.category === "logos" ? selectedAsset : null}
            onUpdateSelected={updateSelected} onDeleteSelected={deleteSelected} onLayer={handleLayer} onChalkChange={updateAssetChalk} />
        }
        illustrationSection={
          <AssetPanel assets={illustrationAssets} onPlace={handlePlace} onDragPlace={handleDragPlace} onUpload={file => handleUpload(file, "icons")}
            onUploadStencil={(dataUrl, name) => handleUploadStencil(dataUrl, name, "icons")}
            selected={allAssets.find(a => a.id === selectedAsset?.assetId)?.category !== "logos" ? selectedAsset : null}
            onUpdateSelected={updateSelected} onDeleteSelected={deleteSelected} onLayer={handleLayer} onChalkChange={updateAssetChalk} />
        }
        onOrder={handleOrder}
      />

      {/* View strip: front / back */}
      <div style={{ width: 44, flexShrink: 0, background: "#141414", borderRight: "1px solid #2a2a2a", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4 }}>
        {TSHIRT_VIEWS.map(v => (
          <button key={v.id} onClick={() => switchSide(v.id)} title={v.label}
            style={{ width: 34, height: 34, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "'Inria Sans', system-ui, sans-serif", textTransform: "uppercase",
              background: side === v.id ? "rgba(255,255,255,0.15)" : "transparent",
              color: side === v.id ? "#fff" : "rgba(255,255,255,0.35)",
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Canvas area */}
      <div className={styles.preview}>
        <TshirtCanvas
          ref={canvasRef}
          side={side}
          shirtColor={shirtColor}
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
          onBackgroundClick={() => { setSelectedAssetId(null); setSelectedStrokeId(null); setSelectedTextId(null); setSelectedPatternId(null); }}
        >
          {/* Snap lines */}
          {snapLines.length > 0 && (
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 80, overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {snapLines.map((l, i) => l.x !== undefined ? <line key={i} x1={l.x} y1={0} x2={l.x} y2={100} stroke="#4af" strokeWidth={0.4} strokeDasharray="2 1.5" /> : <line key={i} x1={0} y1={l.y} x2={100} y2={l.y!} stroke="#4af" strokeWidth={0.4} strokeDasharray="2 1.5" />)}
            </svg>
          )}

          {/* Placed assets */}
          {[...placedAssets].sort((a, b) => a.zIndex - b.zIndex).map(asset => {
            const item = allAssets.find(a => a.id === asset.assetId);
            if (item && isMaskAsset(item.category)) {
              const nw = item.naturalWidth ?? 1; const nh = item.naturalHeight ?? 1;
              const widthPx = asset.scale * displayW; const heightPx = widthPx * (nh / nw);
              return (
                <div key={asset.id} onPointerDown={e => handleAssetPointerDown(asset.id, e)}
                  style={{ position: "absolute", left: `${asset.x}%`, top: `${asset.y}%`, width: widthPx, height: heightPx, transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${asset.flipX ? -1 : 1}, ${asset.scaleY ?? 1})`, transformOrigin: "center", opacity: asset.opacity, zIndex: asset.zIndex, background: asset.tint || "#e8e5e0", WebkitMaskImage: `url("${item.src}")`, maskImage: `url("${item.src}")`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", cursor: dragging === asset.id ? "grabbing" : "grab", pointerEvents: "auto", userSelect: "none" }} />
              );
            }
            return (
              <img key={asset.id} src={getAssetSrc(asset.assetId)} alt="" draggable={false}
                onLoad={e => { const im = e.currentTarget; if (im.naturalWidth > 0) imgRatios.current.set(asset.assetId, im.naturalHeight / im.naturalWidth); }}
                onPointerDown={e => handleAssetPointerDown(asset.id, e)}
                style={{ position: "absolute", left: `${asset.x}%`, top: `${asset.y}%`, width: `${asset.scale * displayW}px`, height: "auto", transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${asset.flipX ? -1 : 1}, ${asset.scaleY ?? 1})`, transformOrigin: "center", opacity: asset.opacity, zIndex: asset.zIndex, cursor: dragging === asset.id ? "grabbing" : "grab", pointerEvents: "auto", userSelect: "none" }} />
            );
          })}

          {/* Selection handles */}
          {selectedAsset && (() => {
            const it = allAssets.find(x => x.id === selectedAsset.assetId);
            const baseRatio = it && isMaskAsset(it.category) && it.naturalWidth ? it.naturalHeight! / it.naturalWidth : imgRatios.current.get(selectedAsset.assetId) ?? 1;
            const baseW = selectedAsset.scale * displayW;
            return <SelectionHandles asset={selectedAsset} containerRef={containerRef} widthPx={baseW * (selectedAsset.scaleX ?? 1)} heightPx={baseW * baseRatio * (selectedAsset.scaleY ?? 1)} onStart={commit} onChange={updateSelected} />;
          })()}

          {/* Trash bin */}
          {(selectedAsset || selectedStrokeId || selectedTextId) && (
            <button data-no-chalk onClick={() => { if (selectedAsset) { commit(); deleteSelected(); } else if (selectedStrokeId) deleteSelectedStroke(); else if (selectedTextId) deleteText(); }}
              style={{ position: "absolute", top: 8, right: 8, zIndex: 200, background: "rgba(20,20,20,0.85)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#f08080", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}
              title={t.deleteLabel}>🗑</button>
          )}

          {/* Text overlays */}
          {textItems.map(item => (
            <TextOverlay key={item.key} id={item.key} text={item.text} font={item.font} size={item.size} weight={item.weight} color={item.color} align={item.align} outline={item.outline} position={item.position} scale={scale} dragging={dragging === item.key} selected={selectedTextId === item.key} onPointerDown={handlePointerDown} />
          ))}

          {/* Draw capture */}
          {mode === "draw" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 61, pointerEvents: "auto", cursor: "none", touchAction: "none" }}
              onPointerDown={handleDrawStart} onPointerMove={handleDrawMove} onPointerUp={handleDrawEnd}
              onPointerLeave={() => { handleDrawEnd(); setCursorPos(null); }} />
          )}
        </TshirtCanvas>

        {/* Chalk cursor */}
        {mode === "draw" && cursorPos && (
          <div className={styles.drawCursor} style={{ left: cursorPos.x, top: cursorPos.y, width: brushWidth * 20 * scale, height: brushWidth * 20 * scale, borderColor: `${chalkColor}88`, borderStyle: "solid" }} />
        )}

        <DrawingToolbar mode={mode} setMode={setMode} chalkColor={chalkColor} setChalkColor={setChalkColor} brushName={brushName} setBrushName={setBrushName} brushWidth={brushWidth} setBrushWidth={setBrushWidth} brushOpacity={brushOpacity} setBrushOpacity={setBrushOpacity} onUndo={undo} canUndo={canUndo} onRedo={redo} canRedo={canRedo} />

        <p className={styles.previewHint}>{mode === "draw" ? t.hintDraw : t.hintMove}</p>
      </div>
    </div>
  );
}
