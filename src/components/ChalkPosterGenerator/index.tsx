import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AssetItem,
  ChalkStroke,
  DrawBrush,
  PatternConfig,
  PatternStroke,
  PlacedAsset,
  Position,
  PosterSize,
  ToolMode,
} from "../../types/poster";
import { makeFreehandStroke, smoothPoints } from "../../lib/chalkStrokes";
import { generateChalkStrokes } from "../../lib/chalkBackground";
import { renderStretchBrush } from "../../lib/stretchBrushRenderer";
import { STRETCH_BRUSHES } from "../../lib/stretchBrush";
import { DrawingToolbar } from "./DrawingToolbar";
import { smartPlace } from "../../lib/smartPlace";
import { ASSET_REGISTRY } from "../../assetRegistry";
import { isDefaultWhite, isMaskAsset } from "../../lib/strokeStamps";
import { SHAPE_ASSETS } from "../../lib/shapeAssets";
import { Sidebar, type TextFieldState } from "./Sidebar";
import { PosterCanvas, type PosterCanvasHandle } from "./PosterCanvas";
import { TextOverlay } from "./TextOverlay";
import { SelectionHandles } from "./SelectionHandles";
import { AssetPanel } from "./AssetPanel";
import { LayoutPanel } from "./LayoutPanel";
import { LAYOUTS, type PosterLayout } from "./layouts";
import type { Align } from "../../lib/layouts";
import { type PosterScene, type SceneAsset } from "../../lib/posterRender";
import { exportPNG, exportGIF, exportVideo, downloadBlob } from "../../lib/exporter";
import styles from "../../styles/chalkPoster.module.css";

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `placed-${Date.now()}-${Math.random()}`;
}

const POS_KEYS = ["header", "sub", "body", "detail"] as const;

const FONTS = [
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Oswald", value: "Oswald" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Permanent Marker", value: "Permanent Marker" },
  { label: "Caveat", value: "Caveat" },
  { label: "Special Elite", value: "Special Elite" },
  { label: "Rock Salt", value: "Rock Salt" },
  { label: "Abril Fatface", value: "Abril Fatface" },
];

const POSTER_SIZES: PosterSize[] = [
  { label: "A3 Hochformat", w: 420, h: 594 },
  { label: "A4 Hochformat", w: 297, h: 420 },
  { label: "Quadrat", w: 420, h: 420 },
  { label: "Instagram", w: 400, h: 400 },
];

const CHALK = "#e0e0e0";
const CHALK_DIM = "#c0c0c0";
const POSTER_BG = "#000000";

type PosKey = "header" | "sub" | "body" | "detail";

export function ChalkPosterGenerator() {
  // Poster-Größe
  const [posterSizeIndex, setPosterSizeIndex] = useState(0);
  const size = POSTER_SIZES[posterSizeIndex];

  // Hintergrundfarbe: dunkle Tafel oder helles Papier (wählbar)
  const [bgColor, setBgColor] = useState(POSTER_BG);

  // Kreide-Muster (Hintergrund) — generative Striche, die sich animiert
  // selbst zeichnen können.
  const [patternConfig, setPatternConfig] = useState<PatternConfig>({
    count: 5,
    noise: 0.3,
    weight: 40,
    opacity: 65,
    direction: 135,
    spread: 0.4,
    seed: Math.floor(Math.random() * 999999),
  });
  const [patternStrokes, setPatternStrokes] = useState<PatternStroke[]>([]);
  const updatePattern = useCallback(
    (patch: Partial<PatternConfig>) =>
      setPatternConfig((c) => ({ ...c, ...patch })),
    []
  );
  // Striche neu erzeugen, sobald sich Config oder Postergröße ändert.
  useEffect(() => {
    setPatternStrokes(generateChalkStrokes(patternConfig, size.w, size.h));
  }, [patternConfig, size.w, size.h]);

  // ── Freihand-Kreide-Striche ──────────────────────────
  const [strokes, setStrokes] = useState<ChalkStroke[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // ── Werkzeug-Modus + Freihand-Pinsel ─────────────────
  const [mode, setMode] = useState<ToolMode>("move");
  const [brushSize, setBrushSize] = useState(45);
  const [brushOpacity, setBrushOpacity] = useState(0.8);
  const [chalkColor, setChalkColor] = useState("#e8e5e0");
  const [drawBrush, setDrawBrush] = useState<DrawBrush>("verite");
  // Radiergummi: malt in Tafel-Hintergrundfarbe → deckt Kreide & Muster ab.
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  // Fester Seed pro Strich, damit Live-Vorschau und finaler Render identisch sind
  const liveSeedRef = useRef(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // ── Pattern-Selbstzeichen-Animation ──────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [animDuration, setAnimDuration] = useState(5);
  const [isExporting, setIsExporting] = useState<null | "gif" | "video">(null);
  const posterCanvasRef = useRef<PosterCanvasHandle>(null);
  const animFrameRef = useRef<number | null>(null);

  // Text-Elemente
  const [headerText, setHeaderText] = useState("Голос!");
  const [headerFont, setHeaderFont] = useState("Playfair Display");
  const [headerSize, setHeaderSize] = useState(52);
  const [headerWeight, setHeaderWeight] = useState("700");

  const [subText, setSubText] = useState("Вечір української поезії");
  const [subFont, setSubFont] = useState("Caveat");
  const [subSize, setSubSize] = useState(26);

  const [bodyText, setBodyText] = useState(
    "Приєднуйтесь до нас\nна незабутній вечір"
  );
  const [bodyFont, setBodyFont] = useState("Oswald");
  const [bodySize, setBodySize] = useState(18);

  const [detailText, setDetailText] = useState(
    "12 червня · 19:00 · вул. Хрещатик 1"
  );
  const [detailFont, setDetailFont] = useState("Special Elite");
  const [detailSize, setDetailSize] = useState(14);

  // Schriftfarbe je Textfeld: Weiß (Kreide) oder Schwarz.
  const [headerColor, setHeaderColor] = useState(CHALK);
  const [subColor, setSubColor] = useState(CHALK);
  const [bodyColor, setBodyColor] = useState(CHALK);
  const [detailColor, setDetailColor] = useState(CHALK_DIM);

  // Positionen (%) für Drag & Drop
  const [positions, setPositions] = useState<Record<PosKey, Position>>({
    header: { x: 50, y: 22 },
    sub: { x: 50, y: 35 },
    body: { x: 50, y: 52 },
    detail: { x: 50, y: 82 },
  });
  // Ausrichtung je Textfeld (vom Layout gesetzt, Default zentriert)
  const [textAligns, setTextAligns] = useState<Record<PosKey, Align>>({
    header: "center",
    sub: "center",
    body: "center",
    detail: "center",
  });

  // Platzierte Logos/Illustrationen
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  // Ausgewähltes Textfeld (für Auswahl-Rahmen)
  const [selectedTextKey, setSelectedTextKey] = useState<PosKey | null>(null);
  // Natürliches Höhen-/Breitenverhältnis je Asset (für die Skalier-Griffe),
  // beim Laden des Bildes erfasst.
  const imgRatios = useRef<Map<string, number>>(new Map());
  // Vom Nutzer hochgeladene Illustrationen (zusätzlich zum Registry)
  const [customAssets, setCustomAssets] = useState<AssetItem[]>([]);
  const allAssets = useMemo(
    () => [...ASSET_REGISTRY, ...SHAPE_ASSETS, ...customAssets],
    [customAssets]
  );

  const handleUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const asset: AssetItem = {
      id: `custom/${makeId()}`,
      name: file.name.replace(/\.(svg|png|jpe?g)$/i, ""),
      category: "logos",
      src: url,
      defaultScale: 0.25,
      anchor: "center",
    };
    setCustomAssets((prev) => [...prev, asset]);
  }, []);

  // ── Undo/Redo ────────────────────────────────────────
  // Snapshot der editierbaren Sammlungen (Striche, Logos, Positionen).
  type Snapshot = {
    strokes: ChalkStroke[];
    placedAssets: PlacedAsset[];
    positions: Record<PosKey, Position>;
  };
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  // Aktuelle Werte über Ref, damit commit/undo nicht ständig neu gebunden werden.
  const liveRef = useRef<Snapshot>({
    strokes: [],
    placedAssets: [],
    positions: {} as Record<PosKey, Position>,
  });

  const getAssetSrc = useCallback(
    (assetId: string) => allAssets.find((a) => a.id === assetId)?.src ?? "",
    [allAssets]
  );

  // liveRef immer mit aktuellen Werten füllen (für Snapshots)
  useEffect(() => {
    liveRef.current = { strokes, placedAssets, positions };
  });

  const commit = useCallback(() => {
    const snap = liveRef.current;
    setPast((p) => [
      ...p,
      {
        strokes: snap.strokes,
        placedAssets: snap.placedAssets,
        positions: snap.positions,
      },
    ].slice(-50));
    setFuture([]);
  }, []);

  const applySnapshot = useCallback((s: Snapshot) => {
    setStrokes(s.strokes);
    setPlacedAssets(s.placedAssets);
    setPositions(s.positions);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [liveRef.current, ...f]);
      applySnapshot(prev);
      return p.slice(0, -1);
    });
  }, [applySnapshot]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, liveRef.current]);
      applySnapshot(next);
      return f.slice(1);
    });
  }, [applySnapshot]);

  // Drag-State (kann eine Text/Divider-Position ODER eine Asset-ID sein)
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Bei Strich-Drag: Start-Pointer + Start-Offset (Delta-basiert)
  const strokeDrag = useRef<{
    id: string;
    cx: number;
    cy: number;
    offX: number;
    offY: number;
  } | null>(null);

  // Responsive Scale
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () =>
      setScale(
        Math.min(
          (window.innerWidth - 320) / size.w,
          (window.innerHeight - 40) / size.h,
          1.4
        )
      );
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [size.w, size.h]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayW = size.w * scale;
  const displayH = size.h * scale;

  // ── Drag & Drop ──────────────────────────────────────
  const beginDrag = useCallback(
    (id: string, curX: number, curY: number, e: React.PointerEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      commit();
      setDragging(id);
      strokeDrag.current = null;
      dragOffset.current = {
        x: e.clientX - rect.left - (curX / 100) * rect.width,
        y: e.clientY - rect.top - (curY / 100) * rect.height,
      };
    },
    [commit]
  );

  // Text & Trenner
  const handlePointerDown = useCallback(
    (key: string, e: React.PointerEvent) => {
      const k = key as PosKey;
      setSelectedTextKey(k);
      setSelectedAssetId(null);
      setSelectedStrokeId(null);
      beginDrag(k, positions[k].x, positions[k].y, e);
    },
    [beginDrag, positions]
  );

  // Platzierte Assets
  const handleAssetPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      const a = placedAssets.find((p) => p.id === id);
      if (!a) return;
      setSelectedAssetId(id);
      setSelectedTextKey(null);
      beginDrag(id, a.x, a.y, e);
    },
    [beginDrag, placedAssets]
  );

  // Fette Striche: Delta-basiertes Verschieben über offsetX/offsetY
  const handleStrokePointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (mode !== "move") return;
      e.preventDefault();
      e.stopPropagation();
      const s = strokes.find((st) => st.id === id);
      if (!s) return;
      commit();
      setSelectedStrokeId(id);
      setSelectedTextKey(null);
      setSelectedAssetId(null);
      setDragging(id);
      strokeDrag.current = {
        id,
        cx: e.clientX,
        cy: e.clientY,
        offX: s.offsetX,
        offY: s.offsetY,
      };
    },
    [mode, strokes, commit]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Strich-Drag: relativ über Pointer-Delta
      if (strokeDrag.current && strokeDrag.current.id === dragging) {
        const sd = strokeDrag.current;
        const dxPct = ((e.clientX - sd.cx) / rect.width) * 100;
        const dyPct = ((e.clientY - sd.cy) / rect.height) * 100;
        const offX = Math.max(-60, Math.min(60, sd.offX + dxPct));
        const offY = Math.max(-60, Math.min(60, sd.offY + dyPct));
        setStrokes((prev) =>
          prev.map((st) =>
            st.id === dragging ? { ...st, offsetX: offX, offsetY: offY } : st
          )
        );
        return;
      }
      const clamp = (v: number) => Math.max(5, Math.min(95, v));
      const px = clamp(
        ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100
      );
      const py = clamp(
        ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100
      );
      if ((POS_KEYS as readonly string[]).includes(dragging)) {
        const k = dragging as PosKey;
        setPositions((prev) => ({
          ...prev,
          [k]: { x: px, y: py },
        }));
      } else {
        setPlacedAssets((prev) =>
          prev.map((a) => (a.id === dragging ? { ...a, x: px, y: py } : a))
        );
      }
    };
    const onUp = () => {
      setDragging(null);
      strokeDrag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  // ── Asset-Aktionen ───────────────────────────────────
  const handlePlace = useCallback(
    (assetId: string) => {
      const asset = allAssets.find((a) => a.id === assetId);
      if (!asset) return;
      const existing = [
        positions.header,
        positions.sub,
        positions.body,
        positions.detail,
        ...placedAssets.map((p) => ({ x: p.x, y: p.y })),
      ];
      const pos = smartPlace(asset, existing, size.w / size.h);
      const maxZ = placedAssets.reduce((m, p) => Math.max(m, p.zIndex), 0);
      const id = makeId();
      const isStroke = asset.category === "strokes";
      const isMask = isMaskAsset(asset.category); // Striche + Formen: tintbar
      setPlacedAssets((prev) => [
        ...prev,
        {
          id,
          assetId,
          x: pos.x,
          y: pos.y,
          scale: asset.defaultScale,
          rotation: isStroke ? -8 + Math.random() * 16 : 0,
          opacity: isStroke ? 0.9 : 1,
          flipX: false,
          zIndex: maxZ + 1,
          ...(isMask
            ? {
                scaleY: 1,
                flipY: false,
                tint: isDefaultWhite(chalkColor) ? undefined : chalkColor,
              }
            : {}),
        },
      ]);
      setSelectedAssetId(id);
    },
    [allAssets, placedAssets, positions, size.w, size.h, chalkColor]
  );

  // Wendet ein Layout an: ordnet Texte an und platziert die vorhandenen
  // Logos der Reihe nach in die Logo-Plätze des Layouts.
  const applyLayout = useCallback((layout: PosterLayout) => {
    setPositions(layout.positions);
    setTextAligns({
      header: layout.aligns?.header ?? "center",
      sub: layout.aligns?.sub ?? "center",
      body: layout.aligns?.body ?? "center",
      detail: layout.aligns?.detail ?? "center",
    });
    const logos = ASSET_REGISTRY.filter((a) => a.category === "logos");
    if (logos.length === 0) {
      setPlacedAssets([]);
      setSelectedAssetId(null);
      return;
    }
    setPlacedAssets(
      layout.logoSlots.map((slot, i) => ({
        id: makeId(),
        assetId: logos[i % logos.length].id,
        x: slot.x,
        y: slot.y,
        scale: slot.scale,
        rotation: 0,
        opacity: 1,
        flipX: false,
        zIndex: i + 1,
      }))
    );
    setSelectedAssetId(null);
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<PlacedAsset>) => {
      if (!selectedAssetId) return;
      setPlacedAssets((prev) =>
        prev.map((a) => (a.id === selectedAssetId ? { ...a, ...patch } : a))
      );
    },
    [selectedAssetId]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedAssetId) return;
    setPlacedAssets((prev) => prev.filter((a) => a.id !== selectedAssetId));
    setSelectedAssetId(null);
  }, [selectedAssetId]);

  const handleLayer = useCallback(
    (dir: 1 | -1) => {
      if (!selectedAssetId) return;
      setPlacedAssets((prev) => {
        const zs = prev.map((p) => p.zIndex);
        const target = dir === 1 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
        return prev.map((a) =>
          a.id === selectedAssetId ? { ...a, zIndex: target } : a
        );
      });
    },
    [selectedAssetId]
  );

  // 🎲 Alles neu generieren — ein neues Hintergrund-Muster innerhalb der
  // Brand-Parameter. Texte/Positionen/Logos/Freihand-Striche bleiben erhalten.
  const generateAll = useCallback(() => {
    commit();
    // Hintergrund-Muster komplett neu würfeln
    setPatternConfig({
      count: Math.round(3 + Math.random() * 8),
      noise: Math.round((0.15 + Math.random() * 0.5) * 100) / 100,
      weight: Math.round(20 + Math.random() * 70),
      opacity: Math.round(45 + Math.random() * 45),
      direction: Math.round(Math.random() * 360),
      spread: Math.round((0.2 + Math.random() * 0.5) * 100) / 100,
      seed: Math.floor(Math.random() * 999999),
    });
  }, [commit]);

  const deleteSelectedStroke = useCallback(() => {
    if (!selectedStrokeId) return;
    commit();
    setStrokes((prev) => prev.filter((s) => s.id !== selectedStrokeId));
    setSelectedStrokeId(null);
  }, [selectedStrokeId, commit]);

  // ── Freihand-Zeichnen ────────────────────────────────
  const getPointerPercent = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const clearLiveCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Live-Vorschau: den kompletten laufenden Strich mit dem Stretch Brush neu
  // rendern (gleiche Engine + Seed wie der finale Render → identischer Look).
  const renderLiveStroke = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pts = drawPointsRef.current.map((p) => ({
      x: (p.x / 100) * size.w,
      y: (p.y / 100) * size.h,
    }));
    if (pts.length < 2) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    renderStretchBrush(
      ctx,
      pts,
      STRETCH_BRUSHES[drawBrush],
      brushSize,
      isErasing ? bgColor : chalkColor,
      isErasing ? 1 : brushOpacity,
      liveSeedRef.current
    );
  }, [drawBrush, brushSize, chalkColor, brushOpacity, isErasing, bgColor, size.w, size.h]);

  const handleDrawStart = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "draw") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setIsDrawing(true);
      drawPointsRef.current = [getPointerPercent(e)];
      // Fester Seed für diesen Strich (Live == final)
      liveSeedRef.current = (Math.random() * 99999) | 0;
      clearLiveCanvas();
    },
    [mode, getPointerPercent, clearLiveCanvas]
  );

  const handleDrawMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode === "draw") setCursorPos({ x: e.clientX, y: e.clientY });
      if (!isDrawing) return;
      const pos = getPointerPercent(e);
      const pts = drawPointsRef.current;
      const last = pts[pts.length - 1];
      if (Math.hypot(pos.x - last.x, pos.y - last.y) > 0.3) {
        drawPointsRef.current = [...pts, pos];
        renderLiveStroke();
      }
    },
    [mode, isDrawing, getPointerPercent, renderLiveStroke]
  );

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pts = drawPointsRef.current;
    drawPointsRef.current = [];
    // Live-Preview leeren (das finale Rendering übernimmt jetzt)
    clearLiveCanvas();
    if (pts.length < 2) return;
    commit();
    const smoothed = smoothPoints(pts, 3);
    setStrokes((prev) => [
      ...prev,
      makeFreehandStroke(
        smoothed,
        brushSize,
        isErasing ? 1 : brushOpacity,
        isErasing ? bgColor : chalkColor,
        drawBrush,
        prev.length,
        liveSeedRef.current
      ),
    ]);
  }, [isDrawing, commit, brushSize, brushOpacity, chalkColor, drawBrush, isErasing, bgColor, clearLiveCanvas]);

  // Delete-Taste, Undo/Redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedStrokeId) deleteSelectedStroke();
        else if (selectedAssetId) deleteSelected();
        return;
      }
      // Modus + Pinselgröße
      if (e.key === "d" || e.key === "D") setMode("draw");
      else if (e.key === "v" || e.key === "V" || e.key === "Escape")
        setMode("move");
      else if (e.key === "[") setBrushSize((s) => Math.max(4, s - 5));
      else if (e.key === "]") setBrushSize((s) => Math.min(120, s + 5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedAssetId,
    deleteSelected,
    selectedStrokeId,
    deleteSelectedStroke,
    undo,
    redo,
  ]);

  const selectedAsset =
    placedAssets.find((a) => a.id === selectedAssetId) ?? null;

  // Einheitliche Text-Element-Beschreibung für Overlay + Export
  const textItems = [
    {
      key: "header" as PosKey,
      text: headerText,
      font: headerFont,
      size: headerSize,
      weight: headerWeight,
      color: headerColor,
      align: textAligns.header,
    },
    {
      key: "sub" as PosKey,
      text: subText,
      font: subFont,
      size: subSize,
      weight: "600",
      color: subColor,
      align: textAligns.sub,
    },
    {
      key: "body" as PosKey,
      text: bodyText,
      font: bodyFont,
      size: bodySize,
      weight: "400",
      color: bodyColor,
      align: textAligns.body,
    },
    {
      key: "detail" as PosKey,
      text: detailText,
      font: detailFont,
      size: detailSize,
      weight: "400",
      color: detailColor,
      align: textAligns.detail,
    },
  ];

  // ── Szene bauen (Single Source of Truth für Render + Export) ──
  const buildScene = useCallback((): PosterScene => {
    return {
      w: size.w,
      h: size.h,
      bg: bgColor,
      pattern: patternConfig,
      patternStrokes,
      strokes,
      texts: textItems.map((t) => ({
        key: t.key,
        text: t.text,
        font: t.font,
        size: t.size,
        weight: t.weight,
        color: t.color,
        align: t.align,
        x: positions[t.key].x,
        y: positions[t.key].y,
      })),
      assets: placedAssets.map((a): SceneAsset => {
        const item = allAssets.find((x) => x.id === a.assetId);
        return {
          ...a,
          src: item?.src ?? getAssetSrc(a.assetId),
          category: item?.category ?? "logos",
          naturalWidth: item?.naturalWidth,
          naturalHeight: item?.naturalHeight,
        };
      }),
    };
  }, [
    size,
    bgColor,
    patternConfig,
    patternStrokes,
    positions,
    strokes,
    textItems,
    placedAssets,
    allAssets,
    getAssetSrc,
  ]);

  // ── Export PNG (3x, Druckauflösung) ──
  const handleExport = useCallback(async () => {
    const blob = await exportPNG(buildScene(), 3);
    downloadBlob(blob, "holos-poster.png");
  }, [buildScene]);

  // ── Export GIF (Pattern-Selbstzeichen-Animation) ──
  const handleExportGif = useCallback(async () => {
    setIsExporting("gif");
    try {
      const blob = await exportGIF(buildScene(), animDuration, 12, 1);
      downloadBlob(blob, `holos-${patternConfig.seed}.gif`);
    } finally {
      setIsExporting(null);
    }
  }, [buildScene, animDuration, patternConfig.seed]);

  // ── Export Video (WebM, Pattern-Selbstzeichen-Animation) ──
  const handleExportVideo = useCallback(async () => {
    setIsExporting("video");
    try {
      const blob = await exportVideo(buildScene(), animDuration, 30, 2);
      downloadBlob(blob, `holos-${patternConfig.seed}.webm`);
    } finally {
      setIsExporting(null);
    }
  }, [buildScene, animDuration, patternConfig.seed]);

  // ── Live-Pattern-Animation (rAF direkt auf der PosterCanvas) ──
  // Nur Tafel + Muster animieren sich; fette Striche, Text & Assets bleiben
  // statisch sichtbar (DOM-Overlays bzw. voll gezeichnet).
  const handleStopPlay = useCallback(() => {
    if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    setIsPlaying(false);
    posterCanvasRef.current?.redraw();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const start = performance.now();
    const ms = Math.max(0.2, animDuration) * 1000;

    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / ms);
      const progress = 1 - Math.pow(1 - raw, 2.5); // easeOut
      posterCanvasRef.current?.renderAt(progress);
      if (raw < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
        setIsPlaying(false);
        posterCanvasRef.current?.redraw();
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current != null)
        cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    };
  }, [isPlaying, animDuration]);

  // ── Sidebar-Feld-Konfig ──────────────────────────────
  const headerField: TextFieldState = {
    text: headerText,
    setText: setHeaderText,
    font: headerFont,
    setFont: setHeaderFont,
    size: headerSize,
    setSize: setHeaderSize,
    sizeMin: 24,
    sizeMax: 100,
    weight: headerWeight,
    setWeight: setHeaderWeight,
    color: headerColor,
    setColor: setHeaderColor,
  };
  const subField: TextFieldState = {
    text: subText,
    setText: setSubText,
    font: subFont,
    setFont: setSubFont,
    size: subSize,
    setSize: setSubSize,
    sizeMin: 14,
    sizeMax: 60,
    color: subColor,
    setColor: setSubColor,
  };
  const bodyField: TextFieldState = {
    text: bodyText,
    setText: setBodyText,
    font: bodyFont,
    setFont: setBodyFont,
    size: bodySize,
    setSize: setBodySize,
    sizeMin: 10,
    sizeMax: 40,
    multiline: true,
    color: bodyColor,
    setColor: setBodyColor,
  };
  const detailField: TextFieldState = {
    text: detailText,
    setText: setDetailText,
    font: detailFont,
    setFont: setDetailFont,
    size: detailSize,
    setSize: setDetailSize,
    sizeMin: 8,
    sizeMax: 30,
    multiline: true,
    color: detailColor,
    setColor: setDetailColor,
  };

  return (
    <div className={styles.app}>
      <Sidebar
        fonts={FONTS}
        sizes={POSTER_SIZES}
        posterSizeIndex={posterSizeIndex}
        setPosterSizeIndex={setPosterSizeIndex}
        bg={bgColor}
        setBg={setBgColor}
        pattern={patternConfig}
        setPattern={updatePattern}
        onRegenerate={() =>
          updatePattern({ seed: Math.floor(Math.random() * 999999) })
        }
        isPlaying={isPlaying}
        onTogglePlay={() => (isPlaying ? handleStopPlay() : setIsPlaying(true))}
        animDuration={animDuration}
        setAnimDuration={setAnimDuration}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        layoutSection={
          <LayoutPanel
            layouts={LAYOUTS}
            onApply={applyLayout}
            hasLogos={ASSET_REGISTRY.some((a) => a.category === "logos")}
          />
        }
        header={headerField}
        sub={subField}
        body={bodyField}
        detail={detailField}
        assetSection={
          <AssetPanel
            assets={allAssets}
            onPlace={handlePlace}
            onUpload={handleUpload}
            selected={selectedAsset}
            onUpdateSelected={updateSelected}
            onDeleteSelected={deleteSelected}
            onLayer={handleLayer}
          />
        }
        onRandomize={generateAll}
        onExport={handleExport}
        onExportGif={handleExportGif}
        onExportVideo={handleExportVideo}
        isExporting={isExporting}
      />

      <div className={styles.preview}>
        <PosterCanvas
          ref={posterCanvasRef}
          size={size}
          pattern={patternConfig}
          patternStrokes={patternStrokes}
          strokes={strokes}
          bg={bgColor}
          scale={scale}
          containerRef={containerRef}
          onBackgroundClick={() => {
            setSelectedAssetId(null);
            setSelectedStrokeId(null);
            setSelectedTextKey(null);
          }}
        >
          {/* Fette Striche: präzise Klick-/Drag-Flächen entlang des Pfades */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 40,
              // Container lässt Klicks durch; nur die Pfade selbst fangen sie ab
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {strokes.map((s) => {
              const d = s.points
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"} ${p.x + s.offsetX} ${p.y + s.offsetY}`
                )
                .join(" ");
              const sw = Math.max((s.weight / size.w) * 100 * s.scale, 2);
              const isSel = selectedStrokeId === s.id;
              return (
                <path
                  key={s.id}
                  d={d}
                  fill="none"
                  stroke={isSel ? "rgba(255,255,255,0.55)" : "transparent"}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={isSel ? "1.5 1.5" : undefined}
                  style={{
                    pointerEvents: mode === "move" ? "stroke" : "none",
                    cursor: dragging === s.id ? "grabbing" : "grab",
                  }}
                  onPointerDown={(e) => handleStrokePointerDown(s.id, e)}
                  onClick={() => setSelectedStrokeId(s.id)}
                />
              );
            })}
          </svg>

          {placedAssets.map((asset) => {
            const item = allAssets.find((a) => a.id === asset.assetId);
            // Auswahl wird jetzt über die On-Canvas-Griffe angezeigt
            // (SelectionHandles), daher kein doppelter Outline am Element.
            const commonOutline = "none";

            // Striche & Formen: weiß-auf-transparent als Maske → in
            // Kreide-Farbe getönt, mit getrennter Stärke/Höhe (scaleY) & V-Flip.
            if (item && isMaskAsset(item.category)) {
              const nw = item.naturalWidth ?? 1;
              const nh = item.naturalHeight ?? 1;
              const widthPx = asset.scale * displayW;
              const heightPx = widthPx * (nh / nw);
              const stretchX = asset.scaleX ?? 1;
              const stretchY = asset.scaleY ?? 1;
              const mask = `url("${item.src}")`;
              return (
                <div
                  key={asset.id}
                  onPointerDown={(e) => handleAssetPointerDown(asset.id, e)}
                  style={{
                    position: "absolute",
                    left: `${asset.x}%`,
                    top: `${asset.y}%`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${(asset.flipX ? -1 : 1) * stretchX}, ${(asset.flipY ? -1 : 1) * stretchY})`,
                    transformOrigin: "center",
                    opacity: asset.opacity,
                    zIndex: asset.zIndex,
                    background: asset.tint || "#e8e5e0",
                    WebkitMaskImage: mask,
                    maskImage: mask,
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    cursor: dragging === asset.id ? "grabbing" : "grab",
                    outline: commonOutline,
                    outlineOffset: "4px",
                    pointerEvents: "auto",
                    userSelect: "none",
                  }}
                />
              );
            }

            return (
              <img
                key={asset.id}
                src={getAssetSrc(asset.assetId)}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  const im = e.currentTarget;
                  if (im.naturalWidth > 0) {
                    imgRatios.current.set(
                      asset.assetId,
                      im.naturalHeight / im.naturalWidth
                    );
                  }
                }}
                onPointerDown={(e) => handleAssetPointerDown(asset.id, e)}
                style={{
                  position: "absolute",
                  left: `${asset.x}%`,
                  top: `${asset.y}%`,
                  // Breite = Anteil der Posterbreite (in Anzeige-Pixeln)
                  width: `${asset.scale * displayW}px`,
                  height: "auto",
                  transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${(asset.flipX ? -1 : 1) * (asset.scaleX ?? 1)}, ${asset.scaleY ?? 1})`,
                  transformOrigin: "center",
                  opacity: asset.opacity,
                  zIndex: asset.zIndex,
                  cursor: dragging === asset.id ? "grabbing" : "grab",
                  outline: commonOutline,
                  outlineOffset: "4px",
                  pointerEvents: "auto",
                  userSelect: "none",
                }}
              />
            );
          })}
          {/* On-Canvas-Griffe (Drehen/Skalieren) für das ausgewählte Asset */}
          {selectedAsset &&
            (() => {
              const it = allAssets.find((x) => x.id === selectedAsset.assetId);
              // Natürliches Höhen-/Breitenverhältnis (ohne Stretch)
              const baseRatio =
                it && isMaskAsset(it.category) && it.naturalWidth
                  ? it.naturalHeight! / it.naturalWidth
                  : imgRatios.current.get(selectedAsset.assetId) ??
                    (it?.naturalWidth && it?.naturalHeight
                      ? it.naturalHeight / it.naturalWidth
                      : 1);
              const baseW = selectedAsset.scale * displayW;
              const widthPx = baseW * (selectedAsset.scaleX ?? 1);
              const heightPx = baseW * baseRatio * (selectedAsset.scaleY ?? 1);
              return (
                <SelectionHandles
                  asset={selectedAsset}
                  containerRef={containerRef}
                  widthPx={widthPx}
                  heightPx={heightPx}
                  onStart={commit}
                  onChange={updateSelected}
                />
              );
            })()}

          {textItems.map((item) => (
            <TextOverlay
              key={item.key}
              id={item.key}
              text={item.text}
              font={item.font}
              size={item.size}
              weight={item.weight}
              color={item.color}
              align={item.align}
              position={positions[item.key]}
              scale={scale}
              dragging={dragging === item.key}
              selected={selectedTextKey === item.key}
              onPointerDown={handlePointerDown}
            />
          ))}

          {/* Live-Preview-Canvas für Freihand-Zeichnen */}
          <canvas
            ref={drawCanvasRef}
            width={size.w * 2}
            height={size.h * 2}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 60,
              pointerEvents: "none",
            }}
          />

          {/* Erfassungsfläche im Zeichen-Modus */}
          {mode === "draw" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 61,
                pointerEvents: "auto",
                cursor: "none",
                touchAction: "none",
              }}
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
              onPointerLeave={() => {
                handleDrawEnd();
                setCursorPos(null);
              }}
            />
          )}
        </PosterCanvas>

        {/* Kreide-Cursor (folgt der Maus im Zeichen-Modus) */}
        {mode === "draw" && cursorPos && (
          <div
            className={styles.drawCursor}
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: brushSize * scale,
              height: brushSize * scale,
              borderColor: isErasing ? "rgba(255,255,255,0.7)" : `${chalkColor}88`,
              borderStyle: isErasing ? "dashed" : "solid",
            }}
          />
        )}

        {/* Schwebende Werkzeug-/Zeichnen-Bar (immer sichtbar) */}
        <DrawingToolbar
          mode={mode}
          setMode={setMode}
          chalkColor={chalkColor}
          setChalkColor={setChalkColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushOpacity={brushOpacity}
          setBrushOpacity={setBrushOpacity}
          drawBrush={drawBrush}
          setDrawBrush={setDrawBrush}
          isErasing={isErasing}
          setIsErasing={setIsErasing}
          onUndo={undo}
          canUndo={past.length > 0}
        />

        <p className={styles.previewHint}>
          {mode === "draw"
            ? "Zeichnen aktiv · ziehen zum Malen · „Zeichnen“ ausschalten zum Bewegen"
            : "Alles direkt verschieben: Striche, Texte, Linien & Logos anklicken & ziehen · Entf zum Löschen · Strg+Z für Rückgängig"}
        </p>
      </div>
    </div>
  );
}
