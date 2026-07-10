// ── Poster-Render-Pipeline (Single Source of Truth) ─────────────────────
// Eine wiederverwendbare, synchrone Render-Funktion, die ein komplettes
// Poster (Tafel, Grain, Muster, fette Striche, Rahmen, Trenner, Text und
// platzierte Logos/Stamps) auf einen Canvas-Context zeichnet.
//
// Genutzt vom statischen PNG-Export *und* vom Animations-/GIF-/Video-Export.
// Bilder werden vorab über `loadSceneImages` geladen, damit das Rendering
// selbst synchron (pro Frame) laufen kann.

import type {
  AssetCategory,
  ChalkStroke,
  PatternConfig,
  PatternStroke,
  PlacedAsset,
} from "../types/poster";

/** Ein Text-Element mit aufgelöster Position (in % des Posters). */
export interface SceneText {
  key: string;
  text: string;
  font: string;
  size: number;
  weight: string;
  color: string;
  align?: "center" | "left" | "right";
  outline?: boolean; // hohle Buchstaben mit Kontur (Umriss-Stil)
  x: number;
  y: number;
  maxWidth?: number; // explicit box width in % — mirrors textWidths from editor
}

/** Ein platziertes Asset mit aufgelöster Quelle + Metadaten. */
export interface SceneAsset extends PlacedAsset {
  src: string;
  category: AssetCategory;
  naturalWidth?: number;
  naturalHeight?: number;
}

/** Vollständige, render-fähige Beschreibung eines Posters. */
export interface PosterScene {
  w: number;
  h: number;
  bg: string;
  pattern: PatternConfig; // hält den Seed (Tafel-Grain); Striche s.u.
  patternStrokes: PatternStroke[]; // generierte Hintergrund-Striche
  patternFront?: boolean; // generierte Linien über Text & Illustrationen
  skipBg?: boolean;       // skip background fill (for transparent layer export)
  strokes: ChalkStroke[];
  texts: SceneText[];
  assets: SceneAsset[];
}

/** Lädt ein einzelnes Bild und wartet, bis es dekodiert ist. */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  try {
    await img.decode();
  } catch {
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }
  return img;
}

/** Lädt alle (eindeutigen) Asset-Bilder einer Szene vorab. */
export async function loadSceneImages(
  scene: PosterScene
): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  const unique = Array.from(
    new Set(scene.assets.map((a) => a.src).filter(Boolean))
  );
  await Promise.all(
    unique.map(async (src) => {
      map.set(src, await loadImage(src));
    })
  );
  return map;
}

/**
 * Zeichnet die komplette Szene. Der Context muss bereits auf die gewünschte
 * Auflösung skaliert sein (z.B. `ctx.scale(3,3)` für 3x-Export); gezeichnet
 * wird in Poster-Koordinaten (scene.w × scene.h).
 */
/**
 * Renders a SVG-based stroke layer onto the canvas via SVG blob.
 * `strokeList` are the freehand strokes to draw; `includePatterns` adds the
 * decorative background pattern strokes (only on the back layer).
 */
async function renderSvgStrokes(
  ctx: CanvasRenderingContext2D,
  scene: PosterScene,
  w: number,
  h: number,
  strokeList: ChalkStroke[],
  includePatterns: boolean
): Promise<void> {
  const fillColor = scene.pattern.color === "white" ? "#ffffff" : "#000000";
  const ordered = [...strokeList].sort((a, b) => a.zIndex - b.zIndex);

  const pathsHtml = [
    ...(includePatterns ? scene.patternStrokes : []).map(
      (ps) => `<g opacity="${ps.opacity}" transform="translate(${ps.offsetX ?? 0} ${ps.offsetY ?? 0})"><path d="${ps.svgPath}" fill="${fillColor}"/></g>`
    ),
    ...ordered.map(
      (s) => `<g opacity="${s.opacity}" transform="translate(${s.offsetX} ${s.offsetY})"><path d="${s.svgPath}" fill="${s.color}"/></g>`
    ),
  ].join("");

  if (!pathsHtml) return;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="${w}" height="${h}">${pathsHtml}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
    ctx.drawImage(img, 0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Bricht Text wie die Live-Vorschau um (CSS `white-space: pre-wrap; max-width`):
// explizite Zeilenumbrüche bleiben erhalten, lange Zeilen werden am Wortrand
// umgebrochen. Ohne das liefe ein langer Titel im Export über den Rand hinaus
// und würde abgeschnitten. `ctx.font` muss vorher gesetzt sein.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  return text.split("\n").flatMap((para) => {
    const lines: string[] = [];
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
    return lines;
  });
}

export async function renderPosterScene(
  ctx: CanvasRenderingContext2D,
  scene: PosterScene,
  images: Map<string, HTMLImageElement>,
): Promise<void> {
  const { w, h } = scene;

  // 1. Background fill
  if (!scene.skipBg) { ctx.fillStyle = scene.bg; ctx.fillRect(0, 0, w, h); }

  // 2. SVG strokes auf der Hinter-Text-Ebene (Muster nur, wenn nicht „vorne")
  await renderSvgStrokes(ctx, scene, w, h, scene.strokes.filter((s) => !s.front), !scene.patternFront);

  // 5. Text
  ctx.textBaseline = "middle";
  for (const item of scene.texts) {
    const maxWidth = item.maxWidth !== undefined ? (item.maxWidth / 100) * w : w * 0.9;
    const align = item.align ?? "center";
    ctx.textAlign = align;
    ctx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
    const lines = wrapText(ctx, item.text, maxWidth);
    // Shrink-to-fit: passt ein Wort trotz Umbruch nicht in 90 %, Schrift
    // proportional verkleinern – so wird kein Titel je abgeschnitten.
    const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
    const size = widest > maxWidth ? item.size * (maxWidth / widest) : item.size;
    if (size !== item.size) ctx.font = `${item.weight} ${size}px "${item.font}", sans-serif`;
    const cx = (item.x / 100) * w;
    const cy = (item.y / 100) * h;
    const lh = size * 1.15;
    const startY = cy - (lh * (lines.length - 1)) / 2;
    if (item.outline) {
      // Umriss-Stil: hohle Buchstaben, nur Kontur in der Schriftfarbe.
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(1, size * 0.045);
      ctx.lineJoin = "round";
      lines.forEach((line, i) => ctx.strokeText(line, cx, startY + i * lh));
    } else {
      ctx.fillStyle = item.color;
      lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lh));
    }
  }
  ctx.globalAlpha = 1;

  // 6. Platzierte Logos / Illustrationen / Stroke-Stamps (zIndex-Reihenfolge)
  const sorted = [...scene.assets].sort((a, b) => a.zIndex - b.zIndex);
  for (const asset of sorted) {
    const img = images.get(asset.src);
    if (!img) continue;
    const iw = img.naturalWidth || img.width || 100;
    const ih = img.naturalHeight || img.height || 100;
    const px = (asset.x / 100) * w;
    const py = (asset.y / 100) * h;

    const baseW = asset.scale * w;
    const targetW = baseW * (asset.scaleX ?? 1);
    const targetH = baseW * (ih / iw) * (asset.scaleY ?? 1);
    const isMask = asset.category === "strokes" || asset.category === "shapes";
    if (isMask) {
      const off = new OffscreenCanvas(w, h);
      const offCtx = off.getContext("2d")!;
      offCtx.save();
      offCtx.translate(px, py);
      offCtx.rotate((asset.rotation * Math.PI) / 180);
      offCtx.scale(asset.flipX ? -1 : 1, asset.flipY ? -1 : 1);
      offCtx.fillStyle = asset.tint ?? "#ffffff";
      offCtx.fillRect(-targetW / 2, -targetH / 2, targetW, targetH);
      offCtx.globalCompositeOperation = "destination-in";
      offCtx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
      offCtx.restore();
      ctx.save();
      ctx.globalAlpha = asset.opacity;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((asset.rotation * Math.PI) / 180);
      ctx.scale(asset.flipX ? -1 : 1, asset.flipY ? -1 : 1);
      ctx.globalAlpha = asset.opacity;
      ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;

  // 7. „Über-Inhalt"-Ebene – Über-Text-Striche und (optional) generierte Linien.
  await renderSvgStrokes(ctx, scene, w, h, scene.strokes.filter((s) => s.front), !!scene.patternFront);
}
