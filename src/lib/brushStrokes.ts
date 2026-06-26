import { createBrushStroke, getAllBrushes, type Brush } from "svg-brush";
import type { ChalkStroke, PatternConfig, PatternStroke } from "../types/poster";
import { seededRandom } from "./seededRandom";

export { getAllBrushes };

type Pt = { x: number; y: number };

const uid = () => crypto.randomUUID();

// Build a name→Brush object map so non-Figma brushes (Round Brush, etc.) work.
// createBrushStroke only resolves Figma brushes by string name; all others must
// be passed as Brush objects.
const BRUSH_MAP = new Map<string, Brush>(
  getAllBrushes().map((b) => [b.name, b])
);

function resolveBrush(name: string): Brush | string {
  return BRUSH_MAP.get(name) ?? name;
}

// ── Pattern generators (coordinates 0–100, poster %) ─────────────────────

function linePoints(index: number, count: number, rng: () => number): Pt[] {
  const y = ((index + 0.5) / count) * 100 + (rng() - 0.5) * 4;
  const pts: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    pts.push({ x: (i / 24) * 110 - 5, y: y + (rng() - 0.5) * 0.8 });
  }
  return pts;
}

function wavyPoints(index: number, count: number, rng: () => number): Pt[] {
  const y = ((index + 0.5) / count) * 100;
  const freq = 0.5 + rng() * 1.5;
  const amp = 3 + rng() * 5;
  const phase = rng() * Math.PI * 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push({ x: t * 110 - 5, y: y + Math.sin(t * freq * Math.PI * 2 + phase) * amp });
  }
  return pts;
}

function gridPoints(index: number, count: number, rng: () => number): Pt[] {
  const half = Math.ceil(count / 2);
  const isH = index < half;
  const pos = (((isH ? index : index - half) + 0.5) / half) * 100 + (rng() - 0.5) * 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    if (isH) pts.push({ x: t * 110 - 5, y: pos + (rng() - 0.5) * 0.5 });
    else pts.push({ x: pos + (rng() - 0.5) * 0.5, y: t * 110 - 5 });
  }
  return pts;
}

// ── Public API ────────────────────────────────────────────────────────────

export function generatePatternStrokes(
  config: PatternConfig,
  _w: number,
  _h: number
): PatternStroke[] {
  const rng = seededRandom(config.seed);
  const brush = resolveBrush(config.brushName);
  return Array.from({ length: config.count }, (_, i) => {
    const pts =
      config.patternType === "wavy"
        ? wavyPoints(i, config.count, rng)
        : config.patternType === "grid"
          ? gridPoints(i, config.count, rng)
          : linePoints(i, config.count, rng);

    const svgPath = createBrushStroke(pts, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brush: brush as any,
      strokeWidth: config.strokeWidth,
    });
    return { id: `p${config.seed}_${i}`, svgPath, opacity: config.opacity / 100, offsetX: 0, offsetY: 0 };
  });
}

export function makeFreehandStroke(
  points: Pt[],
  brushName: string,
  strokeWidth: number,
  color: string,
  opacity: number,
  zIndex: number
): ChalkStroke {
  const brush = resolveBrush(brushName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svgPath = createBrushStroke(points, { brush: brush as any, strokeWidth });
  return { id: uid(), svgPath, color, opacity, offsetX: 0, offsetY: 0, zIndex, isGenerated: false };
}

/** Live preview path while drawing (same coordinate space as the poster %). */
export function createLivePath(points: Pt[], brushName: string, strokeWidth: number): string {
  if (points.length < 2) return "";
  const brush = resolveBrush(brushName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrushStroke(points, { brush: brush as any, strokeWidth });
}

/** Preview path for toolbar/sidebar brush thumbnails — a gentle S-curve. */
export function brushPreviewPath(brushName: string, strokeWidth = 1): string {
  const brush = resolveBrush(brushName);
  const pts: Pt[] = Array.from({ length: 20 }, (_, i) => {
    const t = i / 19;
    return { x: t * 100, y: 50 + Math.sin(t * Math.PI * 1.5) * 20 };
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrushStroke(pts, { brush: brush as any, strokeWidth });
}
