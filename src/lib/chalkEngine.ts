import { SimpleNoise } from "./noise";
import { seededRandom } from "./seededRandom";

/**
 * Eine Kreide-Engine für beide Quellen (Upload & Live-Webcam). Sie bekommt nur
 * eine Helligkeits-Map (0–1 pro Pixel) und rendert daraus ein Kreide-Bild:
 * Layer 1 = Kanten/Umriss, Layer 2 = Kreide-Füllung nach Helligkeit.
 *
 * Live wirkt „kreidiger" durch: stabile Platzierung (kein Pro-Frame-Flackern,
 * steuerbar über `shimmer`), eine dauerhafte Tafel-Körnung und additives
 * Compositing der Partikel (pudriges Aufbauen) über eine Ink-Zwischenebene.
 */
export interface ChalkEngineConfig {
  scale: number; // 0.1–1.0  Bildgröße auf dem Canvas
  resolution: number; // 2–20  Sampling-Raster (klein = fein)
  density: number; // 0.1–1.0  Kreide pro Zelle
  threshold: number; // 0–1  ab welcher Helligkeit gezeichnet wird
  noise: number; // 0–1  Zufall/Chaos der Platzierung
  direction: number; // 0–360°  Grundrichtung der Striche
  strokeWeight: number; // 1–8  Strichstärke
  trail: number; // 0–1  Nachzieh-Effekt (nur Live)
  shimmer: number; // 0–1  Lebendigkeit: 0 = ruhig gezeichnet, 1 = flirrend (nur Live)
}

export const DEFAULT_CHALK_ENGINE_CONFIG: ChalkEngineConfig = {
  scale: 0.8,
  resolution: 8,
  density: 0.6,
  threshold: 0.4,
  noise: 0.3,
  direction: 135,
  strokeWeight: 3,
  trail: 0.4, // höher = vorherige Muster verblassen schneller (weniger „Nachziehen")
  shimmer: 0.2,
};

const CHALK = "245,243,238"; // Kreide-Weiß
const CHALK_DIM = "200,198,193"; // Streu-Partikel

// ── Deterministische Pro-Zellen-Seeds ────────────────────
// Das Aussehen einer Zelle hängt nur von ihrer Position (und im Live-Modus vom
// langsam wechselnden `frameSeed`) ab — nicht von der Iterations-/Skip-Reihen-
// folge. Dadurch flackert nichts; eine ruhige Pose ergibt ein ruhiges Bild.
function hash3(a: number, b: number, c: number): number {
  let h =
    (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) >>>
    0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return h || 1;
}

/** Sobel-artige Kantenstärke (0–1) aus der Helligkeits-Map. */
export function detectEdges(
  brightness: Float32Array,
  w: number,
  h: number
): Float32Array {
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = Math.abs(brightness[i + 1] - brightness[i - 1]);
      const gy = Math.abs(brightness[i + w] - brightness[i - w]);
      edges[i] = Math.min(1, Math.hypot(gx, gy) * 3);
    }
  }
  return edges;
}

// ── Gecachte Tafel-Körnung ───────────────────────────────
// Einmal pro Größe gerendert (faine weiße Staubpunkte auf Transparenz) und
// danach pro Frame nur noch billig per drawImage gestempelt.
let grainCanvas: HTMLCanvasElement | null = null;
let grainKey = "";
function getGrainCanvas(wCss: number, hCss: number, dpr: number): HTMLCanvasElement {
  const key = `${wCss}x${hCss}@${dpr}`;
  if (grainCanvas && grainKey === key) return grainCanvas;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(wCss * dpr));
  c.height = Math.max(1, Math.round(hCss * dpr));
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const grain = new SimpleNoise(7);
    const rng = seededRandom(99);
    const step = 4;
    for (let y = 0; y < hCss; y += step) {
      for (let x = 0; x < wCss; x += step) {
        const g = (grain.noise2D(x * 0.08, y * 0.08) + 1) * 0.5;
        if (g < 0.62) continue;
        ctx.fillStyle = `rgba(255,255,255,${(g - 0.62) * 0.06})`;
        ctx.fillRect(x + (rng() - 0.5) * 2, y + (rng() - 0.5) * 2, 1, 1);
      }
    }
  }
  grainCanvas = c;
  grainKey = key;
  return c;
}

// ── Ink-Zwischenebene (für pudriges, additives Compositing) ──
let inkCanvas: HTMLCanvasElement | null = null;
function getInkLayer(
  wCss: number,
  hCss: number,
  dpr: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!inkCanvas) inkCanvas = document.createElement("canvas");
  const dw = Math.max(1, Math.round(wCss * dpr));
  const dh = Math.max(1, Math.round(hCss * dpr));
  if (inkCanvas.width !== dw || inkCanvas.height !== dh) {
    inkCanvas.width = dw;
    inkCanvas.height = dh;
  }
  const ctx = inkCanvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dw, dh);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas: inkCanvas, ctx };
}

// ── Die eigentlichen Kreide-Layer (zeichnet in den übergebenen ctx) ──
function drawChalkLayers(
  ctx: CanvasRenderingContext2D,
  brightness: Float32Array,
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
  config: ChalkEngineConfig,
  frameSeed: number
): void {
  const imgScale = config.scale * Math.min(canvasW / srcW, canvasH / srcH);
  const offX = (canvasW - srcW * imgScale) / 2;
  const offY = (canvasH - srcH * imgScale) / 2;

  const res = Math.max(2, Math.floor(config.resolution));
  const dirRad = (config.direction * Math.PI) / 180;
  const noiseGen = new SimpleNoise(frameSeed * 3 + 1);
  const grain = new SimpleNoise(7 + frameSeed);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // ════════ LAYER 1: KANTEN (Umriss) ════════
  // Kurze, schmale Kreidestriche statt runder Punkte → kein „Bubble"-Look.
  const edges = detectEdges(brightness, srcW, srcH);
  const edgeStep = Math.max(2, Math.floor(res * 0.4));
  for (let y = 0; y < srcH; y += edgeStep) {
    for (let x = 0; x < srcW; x += edgeStep) {
      const edgeVal = edges[y * srcW + x];
      if (edgeVal < 0.25) continue;

      const cx = offX + x * imgScale;
      const cy = offY + y * imgScale;
      const rc = seededRandom(hash3(x, y, frameSeed ^ 0x9e3779b9));
      const num = 1 + Math.floor(edgeVal * 1.5);
      const nOff = config.noise * 8;
      for (let p = 0; p < num; p++) {
        const jx = (rc() - 0.5) * 4 + noiseGen.noise2D(cx * 0.02, cy * 0.02) * nOff;
        const jy = (rc() - 0.5) * 4 + noiseGen.noise2D(cx * 0.02 + 50, cy * 0.02) * nOff;
        const a = dirRad + (rc() - 0.5) * 1.3;
        const len = 2 + rc() * 4;
        ctx.strokeStyle = `rgba(${CHALK},${0.4 + edgeVal * 0.5})`;
        ctx.lineWidth = 0.7 + rc() * 1.1;
        ctx.beginPath();
        ctx.moveTo(cx + jx - Math.cos(a) * len, cy + jy - Math.sin(a) * len);
        ctx.lineTo(cx + jx + Math.cos(a) * len, cy + jy + Math.sin(a) * len);
        ctx.stroke();
      }
    }
  }

  // ════════ LAYER 2: KREIDE-FÜLLUNG ════════
  const denom = Math.max(0.001, 1 - config.threshold);
  for (let y = 0; y < srcH; y += res) {
    for (let x = 0; x < srcW; x += res) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < res && y + dy < srcH; dy++) {
        for (let dx = 0; dx < res && x + dx < srcW; dx++) {
          sum += brightness[(y + dy) * srcW + (x + dx)];
          count++;
        }
      }
      const avg = sum / count;
      if (avg < config.threshold) continue;

      const cx = offX + (x + res / 2) * imgScale;
      const cy = offY + (y + res / 2) * imgScale;
      const b = avg;
      const cellSize = res * imgScale;
      const rc = seededRandom(hash3(x, y, frameSeed));

      const cellNX = noiseGen.noise2D(cx * 0.01, cy * 0.01) * config.noise * cellSize;
      const cellNY = noiseGen.noise2D(cx * 0.01 + 100, cy * 0.01) * config.noise * cellSize;

      const numMarks = Math.max(
        1,
        Math.floor(((b - config.threshold) / denom) * config.density * 3)
      );

      for (let m = 0; m < numMarks; m++) {
        const px = cx + cellNX + (rc() - 0.5) * cellSize * 0.8;
        const py = cy + cellNY + (rc() - 0.5) * cellSize * 0.8;

        const gv = (grain.noise2D(px * 0.04, py * 0.04) + 1) * 0.5;
        if (gv < 0.2) continue;

        const angle =
          dirRad +
          (rc() - 0.5) * 0.5 +
          noiseGen.noise2D(px * 0.005, py * 0.005) * config.noise * 2;
        const len = config.strokeWeight * (2 + b * 4) * (0.5 + rc() * 1);
        const ex = px + Math.cos(angle) * len;
        const ey = py + Math.sin(angle) * len;

        // Pro Marke EIN dünner Kreidestrich (statt vieler runder Klötzchen) →
        // kreidiger Look und viel schneller (flüssiges Live-Tracking).
        const a = Math.min(1, (0.3 + b * 0.5) * (0.5 + gv * 0.5));
        ctx.strokeStyle = `rgba(${CHALK},${a})`;
        ctx.lineWidth = Math.max(0.5, config.strokeWeight * (0.22 + b * 0.32));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // etwas Kreidestaub entlang des Strichs
        if (rc() > 0.6) {
          const t = rc();
          const sx = px + (ex - px) * t + (rc() - 0.5) * 2;
          const sy = py + (ey - py) * t + (rc() - 0.5) * 2;
          ctx.fillStyle = `rgba(${CHALK_DIM},${0.1 + rc() * 0.18})`;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.4, config.strokeWeight * 0.12), 0, 6.28);
          ctx.fill();
        }
      }
    }
  }
}

function renderChalk(
  ctx: CanvasRenderingContext2D,
  brightness: Float32Array,
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
  config: ChalkEngineConfig,
  frameIndex: number,
  isLive: boolean
): void {
  // DPR aus der aktuellen Transform ableiten (Caller setzt setTransform(dpr…)).
  const dpr = ctx.getTransform().a || 1;

  // Pro-Frame-Seed: statisch/animiert immer stabil; live über `shimmer`
  // gesteuert (0 = eingefroren, 1 = jeder Frame neu, dazwischen langsam).
  let frameSeed = 0;
  if (isLive && config.shimmer > 0) {
    const period = Math.max(1, Math.round(1 + (1 - config.shimmer) * 14));
    frameSeed = Math.floor(frameIndex / period);
  }

  if (isLive) {
    // 1) Trail: vorheriges Frame leicht abdunkeln → Bewegung hinterlässt Schlieren.
    ctx.fillStyle = `rgba(5,5,5,${config.trail})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // 2) Dauerhafte Tafel-Körnung.
    ctx.drawImage(getGrainCanvas(canvasW, canvasH, dpr), 0, 0, canvasW, canvasH);
    // 3) Kreide additiv in eine Ink-Ebene (pudriges Aufbauen ohne Cross-Frame-
    //    Überstrahlen), dann normal aufs Hauptbild compositen.
    const ink = getInkLayer(canvasW, canvasH, dpr);
    ink.ctx.globalCompositeOperation = "lighter";
    drawChalkLayers(
      ink.ctx,
      brightness,
      srcW,
      srcH,
      canvasW,
      canvasH,
      config,
      frameSeed
    );
    ink.ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(ink.canvas, 0, 0, canvasW, canvasH);
  } else {
    // Statisch: schwarze Tafel + Körnung + Kreide direkt (deckend).
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(getGrainCanvas(canvasW, canvasH, dpr), 0, 0, canvasW, canvasH);
    drawChalkLayers(
      ctx,
      brightness,
      srcW,
      srcH,
      canvasW,
      canvasH,
      config,
      0
    );
  }
}

/** Voll-Render eines Frames (Upload statisch oder Live). */
export function renderChalkFrame(
  ctx: CanvasRenderingContext2D,
  brightness: Float32Array,
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
  config: ChalkEngineConfig,
  frameIndex: number,
  isLive: boolean
): void {
  renderChalk(ctx, brightness, srcW, srcH, canvasW, canvasH, config, frameIndex, isLive);
}
