import { SimpleNoise } from "./noise";
import { seededRandom } from "./seededRandom";
import { STRETCH_BRUSHES } from "./stretchBrush";
import { renderStretchBrush } from "./stretchBrushRenderer";
import type { ChalkStroke, DrawBrush, StrokeScheme } from "../types/poster";

export const STROKE_SCHEMES: StrokeScheme[] = [
  "cross",
  "diagonal",
  "fan",
  "slash",
  "frame",
  "random",
];

/** Standardwerte für generierte (nicht freihand) Striche. */
const DEFAULT_STROKE_COLOR = "#e8e5e0";
const DEFAULT_STROKE_BRUSH: DrawBrush = "verite";

const uid = () => crypto.randomUUID();

type Pt = { x: number; y: number };

/**
 * Erzeugt einen einzelnen Sweep zwischen zwei Punkten (in % des Posters) mit
 * organischer, Noise-getriebener Krümmung — kein gerader Strich.
 */
function makeSweep(
  rng: () => number,
  noise: SimpleNoise,
  start: Pt,
  end: Pt,
  weight: number
): ChalkStroke {
  const points: Pt[] = [];
  const steps = 80 + Math.floor(rng() * 40);
  const seed = Math.floor(rng() * 99999);
  const noiseOff = rng() * 200;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = start.x + dx * t;
    const by = start.y + dy * t;
    // Große, sanfte Bögen senkrecht zur Verbindungslinie
    const n = noise.noise2D(t * 2 + noiseOff, seed * 0.01);
    const deviation = n * 15;
    points.push({ x: bx + perpX * deviation, y: by + perpY * deviation });
  }

  return {
    id: uid(),
    points,
    weight,
    opacity: 0.75 + rng() * 0.25,
    color: DEFAULT_STROKE_COLOR,
    brushType: DEFAULT_STROKE_BRUSH,
    seed,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
    isGenerated: true,
    zIndex: 0,
  };
}

/**
 * Erzeugt 2–5 fette, dramatische Striche nach einem von sechs Kompositions-
 * Schemata. `weightScale` (0.5–1.5) skaliert die Strichstärke global.
 */
export function generateBoldStrokes(
  numStrokes: number,
  seed: number,
  weightScale = 1,
  scheme?: StrokeScheme
): ChalkStroke[] {
  const rng = seededRandom(seed);
  const noise = new SimpleNoise(seed);
  const strokes: ChalkStroke[] = [];
  const W = (base: number) => base * weightScale;

  const chosen = scheme ?? STROKE_SCHEMES[Math.floor(rng() * STROKE_SCHEMES.length)];

  switch (chosen) {
    case "cross": {
      strokes.push(
        makeSweep(rng, noise, { x: -5, y: -5 + rng() * 15 }, { x: 105, y: 85 + rng() * 15 }, W(50 + rng() * 50))
      );
      strokes.push(
        makeSweep(rng, noise, { x: 105, y: -5 + rng() * 15 }, { x: -5, y: 85 + rng() * 15 }, W(50 + rng() * 50))
      );
      if (rng() > 0.4) {
        strokes.push(
          makeSweep(rng, noise, { x: rng() * 30, y: 40 + rng() * 20 }, { x: 70 + rng() * 30, y: 40 + rng() * 20 }, W(25 + rng() * 25))
        );
      }
      break;
    }
    case "diagonal": {
      const num = Math.max(2, Math.min(numStrokes, 2 + Math.floor(rng() * 2)));
      for (let i = 0; i < num; i++) {
        const offset = (i - num / 2) * (25 + rng() * 15);
        strokes.push(
          makeSweep(rng, noise, { x: -5 + offset, y: -5 }, { x: 105 + offset, y: 105 }, W(40 + rng() * 60))
        );
      }
      break;
    }
    case "fan": {
      // Strahlenförmig von einem Rand-/Eckpunkt aus
      const origins: Pt[] = [
        { x: 50, y: 105 },
        { x: -5, y: 105 },
        { x: 105, y: 105 },
        { x: 50, y: -5 },
      ];
      const origin = origins[Math.floor(rng() * origins.length)];
      const num = Math.max(3, Math.min(numStrokes, 3 + Math.floor(rng() * 3)));
      const baseAng = rng() * Math.PI * 2;
      const spread = 0.6 + rng() * 0.8;
      for (let i = 0; i < num; i++) {
        const a = baseAng + (i / (num - 1) - 0.5) * spread;
        const reach = 120 + rng() * 40;
        strokes.push(
          makeSweep(rng, noise, origin, { x: origin.x + Math.cos(a) * reach, y: origin.y + Math.sin(a) * reach }, W(35 + rng() * 45))
        );
      }
      break;
    }
    case "slash": {
      // Ein dominanter dicker Strich + 1–3 dünnere Begleiter
      const dir = rng() > 0.5 ? 1 : -1;
      strokes.push(
        makeSweep(rng, noise, { x: dir > 0 ? -5 : 105, y: -5 }, { x: dir > 0 ? 105 : -5, y: 105 }, W(70 + rng() * 30))
      );
      const secondary = Math.max(1, Math.min(numStrokes - 1, 1 + Math.floor(rng() * 3)));
      for (let i = 0; i < secondary; i++) {
        const off = (rng() - 0.5) * 40;
        strokes.push(
          makeSweep(rng, noise, { x: (dir > 0 ? -5 : 105) + off, y: -5 + rng() * 20 }, { x: (dir > 0 ? 105 : -5) + off, y: 90 + rng() * 15 }, W(20 + rng() * 20))
        );
      }
      break;
    }
    case "frame": {
      // Striche entlang der Ränder
      const edges: Array<[Pt, Pt]> = [
        [{ x: -5, y: 8 }, { x: 105, y: 8 }],
        [{ x: -5, y: 92 }, { x: 105, y: 92 }],
        [{ x: 8, y: -5 }, { x: 8, y: 105 }],
        [{ x: 92, y: -5 }, { x: 92, y: 105 }],
      ];
      const num = Math.max(3, Math.min(numStrokes, 3 + Math.floor(rng() * 2)));
      // Mische die Kanten und nimm die ersten `num`
      const order = edges.map((e, i) => ({ e, k: rng(), i })).sort((a, b) => a.k - b.k);
      for (let i = 0; i < num; i++) {
        const [a, b] = order[i % order.length].e;
        strokes.push(makeSweep(rng, noise, a, b, W(30 + rng() * 30)));
      }
      break;
    }
    case "random":
    default: {
      const num = Math.max(2, Math.min(numStrokes, 2 + Math.floor(rng() * 4)));
      for (let i = 0; i < num; i++) {
        strokes.push(
          makeSweep(rng, noise, { x: -10 + rng() * 120, y: -10 + rng() * 120 }, { x: -10 + rng() * 120, y: -10 + rng() * 120 }, W(35 + rng() * 55))
        );
      }
      break;
    }
  }

  return strokes.map((s, i) => ({ ...s, zIndex: i }));
}

/**
 * Erzeugt einen Freihand-Strich aus aufgenommenen Punkten (in %). `seed` kann
 * übergeben werden, damit Live-Vorschau und finaler Render identisch sind.
 */
export function makeFreehandStroke(
  points: Pt[],
  weight: number,
  opacity: number,
  color: string,
  brushType: DrawBrush,
  zIndex: number,
  seed: number = Math.floor(Math.random() * 99999)
): ChalkStroke {
  return {
    id: uid(),
    points,
    weight,
    opacity,
    color,
    brushType,
    seed,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
    isGenerated: false,
    zIndex,
  };
}

/** Glättet eine zittrige Punktkette per Moving-Average. */
export function smoothPoints(pts: Pt[], windowSize: number): Pt[] {
  if (pts.length <= 2) return pts;
  return pts.map((_, i) => {
    let sx = 0;
    let sy = 0;
    let count = 0;
    const lo = Math.max(0, i - windowSize);
    const hi = Math.min(pts.length - 1, i + windowSize);
    for (let j = lo; j <= hi; j++) {
      sx += pts[j].x;
      sy += pts[j].y;
      count++;
    }
    return { x: sx / count, y: sy / count };
  });
}

/**
 * Rendert einen Strich mit dem gewählten Stretch Brush auf ein eigenes
 * Offscreen-Canvas in Poster-Auflösung (2x). Wird gecached, da teuer.
 */
export function renderStroke(
  stroke: ChalkStroke,
  posterW: number,
  posterH: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = posterW * 2;
  canvas.height = posterH * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const brush = STRETCH_BRUSHES[stroke.brushType] ?? STRETCH_BRUSHES.verite;
  const pts = stroke.points.map((p) => ({
    x: (p.x / 100) * posterW,
    y: (p.y / 100) * posterH,
  }));

  renderStretchBrush(
    ctx,
    pts,
    brush,
    stroke.weight,
    stroke.color || DEFAULT_STROKE_COLOR,
    stroke.opacity,
    stroke.seed
  );

  return canvas;
}

/**
 * Signatur der textur-relevanten Felder. Ändert sich diese nicht, kann das
 * gecachte Offscreen-Canvas wiederverwendet werden (Transform ist günstig).
 */
export function strokeGeometrySignature(
  stroke: ChalkStroke,
  posterW: number,
  posterH: number
): string {
  return `${stroke.seed}|${stroke.weight}|${stroke.opacity.toFixed(3)}|${stroke.color}|${stroke.brushType}|${stroke.points.length}|${posterW}x${posterH}`;
}

/**
 * Zeichnet einen (bereits gerenderten) Strich mit seiner Transform auf den
 * Ziel-Context. Rotation/Skalierung erfolgen um die Postermitte.
 */
export function compositeStroke(
  ctx: CanvasRenderingContext2D,
  strokeCanvas: HTMLCanvasElement,
  stroke: ChalkStroke,
  posterW: number,
  posterH: number
): void {
  ctx.save();
  ctx.translate((stroke.offsetX / 100) * posterW, (stroke.offsetY / 100) * posterH);
  ctx.translate(posterW / 2, posterH / 2);
  ctx.rotate((stroke.rotation * Math.PI) / 180);
  ctx.scale(stroke.scale, stroke.scale);
  ctx.translate(-posterW / 2, -posterH / 2);
  ctx.drawImage(strokeCanvas, 0, 0, posterW, posterH);
  ctx.restore();
}

/**
 * Bounding-Box eines Strichs in % (inkl. offset), für das Drag-/Auswahl-
 * Overlay. Rotation/Skalierung werden für die Klickfläche angenähert (nur
 * Offset + Padding für die Strichstärke).
 */
export function strokeBBox(
  stroke: ChalkStroke,
  posterW: number,
  posterH: number
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  // Strichstärke als %-Padding (weight in px bei Basisbreite)
  const padX = ((stroke.weight * 0.6) / posterW) * 100;
  const padY = ((stroke.weight * 0.6) / posterH) * 100;
  return {
    x: minX - padX + stroke.offsetX,
    y: minY - padY + stroke.offsetY,
    w: maxX - minX + padX * 2,
    h: maxY - minY + padY * 2,
  };
}
