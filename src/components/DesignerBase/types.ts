import type React from "react";
import type { Align, AssetCategory, AssetItem, ChalkStroke, PlacedAsset, Position, ToolMode } from "../../types/poster";
import type { ChalkifyOptions } from "../../lib/chalkifyImage";

export interface ExtraText {
  id: string;
  text: string;
  font: string;
  size: number;
  weight: string;
  align: Align;
  outline: boolean;
  position: Position;
}

export interface TextItem {
  key: string;
  text: string;
  font: string;
  size: number;
  weight: string;
  color: string;
  align: Align;
  outline: boolean;
  position: Position;
}

export interface BaseSnapshot {
  strokes: ChalkStroke[];
  placedAssets: PlacedAsset[];
  positions: Record<string, Position>;
  extraTexts: ExtraText[];
}

export interface DeltaTarget {
  id: string;
  clamp: { min: number; max: number };
  getOffset: () => { offX: number; offY: number };
  setOffset: (offX: number, offY: number) => void;
}

export interface DesignerContextValue {
  // strokes
  strokes: ChalkStroke[];
  setStrokes: React.Dispatch<React.SetStateAction<ChalkStroke[]>>;
  selectedStrokeId: string | null;
  setSelectedStrokeId: React.Dispatch<React.SetStateAction<string | null>>;

  // assets
  placedAssets: PlacedAsset[];
  setPlacedAssets: React.Dispatch<React.SetStateAction<PlacedAsset[]>>;
  selectedAssetId: string | null;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedAsset: PlacedAsset | null;
  customAssets: AssetItem[];
  logoAssets: AssetItem[];
  illustrationAssets: AssetItem[];
  allAssets: AssetItem[];
  imgRatios: React.RefObject<Map<string, number>>;
  getAssetSrc: (id: string) => string;

  // positions / text
  positions: Record<string, Position>;
  setPositions: React.Dispatch<React.SetStateAction<Record<string, Position>>>;
  textAligns: Record<string, Align>;
  setTextAligns: React.Dispatch<React.SetStateAction<Record<string, Align>>>;
  extraTexts: ExtraText[];
  setExtraTexts: React.Dispatch<React.SetStateAction<ExtraText[]>>;
  selectedTextId: string | null;
  setSelectedTextId: React.Dispatch<React.SetStateAction<string | null>>;
  textWidths: Record<string, number>;
  updateTextWidth: (id: string, w: number) => void;
  setTextWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>;

  // drawing tool
  mode: ToolMode;
  setMode: React.Dispatch<React.SetStateAction<ToolMode>>;
  brushName: string;
  setBrushName: React.Dispatch<React.SetStateAction<string>>;
  brushWidth: number;
  setBrushWidth: React.Dispatch<React.SetStateAction<number>>;
  brushOpacity: number;
  setBrushOpacity: React.Dispatch<React.SetStateAction<number>>;
  chalkColor: string;
  setChalkColor: React.Dispatch<React.SetStateAction<string>>;
  isDrawing: boolean;
  liveStrokePath: string | undefined;
  cursorPos: { x: number; y: number } | null;

  // drag
  dragging: string | null;
  snapLines: { x?: number; y?: number }[];
  containerRef: React.RefObject<HTMLDivElement | null>;

  // margins (user-configurable canvas safe zone, in %)
  margins: { left: number; right: number; top: number; bottom: number };
  setMargins: React.Dispatch<React.SetStateAction<{ left: number; right: number; top: number; bottom: number }>>;

  // inline text editing
  editingTextId: string | null;
  handleTextDoubleClick: (id: string) => void;
  handleTextEditCommit: (id: string, newText: string) => void;

  // undo/redo
  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // handlers
  beginDrag: (id: string, curX: number, curY: number, e: React.PointerEvent) => void;
  beginDeltaDrag: (id: string, e: React.PointerEvent, clamp: { min: number; max: number }, getOffset: () => { offX: number; offY: number }, setOffset: (offX: number, offY: number) => void) => void;
  handlePointerDown: (id: string, e: React.PointerEvent) => void;
  handleStrokePointerDown: (id: string, e: React.PointerEvent) => void;
  handleAssetPointerDown: (id: string, e: React.PointerEvent) => void;
  handleDrawStart: (e: React.PointerEvent) => void;
  handleDrawMove: (e: React.PointerEvent) => void;
  handleDrawEnd: () => void;
  handleDrawLeave: () => void;
  handlePlace: (assetId: string) => void;
  handleDragPlace: (assetId: string, clientX: number, clientY: number) => void;
  handleUpload: (file: File, category?: AssetCategory) => void;
  handleUploadStencil: (dataUrl: string, name: string, category?: AssetCategory) => void;
  updateAssetChalk: (assetId: string, patch: Partial<ChalkifyOptions & { enabled: boolean }>) => void;
  updateSelected: (patch: Partial<PlacedAsset>) => void;
  deleteSelected: () => void;
  handleLayer: (dir: 1 | -1) => void;
  deleteSelectedStroke: () => void;
  updateSelectedStroke: (patch: Partial<ChalkStroke>) => void;
  addText: () => void;
  deleteText: () => void;
}

export interface DesignerProviderProps<TExtra extends object = object> {
  logoRegistry: AssetItem[];
  illustrationRegistry: AssetItem[];
  storageKey: string;
  uploadsKey?: string;
  aspectRatio: number;
  initialPositions?: Record<string, Position>;
  initialTextAligns?: Record<string, Align>;
  initialAssets?: PlacedAsset[];
  // Initial safe-zone margins in % (default: all 0 — canvas edges)
  initialMargins?: { left: number; right: number; top: number; bottom: number };
  extraSnapshot: TExtra;
  // Receives the full snapshot (base + extra) so callers can pick their extra fields
  onApplyExtraSnapshot: (snapshot: BaseSnapshot & TExtra) => void;
  onBuildNewAsset?: (item: AssetItem) => Partial<PlacedAsset>;
  // Called when Delete is pressed on a named text key (caller clears its own text state)
  onClearNamedText?: (key: string) => void;
  // Called when double-click editing commits on a named text key
  onCommitNamedText?: (key: string, newText: string) => void;
  // Called when Delete is pressed and nothing shared is selected (e.g. pattern lines)
  onDeleteExtra?: () => void;
  // Font used when adding a new extra text element (default: "Oswald")
  defaultFont?: string;
  children: React.ReactNode;
}

export interface DesignerCanvasProps {
  // Render prop — receives shared canvas overlays; wraps them with TshirtCanvas or PosterCanvas
  renderBackground: (overlays: React.ReactNode) => React.ReactNode;
  textItems: TextItem[];
  displayW: number;
  displayH: number;
  scale: number;
  // Optional CSS module classes (default: chalkPoster module styles)
  styles?: Record<string, string>;
}
