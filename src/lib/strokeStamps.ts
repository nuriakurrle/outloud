import sweepStroke from "../assets/strokes/sweep.png";
import doubleTrackStroke from "../assets/strokes/double-track.png";
import thinLineStroke from "../assets/strokes/thin-line.png";
import type { AssetCategory, AssetItem } from "../types/poster";

// ── Stroke-Stamp-Bibliothek ─────────────────────────────────────────────
// Echte Kreide-Stroke-PNGs (weiß auf transparent), die als Stamp-Texturen
// aufs Poster platziert, skaliert, rotiert, gespiegelt und optional entlang
// eines Pfads gewrappt werden (siehe warpRenderer.ts).

export interface StrokeStamp {
  id: string;
  name: string;
  src: string; // PNG URL
  naturalWidth: number;
  naturalHeight: number;
  category: "sweep" | "double" | "thin" | "bold" | "custom";
}

export const DEFAULT_STAMPS: StrokeStamp[] = [
  {
    id: "sweep",
    name: "Sweep",
    src: sweepStroke,
    naturalWidth: 883,
    naturalHeight: 68,
    category: "sweep",
  },
  {
    id: "double-track",
    name: "Doppelspur",
    src: doubleTrackStroke,
    naturalWidth: 1053,
    naturalHeight: 101,
    category: "double",
  },
  {
    id: "thin-line",
    name: "Feine Linie",
    src: thinLineStroke,
    naturalWidth: 1129,
    naturalHeight: 377,
    category: "thin",
  },
];

/**
 * Färbt ein weißes Stroke-PNG in die gewünschte Kreide-Farbe ein (nur dort,
 * wo Pixel existieren). Liefert ein Canvas, das wie ein Bild gezeichnet
 * werden kann.
 */
export function tintStrokeImage(
  img: HTMLImageElement | HTMLCanvasElement,
  color: string
): HTMLCanvasElement {
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  return canvas;
}

/**
 * Maskier-/tintbare Kategorien: weiß-auf-transparente Assets, die über eine
 * CSS-Maske (Live-Preview) bzw. `source-in` (Export) in eine Kreide-Farbe
 * getönt werden. Gilt für echte Stroke-Stamps und die Formen-Bibliothek.
 */
export function isMaskAsset(category: AssetCategory): boolean {
  return category === "strokes" || category === "shapes";
}

const DEFAULT_CHALK_WHITE = "#e8e5e0";

/** True, wenn `color` praktisch dem weißen Standard entspricht (kein Tint nötig). */
export function isDefaultWhite(color: string): boolean {
  return color.toLowerCase() === DEFAULT_CHALK_WHITE;
}

/**
 * Die Stroke-Stamps als `AssetItem`s — so laufen sie über das bestehende
 * Platzierungs-/Drag-/Export-System (Kategorie "strokes").
 */
export const STROKE_ASSETS: AssetItem[] = DEFAULT_STAMPS.map((s) => ({
  id: `strokes/${s.id}`,
  name: s.name,
  category: "strokes",
  src: s.src,
  defaultScale: s.category === "thin" ? 0.6 : 0.72,
  anchor: "center",
  naturalWidth: s.naturalWidth,
  naturalHeight: s.naturalHeight,
}));
