import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignerContext } from "./context";
import type { BaseSnapshot, DesignerContextValue, DesignerProviderProps, ExtraText } from "./types";
import { usePlacedAssets } from "./usePlacedAssets";
import { useDrawing } from "./useDrawing";
import { useDrag } from "./useDrag";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { rerenderStroke } from "../../lib/brushStrokes";
import type { Align, ChalkStroke } from "../../types/poster";

const makeId = () => crypto.randomUUID();

export function DesignerProvider<TExtra extends object = object>({
  logoRegistry,
  illustrationRegistry,
  storageKey,
  aspectRatio,
  initialPositions,
  initialTextAligns,
  initialAssets,
  initialMargins,
  extraSnapshot,
  onApplyExtraSnapshot,
  onBuildNewAsset,
  onClearNamedText,
  onCommitNamedText,
  onDeleteExtra,
  defaultFont = "Oswald",
  children,
}: DesignerProviderProps<TExtra>) {
  // ── Raw state ────────────────────────────────────────────────
  const [strokes, setStrokes] = useState<ChalkStroke[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [extraTexts, setExtraTexts] = useState<ExtraText[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(initialPositions ?? {});
  const [textAligns, setTextAligns] = useState<Record<string, Align>>(initialTextAligns ?? {});
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // ── Margins (user-configurable safe zone, in %) ───────────────
  const [margins, setMargins] = useState(initialMargins ?? { left: 0, right: 0, top: 0, bottom: 0 });
  const clampX = useCallback((v: number) => Math.max(margins.left, Math.min(100 - margins.right, v)), [margins]);
  const clampY = useCallback((v: number) => Math.max(margins.top,  Math.min(100 - margins.bottom, v)), [margins]);

  // ── Refs for event handler closures ─────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(positions);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  const extraTextsRef = useRef(extraTexts);
  useEffect(() => { extraTextsRef.current = extraTexts; }, [extraTexts]);

  // ── commitRef breaks circular dependency ─────────────────────
  const commitRef = useRef<() => void>(() => {});
  const commit = useCallback(() => commitRef.current(), []);

  // ── Drawing (before assets so chalkColor is available) ───────
  const drawing = useDrawing({ containerRef, clampX, clampY, commit, setStrokes });

  // ── Placed assets ────────────────────────────────────────────
  const assets = usePlacedAssets({
    logoRegistry, illustrationRegistry, storageKey,
    containerRef, positionsRef, clampX, clampY, aspectRatio,
    chalkColor: drawing.chalkColor,
    onBuildNewAsset, initialAssets,
    commit,
  });
  const placedAssetsRef = useRef(assets.placedAssets);
  useEffect(() => { placedAssetsRef.current = assets.placedAssets; }, [assets.placedAssets]);

  // ── Undo/Redo ────────────────────────────────────────────────
  type FullSnapshot = BaseSnapshot & TExtra;
  const liveSnapshot = useMemo((): FullSnapshot => ({
    strokes, placedAssets: assets.placedAssets, positions, extraTexts,
    ...extraSnapshot,
  }), [strokes, assets.placedAssets, positions, extraTexts, extraSnapshot]);

  const applySnapshot = useCallback((s: FullSnapshot) => {
    setStrokes(s.strokes);
    assets.setPlacedAssets(s.placedAssets);
    setPositions(s.positions);
    setExtraTexts(s.extraTexts);
    onApplyExtraSnapshot(s);
  // assets.setPlacedAssets is a stable dispatch — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onApplyExtraSnapshot]);

  const undoRedo = useUndoRedo(liveSnapshot, applySnapshot);
  commitRef.current = undoRedo.commit;

  // ── Drag ─────────────────────────────────────────────────────
  const getElementRect = useCallback(
    (id: string): DOMRect | null =>
      containerRef.current?.querySelector(`[data-design-id="${id}"]`)?.getBoundingClientRect() ?? null,
    []
  );

  const drag = useDrag({
    containerRef, positionsRef, extraTextsRef, placedAssetsRef,
    clampX, clampY, margins, commit,
    setPositions, setExtraTexts,
    setPlacedAssets: assets.setPlacedAssets,
    getElementRect,
  });

  // ── Stroke actions ───────────────────────────────────────────
  const deleteSelectedStroke = useCallback(() => {
    if (!selectedStrokeId) return;
    undoRedo.commit();
    setStrokes(prev => prev.filter(s => s.id !== selectedStrokeId));
    setSelectedStrokeId(null);
  }, [selectedStrokeId, undoRedo]);

  const updateSelectedStroke = useCallback((patch: Partial<ChalkStroke>) => {
    if (!selectedStrokeId) return;
    setStrokes(prev => prev.map(s => {
      if (s.id !== selectedStrokeId) return s;
      const next = { ...s, ...patch };
      if (patch.brushName !== undefined || patch.strokeWidth !== undefined)
        next.svgPath = rerenderStroke(next, next.brushName, next.strokeWidth);
      return next;
    }));
  }, [selectedStrokeId]);

  // ── Text actions ─────────────────────────────────────────────
  const addText = useCallback(() => {
    const id = makeId();
    undoRedo.commit();
    setExtraTexts(prev => [...prev, {
      id, text: "Text", font: defaultFont, size: 24,
      weight: "400", align: "center" as Align, outline: false, position: { x: 50, y: 50 },
    }]);
    setSelectedTextId(id);
  }, [undoRedo, defaultFont]);

  const deleteText = useCallback(() => {
    if (!selectedTextId) return;
    undoRedo.commit();
    if (selectedTextId in positionsRef.current) {
      onClearNamedText?.(selectedTextId);
    } else {
      setExtraTexts(prev => prev.filter(t => t.id !== selectedTextId));
    }
    setSelectedTextId(null);
  }, [selectedTextId, undoRedo, onClearNamedText]);

  // ── Inline text editing ───────────────────────────────────────
  const handleTextDoubleClick = useCallback((id: string) => {
    setSelectedTextId(id);
    setEditingTextId(id);
  }, []);

  const handleTextEditCommit = useCallback((id: string, newText: string) => {
    setEditingTextId(null);
    undoRedo.commit();
    if (extraTextsRef.current.some(t => t.id === id)) {
      setExtraTexts(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
    } else {
      onCommitNamedText?.(id, newText);
    }
  }, [undoRedo, onCommitNamedText]);

  // ── Pointer handlers ─────────────────────────────────────────
  const handlePointerDown = useCallback((key: string, e: React.PointerEvent) => {
    // Don't start drag if this element is being inline-edited
    if (editingTextId === key) return;
    setSelectedTextId(key);
    assets.setSelectedAssetId(null);
    setSelectedStrokeId(null);
    if (key in positionsRef.current) {
      drag.beginDrag(key, positionsRef.current[key].x, positionsRef.current[key].y, e);
    } else {
      const et = extraTextsRef.current.find(t => t.id === key);
      if (et) drag.beginDrag(key, et.position.x, et.position.y, e);
    }
  }, [assets, drag, editingTextId]);

  const handleAssetPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    const a = assets.placedAssets.find(p => p.id === id);
    if (!a) return;
    assets.setSelectedAssetId(id);
    setSelectedTextId(null);
    drag.beginDrag(id, a.x, a.y, e);
  }, [assets, drag]);

  const handleStrokePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (drawing.mode !== "move") return;
    const s = strokes.find(st => st.id === id);
    if (!s) return;
    setSelectedStrokeId(id);
    setSelectedTextId(null);
    assets.setSelectedAssetId(null);
    drag.beginDeltaDrag(id, e,
      { min: -60, max: 60 },
      () => ({ offX: s.offsetX, offY: s.offsetY }),
      (offX, offY) => setStrokes(prev => prev.map(st => st.id === id ? { ...st, offsetX: offX, offsetY: offY } : st)),
    );
  }, [drawing.mode, strokes, assets, drag]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
        || (e.target instanceof HTMLElement && e.target.contentEditable === "true");
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? undoRedo.redo() : undoRedo.undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); undoRedo.redo(); return; }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedStrokeId) deleteSelectedStroke();
        else if (assets.selectedAssetId) { undoRedo.commit(); assets.deleteSelected(); }
        else onDeleteExtra?.();
        return;
      }
      if (e.key === "d" || e.key === "D") drawing.setMode("draw");
      else if (e.key === "v" || e.key === "V" || e.key === "Escape") drawing.setMode("move");
      else if (e.key === "[") drawing.setBrushWidth(w => Math.max(0.1, w - 0.2));
      else if (e.key === "]") drawing.setBrushWidth(w => Math.min(4, w + 0.2));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStrokeId, assets, drawing, undoRedo, deleteSelectedStroke, onDeleteExtra]);

  // ── Context value ─────────────────────────────────────────────
  const ctx: DesignerContextValue = {
    strokes, setStrokes, selectedStrokeId, setSelectedStrokeId,
    placedAssets: assets.placedAssets, setPlacedAssets: assets.setPlacedAssets,
    selectedAssetId: assets.selectedAssetId, setSelectedAssetId: assets.setSelectedAssetId,
    selectedAsset: assets.selectedAsset,
    customAssets: assets.customAssets, logoAssets: assets.logoAssets,
    illustrationAssets: assets.illustrationAssets, allAssets: assets.allAssets,
    imgRatios: assets.imgRatios, getAssetSrc: assets.getAssetSrc,
    positions, setPositions, textAligns, setTextAligns,
    extraTexts, setExtraTexts, selectedTextId, setSelectedTextId,
    mode: drawing.mode, setMode: drawing.setMode,
    brushName: drawing.brushName, setBrushName: drawing.setBrushName,
    brushWidth: drawing.brushWidth, setBrushWidth: drawing.setBrushWidth,
    brushOpacity: drawing.brushOpacity, setBrushOpacity: drawing.setBrushOpacity,
    chalkColor: drawing.chalkColor, setChalkColor: drawing.setChalkColor,
    isDrawing: drawing.isDrawing, liveStrokePath: drawing.liveStrokePath, cursorPos: drawing.cursorPos,
    dragging: drag.dragging, snapLines: drag.snapLines, containerRef,
    margins, setMargins,
    editingTextId, handleTextDoubleClick, handleTextEditCommit,
    commit: undoRedo.commit, undo: undoRedo.undo, redo: undoRedo.redo,
    canUndo: undoRedo.canUndo, canRedo: undoRedo.canRedo,
    beginDrag: drag.beginDrag, beginDeltaDrag: drag.beginDeltaDrag,
    handlePointerDown, handleAssetPointerDown, handleStrokePointerDown,
    handleDrawStart: drawing.handleDrawStart,
    handleDrawMove: drawing.handleDrawMove,
    handleDrawEnd: drawing.handleDrawEnd,
    handleDrawLeave: drawing.handleDrawLeave,
    handlePlace: assets.handlePlace,
    handleDragPlace: assets.handleDragPlace,
    handleUpload: assets.handleUpload,
    handleUploadStencil: assets.handleUploadStencil,
    updateAssetChalk: assets.updateAssetChalk,
    updateSelected: assets.updateSelected,
    deleteSelected: assets.deleteSelected,
    handleLayer: assets.handleLayer,
    deleteSelectedStroke, updateSelectedStroke,
    addText, deleteText,
  };

  return (
    <DesignerContext.Provider value={ctx}>
      {children}
    </DesignerContext.Provider>
  );
}
