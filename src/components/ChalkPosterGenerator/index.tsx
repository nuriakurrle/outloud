import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AssetCategory,
  AssetItem,
  ChalkStroke,
  PatternConfig,
  PatternStroke,
  PlacedAsset,
  Position,
  ToolMode,
} from "../../types/poster";
import { generatePatternStrokes, makeFreehandStroke, rerenderStroke, getAllBrushes, createLivePath } from "../../lib/brushStrokes";
import { DrawingToolbar } from "./DrawingToolbar";
import { smartPlace } from "../../lib/smartPlace";
import { ASSET_REGISTRY, LOGO_REGISTRY } from "../../assetRegistry";
const isMaskAsset = (cat: string) => cat === "strokes" || cat === "shapes";
const isDefaultWhite = (c: string) => c.toLowerCase() === "#ffffff";
import {
  chalkifyImage,
  DEFAULT_CHALKIFY,
  type ChalkifyOptions,
} from "../../lib/chalkifyImage";
import { Sidebar, type TextFieldState } from "./Sidebar";
import { TextPopup } from "./TextPopup";
import { PosterCanvas, type PosterCanvasHandle } from "./PosterCanvas";
import { TextOverlay } from "./TextOverlay";
import { SelectionHandles } from "./SelectionHandles";
import { AssetPanel } from "./AssetPanel";
import { LayoutPanel } from "./LayoutPanel";
import { LAYOUTS, type PosterLayout } from "./layouts";
import type { Align } from "../../types/poster";
import { type PosterScene, type SceneAsset } from "../../lib/posterRender";
import { exportPNG, downloadBlob } from "../../lib/exporter";
import styles from "../../styles/chalkPoster.module.css";
import {
  makeId,
  POS_KEYS,
  type PosKey,
  FONTS,
  POSTER_SIZES,
  POSTER_BG,
  REFERENCE_W,
  REFERENCE_H,
} from "./constants";
import { useUndoRedo } from "./useUndoRedo";
import { useT } from "../../i18n";

export function ChalkPosterGenerator() {
  const { t } = useT();
  const [posterSizeIndex, setPosterSizeIndex] = useState(0);
  const size = POSTER_SIZES[posterSizeIndex];
  // Typografie skaliert mit der knapperen Achse, damit Text in jedes Format
  // passt (schmaler Flyer ↔ quadratischer Insta-Post).
  const fontScale = Math.min(size.w / REFERENCE_W, size.h / REFERENCE_H);

  // Invert: white-on-black (false) vs black-on-white (true)
  const [inverted, setInverted] = useState(false);
  const bgColor = inverted ? "#ffffff" : POSTER_BG;
  const textColor = inverted ? "#000000" : "#FFFFFF";

  // Kreide-Muster (Hintergrund) — generative Striche, die sich animiert
  // selbst zeichnen können.
  const [patternConfig, setPatternConfig] = useState<PatternConfig>({
    patternType: "lines",
    count: 5,
    brushName: "Figma Verite",
    strokeWidth: 0.3,
    opacity: 100,
    color: "white",
    seed: Math.floor(Math.random() * 999999),
  });
  const [patternStrokes, setPatternStrokes] = useState<PatternStroke[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  // Generierte Linien über Text & Illustrationen rendern (Standard: dahinter).
  const [patternFront, setPatternFront] = useState(false);
  const updatePattern = useCallback(
    (patch: Partial<PatternConfig>) =>
      setPatternConfig((c) => ({ ...c, ...patch })),
    []
  );
  const skipRegenRef = useRef(false);
  useEffect(() => {
    if (skipRegenRef.current) { skipRegenRef.current = false; return; }
    // Neue Linien generieren, aber die manuell gezogene Platzierung (offsetX/Y)
    // je Linie beibehalten – sonst springen verschobene Linien zurück.
    setPatternStrokes((prev) =>
      generatePatternStrokes(patternConfig, size.w, size.h).map((s, i) =>
        prev[i] ? { ...s, offsetX: prev[i].offsetX, offsetY: prev[i].offsetY } : s
      )
    );
  }, [patternConfig, size.w, size.h]);

  const effectivePatternConfig = { ...patternConfig, color: inverted ? "black" as const : "white" as const };

  // ── Freihand-Kreide-Striche ──────────────────────────
  const [strokes, setStrokes] = useState<ChalkStroke[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // ── Werkzeug-Modus + svg-brush Zeichnen ──────────────
  const [mode, setMode] = useState<ToolMode>("move");
  const [brushName, setBrushName] = useState("Figma Verite");
  const [brushWidth, setBrushWidth] = useState(0.3);
  const [brushOpacity, setBrushOpacity] = useState(1.0);
  const [chalkColor, setChalkColor] = useState("#FFFFFF");
  const [isDrawing, setIsDrawing] = useState(false);
  const drawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const liveRafRef = useRef<number | null>(null);
  const [liveStrokePath, setLiveStrokePath] = useState<string | undefined>();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const posterCanvasRef = useRef<PosterCanvasHandle>(null);

  // Text-Elemente
  const [headerText, setHeaderText] = useState("Незабутній Захід");
  const [headerFont, setHeaderFont] = useState("Oswald");
  const [headerSize, setHeaderSize] = useState(52);
  const [headerWeight, setHeaderWeight] = useState("700");

  const [subText, setSubText] = useState("Який ви не пропустите");
  const [subFont, setSubFont] = useState("Oswald");
  const [subSize, setSubSize] = useState(26);

  const [bodyText, setBodyText] = useState(
    "15:00 01.01\nMicado Café\nSchertlinstr. 6"
  );
  const [bodyFont, setBodyFont] = useState("Oswald");
  const [bodySize, setBodySize] = useState(18);

  const [detailText, setDetailText] = useState(
    "Реєстрація в Інстаграм"
  );
  const [detailFont, setDetailFont] = useState("Oswald");
  const [detailSize, setDetailSize] = useState(14);

  // Umriss-Stil je Textfeld (hohle Buchstaben mit Kontur, wie der Referenz-Titel)
  const [headerOutline, setHeaderOutline] = useState(false);
  const [subOutline, setSubOutline] = useState(false);
  const [bodyOutline, setBodyOutline] = useState(false);
  const [detailOutline] = useState(false);

  const [selectedLayoutId, setSelectedLayoutId] = useState(LAYOUTS[0].id);

  // Positionen (%) für Drag & Drop — initialisiert aus erstem Layout
  const [positions, setPositions] = useState<Record<PosKey, Position>>(
    () => LAYOUTS[0].positions as Record<PosKey, Position>
  );
  const [textAligns, setTextAligns] = useState<Record<PosKey, Align>>(() => ({
    header: LAYOUTS[0].aligns?.header ?? "center",
    sub: LAYOUTS[0].aligns?.sub ?? "center",
    body: LAYOUTS[0].aligns?.body ?? "center",
    detail: LAYOUTS[0].aligns?.detail ?? "center",
  }));

  // Platzierte Logos/Illustrationen — Logo aus erstem Layout vorbelegt
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>(() =>
    LOGO_REGISTRY.length === 0
      ? []
      : LAYOUTS[0].logoSlots.map((slot, i) => ({
          id: makeId(),
          assetId: LOGO_REGISTRY[i % LOGO_REGISTRY.length].id,
          x: slot.x,
          y: slot.y,
          scale: slot.scale,
          rotation: 0,
          opacity: 1,
          flipX: false,
          zIndex: i + 1,
        }))
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  // Stapel-Reihenfolge der Texte untereinander (textId → z, Standard 0).
  const [textZ, setTextZ] = useState<Record<string, number>>({});

  // Dynamisch hinzugefügte Textelemente (zusätzlich zu den 4 benannten)
  interface ExtraText {
    id: string; text: string; font: string; size: number;
    weight: string; align: Align; outline: boolean; position: Position;
  }
  const [extraTexts, setExtraTexts] = useState<ExtraText[]>([]);
  const extraTextsRef = useRef<ExtraText[]>([]);
  useEffect(() => { extraTextsRef.current = extraTexts; }, [extraTexts]);
  // Natürliches Höhen-/Breitenverhältnis je Asset (für die Skalier-Griffe),
  // beim Laden des Bildes erfasst.
  const imgRatios = useRef<Map<string, number>>(new Map());
  // Vom Nutzer hochgeladene Illustrationen (zusätzlich zum Registry)
  const [customAssets, setCustomAssets] = useState<AssetItem[]>([]);
  const logoAssets = useMemo(
    () => [...LOGO_REGISTRY, ...customAssets.filter((a) => a.category === "logos")],
    [customAssets]
  );
  const illustrationAssets = useMemo(
    () => [...ASSET_REGISTRY, ...customAssets.filter((a) => a.category !== "logos")],
    [customAssets]
  );
  const allAssets = useMemo(
    () => [...logoAssets, ...illustrationAssets],
    [logoAssets, illustrationAssets]
  );

  const handleUpload = useCallback((file: File, category: AssetCategory = "icons") => {
    const url = URL.createObjectURL(file);
    const id = `custom/${makeId()}`;
    const isSvg = /svg/i.test(file.type) || /\.svg$/i.test(file.name);
    const asset: AssetItem = {
      id,
      name: file.name.replace(/\.(svg|png|jpe?g)$/i, ""),
      category,
      src: url,
      defaultScale: 0.25,
      anchor: "center",
    };
    // SVGs sind bereits Strichgrafik → unverändert übernehmen.
    if (isSvg) {
      setCustomAssets((prev) => [...prev, asset]);
      return;
    }
    // Fotos sofort einblenden, dann im Hintergrund in Kreide umwandeln.
    asset.originalSrc = url;
    asset.chalk = { ...DEFAULT_CHALKIFY, enabled: true };
    setCustomAssets((prev) => [...prev, asset]);
    chalkifyImage(url, DEFAULT_CHALKIFY)
      .then((dataUrl) => {
        setCustomAssets((prev) =>
          prev.map((a) => (a.id === id ? { ...a, src: dataUrl } : a))
        );
      })
      .catch(() => {
        /* bei Fehler bleibt das Originalfoto sichtbar */
      });
  }, []);

  // Kreide-Filter eines hochgeladenen Fotos anpassen (oder aus-/einschalten):
  // mit den neuen Parametern neu verarbeiten und `src` aktualisieren.
  const updateAssetChalk = useCallback(
    (assetId: string, patch: Partial<ChalkifyOptions & { enabled: boolean }>) => {
      setCustomAssets((prev) => {
        const target = prev.find((a) => a.id === assetId);
        if (!target || !target.originalSrc) return prev;
        const next = {
          ...DEFAULT_CHALKIFY,
          enabled: true,
          ...target.chalk,
          ...patch,
        };
        // Filter aus → zurück zum Originalfoto, kein Re-Processing nötig.
        if (!next.enabled) {
          return prev.map((a) =>
            a.id === assetId ? { ...a, chalk: next, src: a.originalSrc! } : a
          );
        }
        const orig = target.originalSrc;
        chalkifyImage(orig, next).then((dataUrl) => {
          setCustomAssets((cur) =>
            cur.map((a) => (a.id === assetId ? { ...a, src: dataUrl } : a))
          );
        });
        // Parameter sofort speichern; src folgt asynchron.
        return prev.map((a) => (a.id === assetId ? { ...a, chalk: next } : a));
      });
    },
    []
  );

  // ── Undo/Redo ────────────────────────────────────────
  // Snapshot der editierbaren Sammlungen (Striche, Logos, Positionen).
  type Snapshot = {
    strokes: ChalkStroke[];
    placedAssets: PlacedAsset[];
    positions: Record<PosKey, Position>;
    patternStrokes: PatternStroke[];
    patternConfig: PatternConfig;
    extraTexts: { id: string; text: string; font: string; size: number; weight: string; align: Align; outline: boolean; position: Position }[];
  };
  const getAssetSrc = useCallback(
    (assetId: string) => allAssets.find((a) => a.id === assetId)?.src ?? "",
    [allAssets]
  );

  // Aktueller, snapshot-fähiger Zustand für Undo/Redo.
  const liveSnapshot: Snapshot = {
    strokes,
    placedAssets,
    positions,
    patternStrokes,
    patternConfig,
    extraTexts,
  };

  const applySnapshot = useCallback((s: Snapshot) => {
    // Config + Striche zusammen wiederherstellen, ohne dass der Generator-Effekt
    // (reagiert auf patternConfig-Änderung) die Striche neu würfelt.
    skipRegenRef.current = true;
    setStrokes(s.strokes);
    setPlacedAssets(s.placedAssets);
    setPositions(s.positions);
    setExtraTexts(s.extraTexts);
    // Klon → garantiert neue Referenz, damit der Generator-Effekt feuert und das
    // Skip-Flag verlässlich konsumiert (sonst könnte es hängenbleiben).
    setPatternConfig({ ...s.patternConfig });
    setPatternStrokes(s.patternStrokes);
  }, []);

  const { commit, undo, redo, canUndo, canRedo } = useUndoRedo(
    liveSnapshot,
    applySnapshot
  );

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
  // Bei Pattern-Linien-Drag: Start-Pointer + Start-Offset (Delta-basiert)
  const patternDrag = useRef<{
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
          (window.innerHeight - 172) / size.h, // -172: Navbar + unterer Toolbar/Hinweis-Streifen
          1.4
        )
      );
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [size.w, size.h]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayW = size.w * scale;

  // ── Snap lines ───────────────────────────────────────
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }[]>([]);
  const positionsRef = useRef(positions);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  const placedAssetsRef = useRef(placedAssets);
  useEffect(() => { placedAssetsRef.current = placedAssets; }, [placedAssets]);

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
      setSelectedTextId(key);
      setSelectedAssetId(null);
      setSelectedStrokeId(null);
      setSelectedPatternId(null);
      if ((POS_KEYS as readonly string[]).includes(key)) {
        const k = key as PosKey;
        beginDrag(k, positions[k].x, positions[k].y, e);
      } else {
        const et = extraTextsRef.current.find((t) => t.id === key);
        if (et) beginDrag(key, et.position.x, et.position.y, e);
      }
    },
    [beginDrag, positions]
  );

  // Platzierte Assets
  const handleAssetPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      const a = placedAssets.find((p) => p.id === id);
      if (!a) return;
      setSelectedAssetId(id);
      setSelectedTextId(null);
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
      setSelectedTextId(null);
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

  // Hintergrund-Linien: Delta-basiertes Verschieben (wie die fetten Striche)
  const handlePatternPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (mode !== "move") return;
      e.preventDefault();
      e.stopPropagation();
      const ps = patternStrokes.find((p) => p.id === id);
      if (!ps) return;
      commit();
      setSelectedPatternId(id);
      setSelectedStrokeId(null);
      setSelectedTextId(null);
      setSelectedAssetId(null);
      setDragging(id);
      patternDrag.current = {
        id,
        cx: e.clientX,
        cy: e.clientY,
        offX: ps.offsetX ?? 0,
        offY: ps.offsetY ?? 0,
      };
    },
    [mode, patternStrokes, commit]
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
      // Pattern-Linien-Drag: relativ über Pointer-Delta
      if (patternDrag.current && patternDrag.current.id === dragging) {
        const pd = patternDrag.current;
        const dxPct = ((e.clientX - pd.cx) / rect.width) * 100;
        const dyPct = ((e.clientY - pd.cy) / rect.height) * 100;
        const offX = Math.max(-80, Math.min(80, pd.offX + dxPct));
        const offY = Math.max(-80, Math.min(80, pd.offY + dyPct));
        setPatternStrokes((prev) =>
          prev.map((ps) =>
            ps.id === dragging ? { ...ps, offsetX: offX, offsetY: offY } : ps
          )
        );
        return;
      }
      const clamp = (v: number) => Math.max(5, Math.min(95, v));
      let px = clamp(
        ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100
      );
      let py = clamp(
        ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100
      );

      // Snap lines
      const SNAP = 2;
      const targets: { x: number; y: number }[] = [
        ...POS_KEYS.filter(k => k !== dragging).map(k => positionsRef.current[k]),
        ...extraTextsRef.current.filter(t => t.id !== dragging).map(t => t.position),
        ...placedAssetsRef.current.filter(a => a.id !== dragging).map(a => ({ x: a.x, y: a.y })),
      ];
      const lines: { x?: number; y?: number }[] = [];
      for (const t of targets) {
        if (Math.abs(px - t.x) < SNAP) { px = t.x; lines.push({ x: t.x }); break; }
      }
      for (const t of targets) {
        if (Math.abs(py - t.y) < SNAP) { py = t.y; lines.push({ y: t.y }); break; }
      }
      setSnapLines(lines);

      if ((POS_KEYS as readonly string[]).includes(dragging)) {
        const k = dragging as PosKey;
        setPositions((prev) => ({ ...prev, [k]: { x: px, y: py } }));
      } else if (extraTextsRef.current.some((t) => t.id === dragging)) {
        setExtraTexts((prev) => prev.map((t) => t.id === dragging ? { ...t, position: { x: px, y: py } } : t));
      } else {
        setPlacedAssets((prev) => prev.map((a) => (a.id === dragging ? { ...a, x: px, y: py } : a)));
      }
    };
    const onUp = () => {
      setDragging(null);
      strokeDrag.current = null;
      patternDrag.current = null;
      setSnapLines([]);
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

  const handleDragPlace = useCallback(
    (assetId: string, clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
      const asset = allAssets.find((a) => a.id === assetId);
      if (!asset) return;
      commit();
      const maxZ = placedAssets.reduce((m, p) => Math.max(m, p.zIndex), 0);
      const id = makeId();
      const isStroke = asset.category === "strokes";
      const isMask = isMaskAsset(asset.category);
      setPlacedAssets((prev) => [
        ...prev,
        {
          id, assetId, x, y,
          scale: asset.defaultScale,
          rotation: isStroke ? -8 + Math.random() * 16 : 0,
          opacity: isStroke ? 0.9 : 1,
          flipX: false, zIndex: maxZ + 1,
          ...(isMask ? { scaleY: 1, flipY: false, tint: isDefaultWhite(chalkColor) ? undefined : chalkColor } : {}),
        },
      ]);
      setSelectedAssetId(id);
    },
    [allAssets, placedAssets, chalkColor, commit]
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
    setSelectedLayoutId(layout.id);
    if (LOGO_REGISTRY.length === 0) {
      setPlacedAssets([]);
      setSelectedAssetId(null);
      return;
    }
    setPlacedAssets(
      layout.logoSlots.map((slot, i) => ({
        id: makeId(),
        assetId: LOGO_REGISTRY[i % LOGO_REGISTRY.length].id,
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

  // Text gegenüber den anderen Texten nach vorne/hinten schieben.
  const handleTextLayer = useCallback(
    (dir: 1 | -1) => {
      if (!selectedTextId) return;
      setTextZ((prev) => {
        const vals = Object.values(prev);
        const target = dir === 1 ? Math.max(0, ...vals) + 1 : Math.min(0, ...vals) - 1;
        return { ...prev, [selectedTextId]: target };
      });
    },
    [selectedTextId]
  );

  // Alles neu generieren — komplett neue Komposition im Brand-Rahmen:
  // zufälliges Layout (Positionen + Ausrichtung + Logo-Plätze) und ein neues
  // Hintergrund-Muster. Schriften, Text-Inhalte und platzierte Illustrationen
  // bleiben erhalten.
  const generateAll = useCallback(() => {
    commit();
    // 1) Zufälliges Layout: Positionen + Ausrichtung
    const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    setPositions(layout.positions);
    setTextAligns({
      header: layout.aligns?.header ?? "center",
      sub: layout.aligns?.sub ?? "center",
      body: layout.aligns?.body ?? "center",
      detail: layout.aligns?.detail ?? "center",
    });
    // 2) Logos neu in die Layout-Plätze setzen; andere platzierte
    //    Illustrationen (Porträts, Icons …) bleiben erhalten.
    setSelectedLayoutId(layout.id);
    setPlacedAssets((prev) => {
      const others = prev.filter((p) => {
        const item = allAssets.find((a) => a.id === p.assetId);
        return item?.category !== "logos";
      });
      if (LOGO_REGISTRY.length === 0) return others;
      const baseZ = others.reduce((m, p) => Math.max(m, p.zIndex), 0);
      const newLogos = layout.logoSlots.map((slot, i) => ({
        id: makeId(),
        assetId: LOGO_REGISTRY[i % LOGO_REGISTRY.length].id,
        x: slot.x,
        y: slot.y,
        scale: slot.scale,
        rotation: 0,
        opacity: 1,
        flipX: false,
        zIndex: baseZ + i + 1,
      }));
      return [...others, ...newLogos];
    });
    setSelectedAssetId(null);
    // 3) Hintergrund-Muster komplett neu würfeln
    setPatternConfig((prev) => ({
      ...prev, // Farbe (Weiß/Schwarz) bleibt beim Würfeln erhalten
      count: Math.round(3 + Math.random() * 8),
      straightness: Math.round((0.4 + Math.random() * 0.45) * 100) / 100,
      weight: Math.round(20 + Math.random() * 70),
      opacity: Math.round(45 + Math.random() * 45),
      direction: Math.round(Math.random() * 360),
      spread: Math.round((0.2 + Math.random() * 0.5) * 100) / 100,
      seed: Math.floor(Math.random() * 999999),
    }));
  }, [commit, allAssets]);

  const deleteSelectedStroke = useCallback(() => {
    if (!selectedStrokeId) return;
    commit();
    setStrokes((prev) => prev.filter((s) => s.id !== selectedStrokeId));
    setSelectedStrokeId(null);
  }, [selectedStrokeId, commit]);

  const updateSelectedStroke = useCallback(
    (patch: Partial<{ color: string; opacity: number; brushName: string; strokeWidth: number; front: boolean }>) => {
      if (!selectedStrokeId) return;
      setStrokes((prev) => prev.map((s) => {
        if (s.id !== selectedStrokeId) return s;
        const next = { ...s, ...patch };
        if (patch.brushName !== undefined || patch.strokeWidth !== undefined)
          next.svgPath = rerenderStroke(next, next.brushName, next.strokeWidth);
        return next;
      }));
    },
    [selectedStrokeId]
  );

  const deleteText = useCallback(() => {
    if (!selectedTextId) return;
    commit();
    if ((POS_KEYS as readonly string[]).includes(selectedTextId)) {
      // Named text: clear content
      const setters: Record<string, (v: string) => void> = {
        header: setHeaderText, sub: setSubText, body: setBodyText, detail: setDetailText,
      };
      setters[selectedTextId]?.("");
    } else {
      setExtraTexts((prev) => prev.filter((t) => t.id !== selectedTextId));
    }
    setSelectedTextId(null);
  }, [selectedTextId, commit]);

  const deleteSelectedPattern = useCallback(() => {
    if (!selectedPatternId) return;
    commit();
    setPatternStrokes((prev) => prev.filter((p) => p.id !== selectedPatternId));
    setSelectedPatternId(null);
  }, [selectedPatternId, commit]);

  const regeneratePattern = useCallback(() => {
    updatePattern({ seed: Math.floor(Math.random() * 999999) });
  }, [updatePattern]);

  // ── Freihand-Zeichnen (svg-brush) ────────────────────
  const getPointerPercent = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleDrawStart = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "draw") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setIsDrawing(true);
      drawPointsRef.current = [getPointerPercent(e)];
      setLiveStrokePath(undefined);
    },
    [mode, getPointerPercent]
  );

  const handleDrawMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode === "draw") setCursorPos({ x: e.clientX, y: e.clientY });
      if (!isDrawing) return;
      const pos = getPointerPercent(e);
      const pts = drawPointsRef.current;
      const last = pts[pts.length - 1];
      if (Math.hypot(pos.x - last.x, pos.y - last.y) > 0.5) {
        drawPointsRef.current = [...pts, pos];
        // Live-Pfad höchstens 1×/Frame neu erzeugen (svg-brush ist teuer).
        if (liveRafRef.current == null && drawPointsRef.current.length >= 2) {
          liveRafRef.current = requestAnimationFrame(() => {
            liveRafRef.current = null;
            setLiveStrokePath(createLivePath(drawPointsRef.current, brushName, brushWidth));
          });
        }
      }
    },
    [mode, isDrawing, getPointerPercent, brushName, brushWidth]
  );

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    if (liveRafRef.current != null) { cancelAnimationFrame(liveRafRef.current); liveRafRef.current = null; }
    setIsDrawing(false);
    const pts = drawPointsRef.current;
    drawPointsRef.current = [];
    setLiveStrokePath(undefined);
    if (pts.length < 2) return;
    commit();
    setStrokes((prev) => [...prev, makeFreehandStroke(pts, brushName, brushWidth, chalkColor, brushOpacity, prev.length)]);
  }, [isDrawing, commit, brushName, brushWidth, brushOpacity, chalkColor]);

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
        else if (selectedPatternId) deleteSelectedPattern();
        return;
      }
      // Ebene der Auswahl: ↑ nach vorne, ↓ nach hinten – einheitlich für
      // Logos/Illustrationen, Texte und Striche/Pinsel (statt eigener Buttons).
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const dir = e.key === "ArrowUp" ? 1 : -1;
        if (selectedAssetId) handleLayer(dir);
        else if (selectedTextId) handleTextLayer(dir);
        else if (selectedStrokeId) updateSelectedStroke({ front: dir === 1 });
        else return;
        e.preventDefault();
        return;
      }
      // Modus + Pinselgröße
      if (e.key === "d" || e.key === "D") setMode("draw");
      else if (e.key === "v" || e.key === "V" || e.key === "Escape")
        setMode("move");
      else if (e.key === "[") setBrushWidth((w) => Math.max(0.3, Math.round((w - 0.2) * 10) / 10));
      else if (e.key === "]") setBrushWidth((w) => Math.min(4, Math.round((w + 0.2) * 10) / 10));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedAssetId,
    deleteSelected,
    selectedStrokeId,
    deleteSelectedStroke,
    selectedPatternId,
    deleteSelectedPattern,
    selectedTextId,
    handleLayer,
    handleTextLayer,
    updateSelectedStroke,
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
      color: textColor,
      align: textAligns.header,
      outline: headerOutline,
      position: positions.header,
    },
    {
      key: "sub" as PosKey,
      text: subText,
      font: subFont,
      size: subSize,
      weight: "600",
      color: textColor,
      align: textAligns.sub,
      outline: subOutline,
      position: positions.sub,
    },
    {
      key: "body" as PosKey,
      text: bodyText,
      font: bodyFont,
      size: bodySize,
      weight: "400",
      color: textColor,
      align: textAligns.body,
      outline: bodyOutline,
      position: positions.body,
    },
    {
      key: "detail" as PosKey,
      text: detailText,
      font: detailFont,
      size: detailSize,
      weight: "400",
      color: textColor,
      align: textAligns.detail,
      outline: detailOutline,
      position: positions.detail,
    },
    ...extraTexts.map((et) => ({
      key: et.id,
      text: et.text,
      font: et.font,
      size: et.size,
      weight: et.weight,
      color: textColor,
      align: et.align,
      outline: et.outline,
      position: et.position,
    })),
  ];

  // Stapel-Reihenfolge anwenden: höheres z → später gezeichnet → oben.
  // Stabile Sortierung erhält die Default-Reihenfolge bei gleichem z.
  const orderedTextItems = [...textItems].sort(
    (a, b) => (textZ[a.key] ?? 0) - (textZ[b.key] ?? 0)
  );

  // ── Szene bauen (Single Source of Truth für Render + Export) ──
  const buildScene = useCallback((): PosterScene => {
    return {
      w: size.w,
      h: size.h,
      bg: bgColor,
      pattern: effectivePatternConfig,
      patternStrokes,
      patternFront,
      strokes,
      texts: orderedTextItems.map((t) => ({
        key: t.key,
        text: t.text,
        font: t.font,
        size: t.size * fontScale,
        weight: t.weight,
        color: t.color,
        align: t.align,
        outline: t.outline,
        x: t.position.x,
        y: t.position.y,
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
    fontScale,
    bgColor,
    effectivePatternConfig,
    patternStrokes,
    patternFront,
    positions,
    strokes,
    textItems,
    textZ,
    placedAssets,
    allAssets,
    getAssetSrc,
  ]);

  // ── Export PNG (3x, Druckauflösung) ──
  const handleExport = useCallback(async () => {
    const blob = await exportPNG(buildScene(), 3);
    downloadBlob(blob, "holos-poster.png");
  }, [buildScene]);


  // ── Add free text ────────────────────────────────────
  const addText = useCallback(() => {
    const id = makeId();
    commit();
    setExtraTexts((prev) => [
      ...prev,
      { id, text: "Text", font: headerFont, size: 24, weight: "400", align: "center", outline: false, position: { x: 50, y: 50 } },
    ]);
    setSelectedTextId(id);
  }, [commit, headerFont]);

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
    outline: headerOutline,
    setOutline: setHeaderOutline,
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
    outline: subOutline,
    setOutline: setSubOutline,
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
    outline: bodyOutline,
    setOutline: setBodyOutline,
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
  };

  return (
    <div className={`${styles.app} chalk-ui`}>
      <Sidebar
        sizes={POSTER_SIZES}
        posterSizeIndex={posterSizeIndex}
        setPosterSizeIndex={setPosterSizeIndex}
        inverted={inverted}
        onInvert={() => setInverted((i) => !i)}
        pattern={patternConfig}
        setPattern={updatePattern}
        patternFront={patternFront}
        setPatternFront={setPatternFront}
        onRegenerate={regeneratePattern}
        brushNames={getAllBrushes().map((b) => b.name)}
        layoutSection={
          <LayoutPanel
            layouts={LAYOUTS}
            onApply={applyLayout}
            hasLogos={LOGO_REGISTRY.length > 0}
            selectedId={selectedLayoutId}
          />
        }
        logoSection={
          <AssetPanel
            assets={logoAssets}
            onPlace={handlePlace}
            onDragPlace={handleDragPlace}
            onUpload={(file) => handleUpload(file, "logos")}
            selected={allAssets.find((a) => a.id === selectedAsset?.assetId)?.category === "logos" ? selectedAsset : null}
            onUpdateSelected={updateSelected}
            onDeleteSelected={deleteSelected}
            onChalkChange={updateAssetChalk}
          />
        }
        illustrationSection={
          <AssetPanel
            assets={illustrationAssets}
            onPlace={handlePlace}
            onDragPlace={handleDragPlace}
            onUpload={(file) => handleUpload(file, "icons")}
            selected={allAssets.find((a) => a.id === selectedAsset?.assetId)?.category !== "logos" ? selectedAsset : null}
            onUpdateSelected={updateSelected}
            onDeleteSelected={deleteSelected}
            onChalkChange={updateAssetChalk}
          />
        }
        strokePanel={(() => {
          if (!selectedStrokeId) return undefined;
          const s = strokes.find((st) => st.id === selectedStrokeId);
          if (!s) return undefined;
          const btnStyle = (active: boolean): React.CSSProperties => ({
            flex: 1, padding: "5px 0", borderRadius: 5, cursor: "pointer",
            background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
            border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.12)",
            color: "#f5f2ed", fontSize: 14,
          });
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.strokeTitle}</span>
                <button onClick={() => setSelectedStrokeId(null)} style={{ background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
              </div>
              {/* Color */}
              <div style={{ display: "flex", gap: 5 }}>
                {[{ label: "Weiß", hex: "#FFFFFF" }, { label: "Schwarz", hex: "#000000" }].map((c) => (
                  <button key={c.hex} onClick={() => updateSelectedStroke({ color: c.hex })} style={btnStyle(s.color.toUpperCase() === c.hex)}>{c.label}</button>
                ))}
              </div>
              {/* Opacity */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#888", fontSize: 13, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(s.opacity * 100)}%</span>
                <input type="range" min={10} max={100} value={Math.round(s.opacity * 100)}
                  onChange={(e) => updateSelectedStroke({ opacity: Number(e.target.value) / 100 })}
                  style={{ flex: 1, accentColor: "#fff", cursor: "pointer" }} />
              </div>
              {/* Width */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#888", fontSize: 13, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(s.strokeWidth * 100)}%</span>
                <input type="range" min={1} max={100} value={Math.round(s.strokeWidth * 100)}
                  onChange={(e) => updateSelectedStroke({ strokeWidth: Number(e.target.value) / 100 })}
                  style={{ flex: 1, accentColor: "#fff", cursor: "pointer" }} />
              </div>
              {/* Brush */}
              <select value={s.brushName}
                onChange={(e) => updateSelectedStroke({ brushName: e.target.value })}
                style={{ background: "#252525", border: "1px solid #3a3a3a", color: "#ddd", borderRadius: 5, padding: "8px 9px", fontSize: 15, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }}>
                {getAllBrushes().map((b) => <option key={b.name} value={b.name}>{b.name.replace("Figma ", "")}</option>)}
              </select>
              {/* Ebene über ↑/↓ statt Buttons */}
              <div style={{ fontSize: 12, color: "#666", textAlign: "center", letterSpacing: "0.04em" }}>{t.layerHint}</div>
              {/* Delete */}
              <button onClick={() => deleteSelectedStroke()}
                style={{ padding: "7px 0", borderRadius: 6, background: "rgba(240,100,100,0.12)", border: "1px solid rgba(240,100,100,0.35)", color: "#f08080", fontSize: 14, cursor: "pointer" }}>
                {t.deleteLabel}
              </button>
            </div>
          );
        })()}
        textPanel={(() => {
          if (!selectedTextId) return undefined;
          const namedFields: Record<PosKey, TextFieldState> = { header: headerField, sub: subField, body: bodyField, detail: detailField };
          if ((POS_KEYS as readonly string[]).includes(selectedTextId)) {
            const k = selectedTextId as PosKey;
            return (
              <TextPopup
                field={namedFields[k]}
                align={textAligns[k]}
                onAlignChange={(a) => setTextAligns((prev) => ({ ...prev, [k]: a }))}
                fonts={FONTS}
                onClose={() => setSelectedTextId(null)}
                showLayerHint
              />
            );
          }
          const et = extraTexts.find((t) => t.id === selectedTextId);
          if (!et) return undefined;
          const upd = (patch: Partial<typeof et>) =>
            setExtraTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, ...patch } : t));
          const etField: TextFieldState = {
            text: et.text, setText: (v) => upd({ text: v }),
            font: et.font, setFont: (v) => upd({ font: v }),
            size: et.size, setSize: (v) => upd({ size: v }),
            sizeMin: 8, sizeMax: 120, multiline: true,
            weight: et.weight, setWeight: (v) => upd({ weight: v }),
            outline: et.outline, setOutline: (v) => upd({ outline: v }),
          };
          return (
            <TextPopup
              field={etField}
              align={et.align}
              onAlignChange={(a) => upd({ align: a })}
              fonts={FONTS}
              onClose={() => setSelectedTextId(null)}
              onDelete={() => { setExtraTexts((prev) => prev.filter((t) => t.id !== selectedTextId)); setSelectedTextId(null); }}
              showLayerHint
            />
          );
        })()}
        onAddText={addText}
        onRandomize={generateAll}
        onExport={handleExport}
      />

      <div className={styles.preview}>
        <PosterCanvas
          ref={posterCanvasRef}
          size={size}
          pattern={effectivePatternConfig}
          patternStrokes={patternStrokes}
          strokes={strokes}
          bg={bgColor}
          scale={scale}
          containerRef={containerRef}
          onBackgroundClick={() => {
            setSelectedAssetId(null);
            setSelectedStrokeId(null);
            setSelectedTextId(null);
            setSelectedPatternId(null);
          }}
          liveStrokePath={liveStrokePath}
          liveStrokeColor={chalkColor}
          liveStrokeOpacity={brushOpacity}
          selectedStrokeId={selectedStrokeId}
          onStrokePointerDown={mode === "move" ? handleStrokePointerDown : undefined}
          selectedPatternId={selectedPatternId}
          onPatternPointerDown={mode === "move" ? handlePatternPointerDown : undefined}
          drawMode={mode === "draw"}
          patternFront={patternFront}
        >
          {/* Snap lines */}
          {snapLines.length > 0 && (
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 80, overflow: "visible" }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {snapLines.map((l, i) =>
                l.x !== undefined
                  ? <line key={i} x1={l.x} y1={0} x2={l.x} y2={100} stroke="#4af" strokeWidth={0.4} strokeDasharray="2 1.5" />
                  : <line key={i} x1={0} y1={l.y} x2={100} y2={l.y!} stroke="#4af" strokeWidth={0.4} strokeDasharray="2 1.5" />
              )}
            </svg>
          )}

          {placedAssets.map((asset) => {
            const item = allAssets.find((a) => a.id === asset.assetId);
            const commonOutline = "none";

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

          {/* Trash bin — top-right corner, shown for any selected element */}
          {(selectedAsset || selectedStrokeId || selectedTextId) && (
            <button
              data-no-chalk
              onClick={() => {
                if (selectedAsset) { commit(); deleteSelected(); }
                else if (selectedStrokeId) deleteSelectedStroke();
                else if (selectedTextId) deleteText();
              }}
              style={{
                position: "absolute", top: 8, right: 8, zIndex: 200,
                background: "rgba(20,20,20,0.85)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6, color: "#f08080", width: 28, height: 28,
                cursor: "pointer", fontSize: 14, display: "flex",
                alignItems: "center", justifyContent: "center", pointerEvents: "auto",
              }}
              title="Löschen"
            >
              🗑
            </button>
          )}

          {orderedTextItems.map((item) => (
            <TextOverlay
              key={item.key}
              id={item.key}
              text={item.text}
              font={item.font}
              size={item.size * fontScale}
              weight={item.weight}
              color={item.color}
              align={item.align}
              outline={item.outline}
              position={item.position}
              scale={scale}
              dragging={dragging === item.key}
              selected={selectedTextId === item.key}
              onPointerDown={handlePointerDown}
            />
          ))}

          {/* Draw capture — only active in draw mode */}
          {mode === "draw" && (
            <div
              style={{
                position: "absolute", inset: 0, zIndex: 61,
                pointerEvents: "auto", cursor: "none", touchAction: "none",
              }}
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
              onPointerLeave={() => { handleDrawEnd(); setCursorPos(null); }}
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
              width: brushWidth * 20 * scale,
              height: brushWidth * 20 * scale,
              borderColor: `${chalkColor}88`,
              borderStyle: "solid",
            }}
          />
        )}

        {/* Schwebende Werkzeug-/Zeichnen-Bar (immer sichtbar) */}
        <DrawingToolbar
          mode={mode}
          setMode={setMode}
          chalkColor={chalkColor}
          setChalkColor={setChalkColor}
          brushName={brushName}
          setBrushName={setBrushName}
          brushWidth={brushWidth}
          setBrushWidth={setBrushWidth}
          brushOpacity={brushOpacity}
          setBrushOpacity={setBrushOpacity}
          onUndo={undo}
          canUndo={canUndo}
          onRedo={redo}
          canRedo={canRedo}
        />

        <p className={styles.previewHint}>
          {mode === "draw"
            ? t.hintDraw
            : t.hintMove}
        </p>
      </div>

    </div>
  );
}
