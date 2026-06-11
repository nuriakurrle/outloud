import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BorderConfig,
  DividerStyle,
  PatternConfig,
  PlacedAsset,
  Position,
  PosterSize,
} from "../../types/poster";
import { drawChalkPatterns } from "../../lib/chalkPatterns";
import { drawChalkBorder } from "../../lib/chalkBorders";
import { drawChalkDivider } from "../../lib/chalkDividers";
import { smartPlace } from "../../lib/smartPlace";
import { ASSET_REGISTRY } from "../../assetRegistry";
import { Sidebar, type TextFieldState } from "./Sidebar";
import { PosterCanvas } from "./PosterCanvas";
import { TextOverlay } from "./TextOverlay";
import { DividerOverlay } from "./DividerOverlay";
import { AssetPanel } from "./AssetPanel";
import { LayoutPanel } from "./LayoutPanel";
import { LAYOUTS, type PosterLayout } from "./layouts";
import styles from "../../styles/chalkPoster.module.css";

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `placed-${Date.now()}-${Math.random()}`;
}

const POS_KEYS = ["header", "sub", "body", "detail", "divider"] as const;

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
const POSTER_BG = "#1e1e1e";

type PosKey = "header" | "sub" | "body" | "detail" | "divider";

export function ChalkPosterGenerator() {
  // Poster-Größe
  const [posterSizeIndex, setPosterSizeIndex] = useState(0);
  const size = POSTER_SIZES[posterSizeIndex];

  // Pattern
  const [patternStyle, setPatternStyle] =
    useState<PatternConfig["style"]>("flowing");
  const [patternDensity, setPatternDensity] = useState(50);
  const [patternStroke, setPatternStroke] = useState(3);
  const [patternOpacity, setPatternOpacity] = useState(60);
  const [patternSeed, setPatternSeed] = useState(
    Math.floor(Math.random() * 9999)
  );

  // Border & Divider
  const [borderStyle, setBorderStyle] =
    useState<BorderConfig["style"]>("dashed");
  const [borderWeight, setBorderWeight] = useState(2);
  const [dividerStyle, setDividerStyle] =
    useState<DividerStyle["style"]>("line");

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

  // Positionen (%) für Drag & Drop
  const [positions, setPositions] = useState<Record<PosKey, Position>>({
    header: { x: 50, y: 22 },
    sub: { x: 50, y: 35 },
    body: { x: 50, y: 52 },
    detail: { x: 50, y: 82 },
    divider: { x: 50, y: 67 },
  });

  // Platzierte Logos (nur die angefertigten Assets, kein Upload)
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const getAssetSrc = useCallback(
    (assetId: string) =>
      ASSET_REGISTRY.find((a) => a.id === assetId)?.src ?? "",
    []
  );

  // Drag-State (kann eine Text/Divider-Position ODER eine Asset-ID sein)
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
      setDragging(id);
      dragOffset.current = {
        x: e.clientX - rect.left - (curX / 100) * rect.width,
        y: e.clientY - rect.top - (curY / 100) * rect.height,
      };
    },
    []
  );

  // Text & Trenner
  const handlePointerDown = useCallback(
    (key: string, e: React.PointerEvent) => {
      const k = key as PosKey;
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
      beginDrag(id, a.x, a.y, e);
    },
    [beginDrag, placedAssets]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
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
          [k]: k === "divider" ? { x: 50, y: py } : { x: px, y: py },
        }));
      } else {
        setPlacedAssets((prev) =>
          prev.map((a) => (a.id === dragging ? { ...a, x: px, y: py } : a))
        );
      }
    };
    const onUp = () => setDragging(null);
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
      const asset = ASSET_REGISTRY.find((a) => a.id === assetId);
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
      setPlacedAssets((prev) => [
        ...prev,
        {
          id,
          assetId,
          x: pos.x,
          y: pos.y,
          scale: asset.defaultScale,
          rotation: 0,
          opacity: 1,
          flipX: false,
          zIndex: maxZ + 1,
        },
      ]);
      setSelectedAssetId(id);
    },
    [placedAssets, positions, size.w, size.h]
  );

  // Wendet ein Layout an: ordnet Texte an und platziert die vorhandenen
  // Logos der Reihe nach in die Logo-Plätze des Layouts.
  const applyLayout = useCallback((layout: PosterLayout) => {
    setPositions(layout.positions);
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

  // Delete-Taste entfernt ausgewähltes Asset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedAssetId &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAssetId, deleteSelected]);

  const selectedAsset =
    placedAssets.find((a) => a.id === selectedAssetId) ?? null;

  // ── Konfig-Objekte ───────────────────────────────────
  const patternConfig: PatternConfig = {
    style: patternStyle,
    density: patternDensity,
    strokeWeight: patternStroke,
    opacity: patternOpacity,
    seed: patternSeed,
  };
  const borderConfig: BorderConfig = {
    style: borderStyle,
    weight: borderWeight,
  };
  const dividerConfig: DividerStyle = { style: dividerStyle };

  // Einheitliche Text-Element-Beschreibung für Overlay + Export
  const textItems = [
    {
      key: "header" as PosKey,
      text: headerText,
      font: headerFont,
      size: headerSize,
      weight: headerWeight,
      color: CHALK,
    },
    {
      key: "sub" as PosKey,
      text: subText,
      font: subFont,
      size: subSize,
      weight: "600",
      color: CHALK,
    },
    {
      key: "body" as PosKey,
      text: bodyText,
      font: bodyFont,
      size: bodySize,
      weight: "400",
      color: CHALK,
    },
    {
      key: "detail" as PosKey,
      text: detailText,
      font: detailFont,
      size: detailSize,
      weight: "400",
      color: CHALK_DIM,
    },
  ];

  // ── Export PNG ───────────────────────────────────────
  const handleExport = useCallback(async () => {
    const dpr = 3;
    const canvas = document.createElement("canvas");
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = POSTER_BG;
    ctx.fillRect(0, 0, size.w, size.h);
    drawChalkPatterns(ctx, size.w, size.h, patternConfig);
    drawChalkBorder(ctx, size.w, size.h, borderConfig);
    drawChalkDivider(
      ctx,
      size.w,
      (positions.divider.y / 100) * size.h,
      dividerConfig
    );

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of textItems) {
      ctx.fillStyle = item.color;
      ctx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
      const cx = (positions[item.key].x / 100) * size.w;
      const cy = (positions[item.key].y / 100) * size.h;
      const lines = item.text.split("\n");
      const lh = item.size * 1.15;
      const startY = cy - (lh * (lines.length - 1)) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, startY + i * lh);
      });
    }

    // Platzierte Logos (nach zIndex sortiert), über dem Text, Originalfarben
    const sortedAssets = [...placedAssets].sort((a, b) => a.zIndex - b.zIndex);
    for (const asset of sortedAssets) {
      const src = getAssetSrc(asset.assetId);
      if (!src) continue;
      const img = new Image();
      img.src = src;
      try {
        await img.decode();
      } catch {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      const iw = img.naturalWidth || img.width || 100;
      const ih = img.naturalHeight || img.height || 100;
      // Zielbreite = Anteil der Posterbreite, Höhe über Seitenverhältnis
      const targetW = asset.scale * size.w;
      const targetH = targetW * (ih / iw);

      ctx.save();
      const px = (asset.x / 100) * size.w;
      const py = (asset.y / 100) * size.h;
      ctx.translate(px, py);
      ctx.rotate((asset.rotation * Math.PI) / 180);
      if (asset.flipX) ctx.scale(-1, 1);
      ctx.globalAlpha = asset.opacity;
      ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "kreide-poster.png";
    a.click();
  }, [
    size,
    patternConfig,
    borderConfig,
    dividerConfig,
    positions,
    textItems,
    placedAssets,
    getAssetSrc,
  ]);

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
    <div className={styles.app}>
      <Sidebar
        fonts={FONTS}
        sizes={POSTER_SIZES}
        posterSizeIndex={posterSizeIndex}
        setPosterSizeIndex={setPosterSizeIndex}
        patternStyle={patternStyle}
        setPatternStyle={setPatternStyle}
        patternDensity={patternDensity}
        setPatternDensity={setPatternDensity}
        patternStroke={patternStroke}
        setPatternStroke={setPatternStroke}
        patternOpacity={patternOpacity}
        setPatternOpacity={setPatternOpacity}
        onRegenerate={() =>
          setPatternSeed(Math.floor(Math.random() * 9999))
        }
        borderStyle={borderStyle}
        setBorderStyle={setBorderStyle}
        borderWeight={borderWeight}
        setBorderWeight={setBorderWeight}
        dividerStyle={dividerStyle}
        setDividerStyle={setDividerStyle}
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
            assets={ASSET_REGISTRY}
            onPlace={handlePlace}
            selected={selectedAsset}
            onUpdateSelected={updateSelected}
            onDeleteSelected={deleteSelected}
            onLayer={handleLayer}
          />
        }
        onExport={handleExport}
      />

      <div className={styles.preview}>
        <PosterCanvas
          size={size}
          pattern={patternConfig}
          border={borderConfig}
          divider={dividerConfig}
          dividerY={positions.divider.y}
          scale={scale}
          containerRef={containerRef}
          onBackgroundClick={() => setSelectedAssetId(null)}
        >
          {placedAssets.map((asset) => (
            <img
              key={asset.id}
              src={getAssetSrc(asset.assetId)}
              alt=""
              draggable={false}
              onPointerDown={(e) => handleAssetPointerDown(asset.id, e)}
              style={{
                position: "absolute",
                left: `${asset.x}%`,
                top: `${asset.y}%`,
                // Breite = Anteil der Posterbreite (in Anzeige-Pixeln)
                width: `${asset.scale * displayW}px`,
                height: "auto",
                transform: `translate(-50%, -50%) ${
                  asset.flipX ? "scaleX(-1)" : ""
                } rotate(${asset.rotation}deg)`,
                transformOrigin: "center",
                opacity: asset.opacity,
                zIndex: asset.zIndex,
                cursor: dragging === asset.id ? "grabbing" : "grab",
                outline:
                  selectedAssetId === asset.id
                    ? "2px dashed rgba(255,255,255,0.5)"
                    : "none",
                outlineOffset: "4px",
                pointerEvents: "auto",
                userSelect: "none",
              }}
            />
          ))}
          {dividerStyle !== "none" && (
            <DividerOverlay
              position={positions.divider}
              dragging={dragging === "divider"}
              onPointerDown={handlePointerDown}
            />
          )}
          {textItems.map((item) => (
            <TextOverlay
              key={item.key}
              id={item.key}
              text={item.text}
              font={item.font}
              size={item.size}
              weight={item.weight}
              color={item.color}
              position={positions[item.key]}
              scale={scale}
              dragging={dragging === item.key}
              onPointerDown={handlePointerDown}
            />
          ))}
        </PosterCanvas>
        <p className={styles.previewHint}>
          Texte, Trenner & Logos verschieben · Logo anklicken zum Bearbeiten ·
          Entf zum Löschen
        </p>
      </div>
    </div>
  );
}
