import { SimpleNoise } from "./noise";
import { seededRandom } from "./seededRandom";
import type { PatternConfig } from "../types/poster";

export const CHALK_COLOR = "#e0e0e0";

/**
 * Zeichnet einen einzelnen Kreide-Strich zwischen zwei Punkten. Die raue
 * Textur entsteht durch viele kleine Partikel mit Jitter und variabler
 * Deckkraft/Größe statt einer glatten Linie.
 */
export function drawChalkStroke(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  weight: number,
  alpha: number
): void {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(Math.floor(dist / 1.5), 1);
  ctx.fillStyle = CHALK_COLOR;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    // Jitter für raue Kreide-Textur
    const jx = (rng() - 0.5) * weight * 0.8;
    const jy = (rng() - 0.5) * weight * 0.8;
    const r = weight * (0.3 + rng() * 0.7) * 0.5;
    const a = alpha * (0.3 + rng() * 0.7);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(px + jx, py + jy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** "flowing" — geschwungene, Perlin-Noise gesteuerte Linien. */
function drawFlowing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig,
  noise: SimpleNoise,
  rng: () => number,
  baseAlpha: number
) {
  const numStrokes = Math.floor(3 + config.density / 15);
  for (let s = 0; s < numStrokes; s++) {
    let x = rng() * w;
    let y = rng() * h;
    let angle = rng() * Math.PI * 2;
    const len = h * (0.4 + rng() * 0.5);
    const segs = Math.max(Math.floor(len / 4), 1);
    for (let i = 0; i < segs; i++) {
      angle += noise.noise2D(x * 0.003, y * 0.003) * 0.25;
      const nx = x + Math.cos(angle) * 4;
      const ny = y + Math.sin(angle) * 4;
      const wVar =
        config.strokeWeight *
        (0.5 + (noise.noise2D(x * 0.01 + 100, y * 0.01) + 1) * 0.5);
      drawChalkStroke(ctx, rng, x, y, nx, ny, wVar, baseAlpha);
      x = nx;
      y = ny;
      // Sanftes Wrapping, damit Striche im Bild bleiben
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;
    }
  }
}

/** "swirls" — Spiralen/Wirbel mit nach außen abnehmender Deckkraft. */
function drawSwirls(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig,
  rng: () => number,
  baseAlpha: number
) {
  const numSwirls = Math.floor(2 + config.density / 20);
  for (let s = 0; s < numSwirls; s++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const maxR = (0.1 + rng() * 0.2) * Math.min(w, h);
    const turns = 2.5 + rng() * 2.5;
    const totalSteps = Math.floor(turns * 60);
    let angle = rng() * Math.PI * 2;
    let prevX = cx;
    let prevY = cy;
    for (let i = 0; i < totalSteps; i++) {
      const prog = i / totalSteps;
      const r = maxR * prog;
      // Winkel inkrementiert mit nach außen abnehmender Geschwindigkeit
      angle += 0.3 / (1 + prog * 2);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const alpha = baseAlpha * (1 - prog * 0.7);
      drawChalkStroke(
        ctx,
        rng,
        prevX,
        prevY,
        x,
        y,
        config.strokeWeight,
        alpha
      );
      prevX = x;
      prevY = y;
    }
  }
}

/** "topo" — horizontale, durch Noise modulierte Höhenlinien. */
function drawTopo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig,
  noise: SimpleNoise,
  rng: () => number,
  baseAlpha: number
) {
  const numLines = Math.floor(5 + config.density / 10);
  const weight = config.strokeWeight * 0.6; // dünner als flowing
  for (let l = 0; l < numLines; l++) {
    const yBase = (l / numLines) * h + h * 0.02;
    let prevX = 0;
    let prevY = yBase + noise.noise2D(0, l * 0.5) * 60;
    for (let x = 0; x <= w; x += 4) {
      const y = yBase + noise.noise2D(x * 0.005, l * 0.5) * 60;
      drawChalkStroke(ctx, rng, prevX, prevY, x, y, weight, baseAlpha);
      prevX = x;
      prevY = y;
    }
  }
}

/** "scattered" — gestreute Partikel plus kurze Schmierstriche. */
function drawScattered(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig,
  rng: () => number,
  baseAlpha: number
) {
  const numDots = config.density * 8;
  ctx.fillStyle = CHALK_COLOR;
  for (let i = 0; i < numDots; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = config.strokeWeight * (0.2 + rng() * 0.6) * 0.5;
    ctx.globalAlpha = baseAlpha * (0.15 + rng() * 0.4);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const numSmears = Math.floor(config.density / 8);
  for (let i = 0; i < numSmears; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const angle = rng() * Math.PI * 2;
    const len = 20 + rng() * 60;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const alpha = baseAlpha * (0.15 + rng() * 0.4);
    drawChalkStroke(ctx, rng, x, y, x2, y2, config.strokeWeight, alpha);
  }
}

export function drawChalkPatterns(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig
): void {
  if (config.style === "none") return;
  const noise = new SimpleNoise(config.seed);
  const rng = seededRandom(config.seed);
  const baseAlpha = config.opacity / 100;

  ctx.save();
  switch (config.style) {
    case "flowing":
      drawFlowing(ctx, w, h, config, noise, rng, baseAlpha);
      break;
    case "swirls":
      drawSwirls(ctx, w, h, config, rng, baseAlpha);
      break;
    case "topo":
      drawTopo(ctx, w, h, config, noise, rng, baseAlpha);
      break;
    case "scattered":
      drawScattered(ctx, w, h, config, rng, baseAlpha);
      break;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
