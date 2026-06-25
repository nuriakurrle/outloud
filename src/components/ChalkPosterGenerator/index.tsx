import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AssetItem,
  ChalkStroke,
  DrawBrush,
  PatternConfig,
  PatternStroke,
  PlacedAsset,
  Position,
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
import {
  chalkifyImage,
  DEFAULT_CHALKIFY,
  type ChalkifyOptions,
} from "../../lib/chalkifyImage";
import { Sidebar, type TextFieldState } from "./Sidebar";
import { PosterCanvas, type PosterCanvasHandle } from "./PosterCanvas";
import { TextOverlay } from "./TextOverlay";
import { SelectionHandles } from "./SelectionHandles";
import { AssetPanel } from "./AssetPanel";
import { LayoutPanel } from "./LayoutPanel";
import { LAYOUTS, type PosterLayout } from "./layouts";
import type { Align } from "../../lib/layouts";
import { type PosterScene, type SceneAsset } from "../../lib/posterRender";
import { exportPNG, downloadBlob } from "../../lib/exporter";
import styles from "../../styles/chalkPoster.module.css";
import {
  makeId,
  POS_KEYS,
  type PosKey,
  FONTS,
  POSTER_SIZES,
  DISPLAY_FONTS,
  SCRIPT_FONTS,
  BODY_FONTS,
  DETAIL_FONTS,
  pick,
  CHALK,
  CHALK_DIM,
  POSTER_BG,
} from "./constants";
import { useUndoRedo } from "./useUndoRedo";

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
    straightness: 0.6,
    weight: 40,
    opacity: 65,
    direction: 135,
    spread: 0.4,
    color: "white",
    seed: Math.floor(Math.random() * 999999),
  });
  const [patternStrokes, setPatternStrokes] = useState<PatternStroke[]>([]);
  // Ausgewählte Hintergrund-Linie (für Auswahl-Rahmen & Löschen)
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    null
  );
  // „Gespeichert": friert das aktuelle Muster ein → Slider/Seed überschreiben
  // es nicht mehr, sodass man darauf weiter aufbauen kann.
  const [patternLocked, setPatternLocked] = useState(false);
  const updatePattern = useCallback(
    (patch: Partial<PatternConfig>) =>
      setPatternConfig((c) => ({ ...c, ...patch })),
    []
  );
  // Beim Undo/Redo wird die Config UND die exakten Striche wiederhergestellt;
  // dann darf der Generator-Effekt nicht erneut würfeln und sie überschreiben.
  const skipRegenRef = useRef(false);
  // Striche neu erzeugen, sobald sich Config oder Postergröße ändert —
  // außer das Muster ist gespeichert (dann bleibt es unangetastet).
  useEffect(() => {
    if (skipRegenRef.current) {
      skipRegenRef.current = false;
      return;
    }
    if (patternLocked) return;
    setPatternStrokes(generateChalkStrokes(patternConfig, size.w, size.h));
  }, [patternConfig, size.w, size.h, patternLocked]);

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
  const posterCanvasRef = useRef<PosterCanvasHandle>(null);
  const animFrameRef = useRef<number | null>(null);

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
  // Schriftfarbe je Textfeld: Weiß (Kreide) oder Schwarz.
  const [headerColor, setHeaderColor] = useState(CHALK);
  const [subColor, setSubColor] = useState(CHALK);
  const [bodyColor, setBodyColor] = useState(CHALK);
  const [detailColor, setDetailColor] = useState(CHALK_DIM);

  // Umriss-Stil je Textfeld (hohle Buchstaben mit Kontur, wie der Referenz-Titel)
  const [headerOutline, setHeaderOutline] = useState(false);
  const [subOutline, setSubOutline] = useState(false);
  const [bodyOutline, setBodyOutline] = useState(false);
  const [detailOutline, setDetailOutline] = useState(false);

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
    const id = `custom/${makeId()}`;
    const isSvg = /svg/i.test(file.type) || /\.svg$/i.test(file.name);
    const asset: AssetItem = {
      id,
      name: file.name.replace(/\.(svg|png|jpe?g)$/i, ""),
      category: "logos",
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
    patternLocked: boolean;
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
    patternLocked,
  };

  const applySnapshot = useCallback((s: Snapshot) => {
    // Config + Striche zusammen wiederherstellen, ohne dass der Generator-Effekt
    // (reagiert auf patternConfig-Änderung) die Striche neu würfelt.
    skipRegenRef.current = true;
    setStrokes(s.strokes);
    setPlacedAssets(s.placedAssets);
    setPositions(s.positions);
    // Klon → garantiert neue Referenz, damit der Generator-Effekt feuert und das
    // Skip-Flag verlässlich konsumiert (sonst könnte es hängenbleiben).
    setPatternConfig({ ...s.patternConfig });
    setPatternLocked(s.patternLocked);
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
      setSelectedTextKey(null);
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
      patternDrag.current = null;
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

  // Alles neu generieren — komplett neue Komposition im Brand-Rahmen:
  // zufälliges Layout (Positionen + Ausrichtung + Logo-Plätze), neue Schriften
  // je Textfeld und ein neues Hintergrund-Muster. Erhalten bleiben: die
  // Text-Inhalte, vom Nutzer platzierte Illustrationen (Porträts, Icons …)
  // sowie Freihand-Striche.
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
    const logos = ASSET_REGISTRY.filter((a) => a.category === "logos");
    setPlacedAssets((prev) => {
      const others = prev.filter((p) => {
        const item = allAssets.find((a) => a.id === p.assetId);
        return item?.category !== "logos";
      });
      if (logos.length === 0) return others;
      const baseZ = others.reduce((m, p) => Math.max(m, p.zIndex), 0);
      const newLogos = layout.logoSlots.map((slot, i) => ({
        id: makeId(),
        assetId: logos[i % logos.length].id,
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
    // 3) Schriften je Textrolle neu würfeln (passende Pools)
    setHeaderFont(pick(DISPLAY_FONTS));
    setSubFont(pick(SCRIPT_FONTS));
    setBodyFont(pick(BODY_FONTS));
    setDetailFont(pick(DETAIL_FONTS));
    // 4) Hintergrund-Muster komplett neu würfeln
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

  const deleteSelectedPattern = useCallback(() => {
    if (!selectedPatternId) return;
    commit();
    setPatternStrokes((prev) => prev.filter((p) => p.id !== selectedPatternId));
    setSelectedPatternId(null);
  }, [selectedPatternId, commit]);

  // „Mehr Linien": zusätzliche Striche (neuer Seed) an das aktuelle Muster
  // anhängen und es gleich speichern, damit nichts überschrieben wird.
  const addPatternLines = useCallback(() => {
    commit();
    const extra = generateChalkStrokes(
      { ...patternConfig, seed: Math.floor(Math.random() * 999999) },
      size.w,
      size.h
    ).map((s) => ({ ...s, id: makeId() })); // eindeutige IDs (keine Kollision mit p0…pN)
    setPatternStrokes((prev) => [...prev, ...extra]);
    setPatternLocked(true);
  }, [patternConfig, size.w, size.h, commit]);

  // Speichern an/aus. Beim Würfeln neuer Linien wird automatisch entsperrt.
  const togglePatternLock = useCallback(() => setPatternLocked((l) => !l), []);
  const regeneratePattern = useCallback(() => {
    setPatternLocked(false);
    updatePattern({ seed: Math.floor(Math.random() * 999999) });
  }, [updatePattern]);

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
        else if (selectedPatternId) deleteSelectedPattern();
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
    selectedPatternId,
    deleteSelectedPattern,
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
      outline: headerOutline,
    },
    {
      key: "sub" as PosKey,
      text: subText,
      font: subFont,
      size: subSize,
      weight: "600",
      color: subColor,
      align: textAligns.sub,
      outline: subOutline,
    },
    {
      key: "body" as PosKey,
      text: bodyText,
      font: bodyFont,
      size: bodySize,
      weight: "400",
      color: bodyColor,
      align: textAligns.body,
      outline: bodyOutline,
    },
    {
      key: "detail" as PosKey,
      text: detailText,
      font: detailFont,
      size: detailSize,
      weight: "400",
      color: detailColor,
      align: textAligns.detail,
      outline: detailOutline,
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
        outline: t.outline,
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
    color: subColor,
    setColor: setSubColor,
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
    color: bodyColor,
    setColor: setBodyColor,
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
    color: detailColor,
    setColor: setDetailColor,
  };

  return (
    <div className={`${styles.app} chalk-ui`}>
      <Sidebar
        fonts={FONTS}
        sizes={POSTER_SIZES}
        posterSizeIndex={posterSizeIndex}
        setPosterSizeIndex={setPosterSizeIndex}
        bg={bgColor}
        setBg={setBgColor}
        pattern={patternConfig}
        setPattern={updatePattern}
        onRegenerate={regeneratePattern}
        onAddLines={addPatternLines}
        patternLocked={patternLocked}
        onToggleLock={togglePatternLock}
        isPlaying={isPlaying}
        onTogglePlay={() => (isPlaying ? handleStopPlay() : setIsPlaying(true))}
        animDuration={animDuration}
        setAnimDuration={setAnimDuration}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
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
            onChalkChange={updateAssetChalk}
          />
        }
        onRandomize={generateAll}
        onExport={handleExport}
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
            setSelectedPatternId(null);
          }}
        >
          {/* Hintergrund-Linien: Hit-/Drag-Flächen (unterste interaktive Ebene).
              Liegt als erstes Kind mit zIndex 0 unter Assets/Text/fetten Strichen. */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {patternStrokes.map((ps) => {
              const ox = ps.offsetX ?? 0;
              const oy = ps.offsetY ?? 0;
              const d = ps.points
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x + ox} ${p.y + oy}`)
                .join(" ");
              const sw = Math.max((ps.weight / size.w) * 100, 2.5);
              const isSel = selectedPatternId === ps.id;
              return (
                <path
                  key={ps.id}
                  d={d}
                  fill="none"
                  stroke={isSel ? "rgba(255,255,255,0.5)" : "transparent"}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={isSel ? "1.5 1.5" : undefined}
                  style={{
                    pointerEvents: mode === "move" ? "stroke" : "none",
                    cursor: dragging === ps.id ? "grabbing" : "grab",
                  }}
                  onPointerDown={(e) => handlePatternPointerDown(ps.id, e)}
                  onClick={() => setSelectedPatternId(ps.id)}
                />
              );
            })}
          </svg>

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
              outline={item.outline}
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
          canUndo={canUndo}
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
