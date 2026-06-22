// ── Poster-Render-Pipeline (Single Source of Truth) ─────────────────────
// Eine wiederverwendbare, synchrone Render-Funktion, die ein komplettes
// Poster (Tafel, Grain, Muster, fette Striche, Rahmen, Trenner, Text und
// platzierte Logos/Stamps) auf einen Canvas-Context zeichnet.
//
// Genutzt vom statischen PNG-Export *und* vom Animations-/GIF-/Video-Export.
// Bilder werden vorab über `loadSceneImages` geladen, damit das Rendering
// selbst synchron (pro Frame) laufen kann.

import { drawChalkBackground } from "./chalkBackground";
import { renderStroke, compositeStroke } from "./chalkStrokes";
import { tintStrokeImage, isMaskAsset } from "./strokeStamps";
import { renderPlacedStroke } from "./warpRenderer";
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
  x: number;
  y: number;
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
  strokes: ChalkStroke[];
  texts: SceneText[];
  assets: SceneAsset[];
}

type Drawable = HTMLImageElement | HTMLCanvasElement;

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
export function renderPosterScene(
  ctx: CanvasRenderingContext2D,
  scene: PosterScene,
  images: Map<string, HTMLImageElement>,
  patternProgress = 1
): void {
  const { w, h } = scene;

  // 1.–3. Tafel + Grain + Hintergrund-Muster (mit Selbstzeichen-Fortschritt)
  drawChalkBackground(
    ctx,
    w,
    h,
    scene.patternStrokes,
    scene.pattern.seed,
    patternProgress
  );

  // 4. Fette Kreide-Striche (zIndex-Reihenfolge, statisch)
  const ordered = [...scene.strokes].sort((a, b) => a.zIndex - b.zIndex);
  ordered.forEach((stroke) => {
    const strokeCanvas = renderStroke(stroke, w, h);
    compositeStroke(ctx, strokeCanvas, stroke, w, h);
  });

  // 5. Text
  ctx.textBaseline = "middle";
  for (const item of scene.texts) {
    const text = item.text;
    const align = item.align ?? "center";
    ctx.textAlign = align;
    ctx.fillStyle = item.color;
    ctx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
    const cx = (item.x / 100) * w;
    const cy = (item.y / 100) * h;
    const lines = text.split("\n");
    const lh = item.size * 1.15;
    const startY = cy - (lh * (lines.length - 1)) / 2;
    lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lh));
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

    if (isMaskAsset(asset.category)) {
      const drawImg: Drawable = asset.tint ? tintStrokeImage(img, asset.tint) : img;
      const sc = (asset.scale * w) / iw;
      renderPlacedStroke(ctx, drawImg, {
        px,
        py,
        scaleX: sc * (asset.scaleX ?? 1),
        scaleY: sc * (asset.scaleY ?? 1),
        rotation: asset.rotation,
        flipX: asset.flipX,
        flipY: asset.flipY ?? false,
        opacity: asset.opacity,
      });
      continue;
    }

    const baseW = asset.scale * w;
    const targetW = baseW * (asset.scaleX ?? 1);
    const targetH = baseW * (ih / iw) * (asset.scaleY ?? 1);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((asset.rotation * Math.PI) / 180);
    if (asset.flipX) ctx.scale(-1, 1);
    ctx.globalAlpha = asset.opacity;
    ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
