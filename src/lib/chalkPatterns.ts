import { SimpleNoise } from "./noise";
import { seededRandom } from "./seededRandom";
import { BRUSH_PROFILES, type BrushProfile, type BrushType } from "./ChalkBrush";
import type { PatternConfig } from "../types/poster";

export const CHALK_COLOR = "#e0e0e0";

/**
 * Zeichnet einen einzelnen Kreide-Strich zwischen zwei Punkten. Die raue
 * Textur entsteht aus vielen kleinen Partikeln, deren Größe, Form, Deckkraft
 * und Streuung vom `BrushProfile` bestimmt werden. Zusätzlich bricht ein
 * Tafel-Grain (`grainNoise`) den Strich auf, sodass der schwarze Hintergrund
 * stellenweise durchschimmert.
 */
export function drawChalkStroke(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  grainNoise: SimpleNoise,
  brush: BrushProfile,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  weight: number,
  alpha: number,
  progress?: number // 0–1 Position im Gesamtstrich (für Druckverlauf)
): void {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 0.5) return;

  const steps = Math.max(Math.floor(dist * brush.particleDensity), 1);
  ctx.fillStyle = CHALK_COLOR;

  // Strich-Richtung für senkrechte Streuung
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;

    // ── 1. Tafel-Grain: Noise-basierte Lücken ──
    const grainVal = grainNoise.noise2D(
      px * brush.grainScale,
      py * brush.grainScale
    );
    // Wenn Noise-Wert unter Threshold → Lücke (Tafel schimmert durch)
    if ((grainVal + 1) / 2 < brush.grainFrequency) continue;

    // ── 2. Druckverlauf ──
    let pressureMultiplier = 1;
    const p = progress ?? t;
    switch (brush.pressureCurve) {
      case "taper":
        // Dünn → Dick → Dünn (Anfang/Ende leichter)
        pressureMultiplier = Math.sin(p * Math.PI) * 0.6 + 0.4;
        break;
      case "pulse":
        // Unregelmäßige Druckvariation
        pressureMultiplier = 0.5 + Math.sin(p * Math.PI * 4) * 0.3 + rng() * 0.2;
        break;
      case "decay":
        // Starker Anfang, wird schwächer
        pressureMultiplier = Math.max(0.2, 1 - p * 0.8);
        break;
      case "flat":
      default:
        pressureMultiplier = 0.8 + rng() * 0.2;
    }

    // ── 3. Spread (Streuung) ──
    // Senkrecht zum Strich streuen, dazu leicht entlang der Richtung
    const spreadFactor = weight * (0.5 + rng() * 0.5);
    let jx = perpX * (rng() - 0.5) * brush.spreadX * spreadFactor;
    let jy = perpY * (rng() - 0.5) * brush.spreadY * spreadFactor;
    jx += Math.cos(angle) * (rng() - 0.5) * weight * 0.3;
    jy += Math.sin(angle) * (rng() - 0.5) * weight * 0.3;

    // ── 4. Edge Roughness: Partikel am Rand ausdünnen ──
    const distFromCenter = Math.abs((rng() - 0.5) * 2);
    if (distFromCenter > 1 - brush.edgeRoughness && rng() > 0.5) continue;

    // ── 5. Partikelgröße ──
    const sizeRange = brush.particleSizeMax - brush.particleSizeMin;
    const baseSize = brush.particleSizeMin + rng() * sizeRange;
    const r = weight * baseSize * pressureMultiplier;

    // ── 6. Opacity mit Variation ──
    const opRange = brush.opacityMax - brush.opacityMin;
    const particleAlpha =
      alpha * (brush.opacityMin + rng() * opRange) * pressureMultiplier;
    ctx.globalAlpha = Math.min(1, particleAlpha);

    // ── 7. Partikelform ──
    const fx = px + jx;
    const fy = py + jy;
    ctx.beginPath();

    if (brush.particleShape === "round") {
      ctx.arc(fx, fy, Math.max(0.3, r), 0, Math.PI * 2);
    } else if (brush.particleShape === "rough") {
      // Unregelmäßiges Polygon (4–6 Ecken)
      const sides = 4 + Math.floor(rng() * 3);
      const startAngle = rng() * Math.PI * 2;
      for (let s = 0; s <= sides; s++) {
        const a = startAngle + (s / sides) * Math.PI * 2;
        const rr = Math.max(0.3, r * (0.6 + rng() * 0.4));
        const vx = fx + Math.cos(a) * rr;
        const vy = fy + Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    } else if (brush.particleShape === "angular") {
      // Scharfkantige Splitter (3 Ecken)
      const startAngle = rng() * Math.PI * 2;
      for (let s = 0; s < 3; s++) {
        const a = startAngle + (s / 3) * Math.PI * 2;
        const rr = Math.max(0.3, r * (0.5 + rng() * 0.8));
        const vx = fx + Math.cos(a) * rr;
        const vy = fy + Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    }

    ctx.fill();
  }
}

/**
 * Subtiler Tafel-Grain-Layer, damit der Hintergrund nicht flach schwarz ist.
 * Wird über einen separaten Offscreen-Canvas in Poster-Auflösung (CSS-Pixel)
 * erzeugt und skaliert per `drawImage` aufgetragen — dadurch unabhängig vom
 * dpr-Scaling des Ziel-Contexts (kein getImageData-Auflösungsproblem).
 */
export function drawBoardTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number
): void {
  const noise = new SimpleNoise(seed + 999);
  const gw = Math.max(1, Math.floor(w));
  const gh = Math.max(1, Math.floor(h));

  const off = document.createElement("canvas");
  off.width = gw;
  off.height = gh;
  const octx = off.getContext("2d");
  if (!octx) return;

  const imageData = octx.createImageData(gw, gh);
  const data = imageData.data;
  const base = 30; // R/G/B von #1e1e1e

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const idx = (y * gw + x) * 4;
      // Feiner Noise für Tafel-Maserung
      const n = noise.noise2D(x * 0.05, y * 0.05) * 4;
      // Grober Noise für leichte Flächenvariationen
      const n2 = noise.noise2D(x * 0.005, y * 0.005) * 6;
      const v = Math.max(0, Math.min(255, base + n + n2));
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  octx.putImageData(imageData, 0, 0);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(off, 0, 0, w, h);
  ctx.restore();
}

/** "flowing" — geschwungene, Perlin-Noise gesteuerte Linien. */
function drawFlowing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig,
  noise: SimpleNoise,
  grainNoise: SimpleNoise,
  brush: BrushProfile,
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
      const progress = i / segs; // Position im Gesamtstrich für Druckverlauf
      angle += noise.noise2D(x * 0.003, y * 0.003) * 0.25;
      const nx = x + Math.cos(angle) * 4;
      const ny = y + Math.sin(angle) * 4;
      const wVar =
        config.strokeWeight *
        (0.5 + (noise.noise2D(x * 0.01 + 100, y * 0.01) + 1) * 0.5);
      drawChalkStroke(
        ctx,
        rng,
        grainNoise,
        brush,
        x,
        y,
        nx,
        ny,
        wVar,
        baseAlpha,
        progress
      );
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
  grainNoise: SimpleNoise,
  brush: BrushProfile,
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
        grainNoise,
        brush,
        prevX,
        prevY,
        x,
        y,
        config.strokeWeight,
        alpha,
        prog
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
  grainNoise: SimpleNoise,
  brush: BrushProfile,
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
      const progress = x / w;
      const y = yBase + noise.noise2D(x * 0.005, l * 0.5) * 60;
      drawChalkStroke(
        ctx,
        rng,
        grainNoise,
        brush,
        prevX,
        prevY,
        x,
        y,
        weight,
        baseAlpha,
        progress
      );
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
  grainNoise: SimpleNoise,
  brush: BrushProfile,
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
    drawChalkStroke(
      ctx,
      rng,
      grainNoise,
      brush,
      x,
      y,
      x2,
      y2,
      config.strokeWeight,
      alpha
    );
  }
}

export function drawChalkPatterns(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PatternConfig,
  brushType: BrushType
): void {
  if (config.style === "none") return;
  const noise = new SimpleNoise(config.seed);
  const grainNoise = new SimpleNoise(config.seed + 500);
  const rng = seededRandom(config.seed);
  const baseAlpha = config.opacity / 100;
  const brush = BRUSH_PROFILES[brushType];

  ctx.save();
  switch (config.style) {
    case "flowing":
      drawFlowing(ctx, w, h, config, noise, grainNoise, brush, rng, baseAlpha);
      break;
    case "swirls":
      drawSwirls(ctx, w, h, config, grainNoise, brush, rng, baseAlpha);
      break;
    case "topo":
      drawTopo(ctx, w, h, config, noise, grainNoise, brush, rng, baseAlpha);
      break;
    case "scattered":
      drawScattered(ctx, w, h, config, grainNoise, brush, rng, baseAlpha);
      break;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
