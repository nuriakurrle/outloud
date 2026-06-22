// ── Kreide-Muster (Hintergrund) ─────────────────────────────────────────
// Generiert weiche, leicht verrauschte Kreidestriche als Tafel-Hintergrund
// und rendert sie mit körniger, „pebbliger" Kreide-Textur. Unterstützt eine
// Selbstzeichen-Animation über `drawProgress` (0–1), staffelt die Striche.
//
// Reines Canvas 2D. Die Tafel (Hintergrund + Grain) wird pro Seed/Größe
// einmal gecacht, damit Animations- und Export-Frames nur die Striche neu
// zeichnen müssen (der Grain-Loop ist pixelweise und zu teuer pro Frame).

import type { PatternConfig, PatternStroke } from "../types/poster";
import { SimpleNoise } from "./noise";
import { seededRandom } from "./seededRandom";
import { drawBoardTexture } from "./chalkPatterns";

const BOARD_BG = "#1e1e1e";
const CHALK_RGB = "224,221,216"; // helle Kreide auf dunkler Tafel
const CHALK_RGB_DARK = "38,38,38"; // dunkle Kreide auf hellem Hintergrund

/** Relative Helligkeit eines Hex-Farbwerts (0–255). */
function luminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length < 6) return 30;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Kreide-Farbe (RGB-Tripel) passend zum Hintergrund: hell auf dunkel, dunkel auf hell. */
function chalkRgbFor(bg: string): string {
  return luminance(bg) > 140 ? CHALK_RGB_DARK : CHALK_RGB;
}

// ── Striche generieren ──────────────────────────────────────────────────

export function generateChalkStrokes(
  config: PatternConfig,
  canvasW: number,
  canvasH: number
): PatternStroke[] {
  const rng = seededRandom(config.seed);
  const noise = new SimpleNoise(config.seed);
  const strokes: PatternStroke[] = [];
  const dirRad = (config.direction * Math.PI) / 180;
  const maxSide = Math.max(canvasW, canvasH);
  const diag = Math.hypot(canvasW, canvasH);

  for (let i = 0; i < config.count; i++) {
    // Richtung: Hauptrichtung ± Streuung
    const deviation = (rng() - 0.5) * Math.PI * config.spread;
    const angle = dirRad + deviation;

    // Mittelpunkt: um die Postermitte gestreut
    const cx = 50 + (rng() - 0.5) * 60;
    const cy = 50 + (rng() - 0.5) * 60;
    const halfLen = ((diag * (0.4 + rng() * 0.4)) / maxSide) * 100;

    const startX = cx - Math.cos(angle) * halfLen;
    const startY = cy - Math.sin(angle) * halfLen;
    const endX = cx + Math.cos(angle) * halfLen;
    const endY = cy + Math.sin(angle) * halfLen;

    // Pfad mit Noise-Auslenkung quer zur Strichrichtung
    const points: Array<{ x: number; y: number }> = [];
    const steps = 80 + Math.floor(rng() * 40);
    const nOff = rng() * 300 + i * 47;
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const bx = startX + (endX - startX) * t;
      const by = startY + (endY - startY) * t;
      const n1 = noise.noise2D(t * 3 * (0.5 + config.noise * 2) + nOff, i * 11);
      const n2 = noise.noise2D(
        t * 8 * (0.5 + config.noise * 2) + nOff,
        i * 11 + 50
      );
      const dev = (n1 * 12 + n2 * 3) * config.noise;
      points.push({ x: bx + perpX * dev, y: by + perpY * dev });
    }

    strokes.push({
      points,
      weight: config.weight * (0.7 + rng() * 0.6),
      opacity: (config.opacity / 100) * (0.7 + rng() * 0.3),
      seed: Math.floor(rng() * 99999),
    });
  }

  return strokes;
}

// ── Tafel-Hintergrund (gecacht) ─────────────────────────────────────────

const boardCache = new Map<string, HTMLCanvasElement>();

/** Tafel (Hintergrund + Grain) — pro Seed/Größe/Farbe einmal gebaut und gecacht. */
function getBoard(
  w: number,
  h: number,
  seed: number,
  bg: string
): HTMLCanvasElement {
  const key = `${seed}|${Math.round(w)}x${Math.round(h)}|${bg}`;
  const cached = boardCache.get(key);
  if (cached) return cached;

  const board = document.createElement("canvas");
  board.width = Math.max(1, Math.round(w));
  board.height = Math.max(1, Math.round(h));
  const bctx = board.getContext("2d")!;
  bctx.fillStyle = bg;
  bctx.fillRect(0, 0, board.width, board.height);
  drawBoardTexture(bctx, board.width, board.height, seed, Math.round(luminance(bg)));

  // Cache klein halten (verschiedene Seeds/Größen während des Editierens)
  if (boardCache.size > 6) {
    boardCache.delete(boardCache.keys().next().value as string);
  }
  boardCache.set(key, board);
  return board;
}

// ── Komplett-Hintergrund zeichnen ───────────────────────────────────────

/**
 * Zeichnet Tafel + Grain + alle Pattern-Striche. `progress` (0–1) steuert die
 * Selbstzeichen-Animation; 1 = voll. Der Aufrufer zeichnet ggf. fette Striche,
 * Text und Assets darüber.
 */
export function drawChalkBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokes: PatternStroke[],
  seed: number,
  progress = 1,
  bg = BOARD_BG
): void {
  ctx.drawImage(getBoard(w, h, seed, bg), 0, 0, w, h);
  renderPatternStrokes(ctx, strokes, w, h, progress, chalkRgbFor(bg));
}

// ── Striche rendern ─────────────────────────────────────────────────────

export function renderPatternStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: PatternStroke[],
  w: number,
  h: number,
  drawProgress = 1,
  chalkRgb: string = CHALK_RGB
): void {
  for (let i = 0; i < strokes.length; i++) {
    const stroke = strokes[i];

    // Gestaffelter Fortschritt pro Strich (sie zeichnen sich nacheinander)
    const sStart = (i / strokes.length) * 0.65;
    const sEnd = sStart + 1 / strokes.length + 0.35;
    const sp = Math.max(0, Math.min(1, (drawProgress - sStart) / (sEnd - sStart)));
    if (sp <= 0) continue;

    const pts = stroke.points.map((p) => ({
      x: (p.x / 100) * w,
      y: (p.y / 100) * h,
    }));

    renderSingleChalkStroke(
      ctx,
      pts,
      stroke.weight,
      stroke.opacity,
      stroke.seed,
      sp,
      chalkRgb
    );
  }
}

function pathLength(pts: Array<{ x: number; y: number }>): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

export function renderSingleChalkStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  weight: number,
  opacity: number,
  seed: number,
  drawProgress = 1,
  chalkRgb: string = CHALK_RGB
): void {
  if (points.length < 2) return;
  const rng = seededRandom(seed);
  const grain = new SimpleNoise(seed + 500);
  const totalLen = pathLength(points);
  if (totalLen < 1) return;
  const maxIdx = Math.max(2, Math.floor(points.length * drawProgress));
  let accum = 0;

  for (let i = 1; i < maxIdx; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (segLen < 0.5) {
      accum += segLen;
      continue;
    }

    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const steps = Math.max(Math.ceil(segLen), 1);

    for (let s = 0; s < steps; s++) {
      const lt = s / steps;
      const cx = p0.x + (p1.x - p0.x) * lt;
      const cy = p0.y + (p1.y - p0.y) * lt;
      const t = (accum + segLen * lt) / totalLen;

      // Druckverlauf: in der Mitte am stärksten, an den Enden ausdünnend
      const taper = Math.sin(t * Math.PI) * 0.5 + 0.5;
      const wgt = weight * taper;
      if (wgt < 0.5) continue;

      const numP = 12 + Math.floor(rng() * 8);
      for (let p = 0; p < numP; p++) {
        const d = rng();
        const yOff = (d - 0.5) * wgt;
        const px = cx + nx * yOff;
        const py = cy + ny * yOff;

        // Grain-Lücken: lässt das Pigment körnig/lückenhaft wirken
        const gv = (grain.noise2D(px * 0.04, py * 0.04) + 1) * 0.5;
        if (gv < 0.25) continue;

        // Kanten ausdünnen
        const edge = Math.abs(d - 0.5) * 2;
        if (edge > 0.65 && rng() > 0.4) continue;

        const r = Math.max(0.3, wgt * (0.03 + rng() * 0.12) * taper);
        const a =
          opacity * (0.05 + rng() * 0.45) * (0.5 + gv * 0.5) * (1 - edge * 0.3);

        ctx.fillStyle = `rgba(${chalkRgb},${Math.min(1, a)})`;
        ctx.beginPath();

        if (rng() > 0.3) {
          // Raues Polygon (Kreide-Krümel)
          const sides = 4 + Math.floor(rng() * 3);
          const sa = rng() * 6.28;
          ctx.moveTo(
            px + Math.cos(sa) * r * (0.5 + rng() * 0.5),
            py + Math.sin(sa) * r * (0.5 + rng() * 0.5)
          );
          for (let k = 1; k <= sides; k++) {
            const a2 = sa + (k / sides) * 6.28;
            ctx.lineTo(
              px + Math.cos(a2) * r * (0.5 + rng() * 0.5),
              py + Math.sin(a2) * r * (0.5 + rng() * 0.5)
            );
          }
          ctx.closePath();
        } else {
          ctx.arc(px, py, r, 0, 6.28);
        }
        ctx.fill();
      }
    }
    accum += segLen;
  }
}
