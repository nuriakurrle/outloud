import { SimpleNoise } from "./noise";
import { seededRandom } from "./seededRandom";
import type { StretchBrush } from "./stretchBrush";

type Pt = { x: number; y: number };

export function computePathLength(points: Pt[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1e-6)));
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Zeichnet einen kompletten Strich mit einem Stretch Brush. Der Brush-Tip wird
 * entlang des Pfads gestretcht: an jedem Schritt wird die Strichrichtung
 * (Tangente) und ihre Normale berechnet, die Edge-/Density-/Grain-Funktionen
 * gesampelt und ein Querschnitt aus Partikeln entlang der Normalen gezeichnet.
 *
 * Geteilte Engine für finalen Render, Live-Vorschau und Toolbar-Previews,
 * damit alle drei identisch aussehen. Vollständig seed-deterministisch.
 */
export function renderStretchBrush(
  ctx: CanvasRenderingContext2D,
  points: Pt[],
  brush: StretchBrush,
  weight: number,
  color: string,
  opacity: number,
  seed: number
): void {
  if (points.length < 2) return;
  const noise = new SimpleNoise(seed);
  const grainNoise = new SimpleNoise(seed + 500);
  const rng = seededRandom(seed);
  const totalLen = computePathLength(points) || 1;
  const [cr, cg, cb] = hexToRgb(color);

  let accumDist = 0;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const segDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (segDist < 0.5) continue;

    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const normX = -Math.sin(ang);
    const normY = Math.cos(ang);

    const step = 1.0; // ~1px entlang des Pfads
    const numSteps = Math.max(Math.floor(segDist / step), 1);

    for (let s = 0; s < numSteps; s++) {
      const localT = s / numSteps;
      const cx = p0.x + (p1.x - p0.x) * localT;
      const cy = p0.y + (p1.y - p0.y) * localT;
      const t = (accumDist + segDist * localT) / totalLen;

      // Druckverlauf: Anfang und Ende verjüngen
      let taper = 1;
      const taperLen = brush.pressureTaper * 0.5;
      if (taperLen > 0) {
        if (t < taperLen) taper = smoothstep(0, taperLen, t);
        else if (t > 1 - taperLen) taper = smoothstep(0, taperLen, 1 - t);
      }
      const currentWidth = weight * taper;
      if (currentWidth < 0.5) continue;

      const topOffset = brush.topEdge(t, seed, noise);
      const bottomOffset = brush.bottomEdge(t, seed, noise);
      const halfW = currentWidth * 0.5;
      const topY = -halfW * (1 + topOffset);
      const bottomY = halfW * (1 + bottomOffset);
      const effectiveWidth = bottomY - topY;

      const numParticles = brush.particlesPerStep;
      for (let p = 0; p < numParticles; p++) {
        const d = rng();
        const yOffset = topY + d * effectiveWidth;

        const density = brush.fillDensity(t, d, noise, seed);
        if (rng() > density) continue;

        const px = cx + normX * yOffset;
        const py = cy + normY * yOffset;
        const grainVal =
          (grainNoise.noise2D(px * brush.grain.scale, py * brush.grain.scale) +
            1) *
          0.5;
        if (grainVal < brush.grain.intensity * 0.7) continue;

        // Softness: Ränder ausfaden
        const edgeDist = Math.abs(d - 0.5) * 2; // 0=Mitte, 1=Rand
        let edgeAlpha = 1;
        if (brush.softness > 0 && edgeDist > 1 - brush.softness) {
          edgeAlpha = Math.max(
            0,
            1 - (edgeDist - (1 - brush.softness)) / brush.softness
          );
        }

        const [sMin, sMax] = brush.grain.particleSizeRange;
        const radius = Math.max(
          0.3,
          currentWidth * (sMin + rng() * (sMax - sMin))
        );

        const baseAlpha =
          opacity * density * edgeAlpha * (0.5 + grainVal * 0.5);
        const alpha = Math.min(1, baseAlpha * (0.4 + rng() * 0.6));
        if (alpha <= 0.003) continue;

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.beginPath();

        const jitter = radius * 0.3;
        const fx = px + (rng() - 0.5) * jitter;
        const fy = py + (rng() - 0.5) * jitter;

        switch (brush.grain.particleShape) {
          case "round":
            ctx.arc(fx, fy, radius, 0, Math.PI * 2);
            break;
          case "rough": {
            const sides = 4 + Math.floor(rng() * 3);
            const sa = rng() * Math.PI * 2;
            ctx.moveTo(
              fx + Math.cos(sa) * radius * (0.5 + rng() * 0.5),
              fy + Math.sin(sa) * radius * (0.5 + rng() * 0.5)
            );
            for (let k = 1; k <= sides; k++) {
              const a = sa + (k / sides) * Math.PI * 2;
              const rr = radius * (0.5 + rng() * 0.5);
              ctx.lineTo(fx + Math.cos(a) * rr, fy + Math.sin(a) * rr);
            }
            ctx.closePath();
            break;
          }
          case "angular": {
            const sa = rng() * Math.PI * 2;
            ctx.moveTo(fx + Math.cos(sa) * radius, fy + Math.sin(sa) * radius);
            ctx.lineTo(
              fx + Math.cos(sa + 2.1) * radius * (0.5 + rng() * 0.5),
              fy + Math.sin(sa + 2.1) * radius * (0.5 + rng() * 0.5)
            );
            ctx.lineTo(
              fx + Math.cos(sa + 4.2) * radius * (0.4 + rng() * 0.6),
              fy + Math.sin(sa + 4.2) * radius * (0.4 + rng() * 0.6)
            );
            ctx.closePath();
            break;
          }
          case "fiber": {
            const fiberAng = ang + (rng() - 0.5) * 0.5;
            const fiberLen = radius * (2 + rng() * 3);
            const fiberW = radius * 0.3;
            ctx.ellipse(fx, fy, fiberLen, fiberW, fiberAng, 0, Math.PI * 2);
            break;
          }
        }
        ctx.fill();
      }
    }
    accumDist += segDist;
  }
}

/**
 * Rendert eine kurze S-Kurven-Vorschau eines Brushes auf ein Mini-Canvas
 * (100×48 px, 2x). Wird in der Zeichnen-Toolbar gezeigt.
 */
export function renderBrushPreview(
  canvas: HTMLCanvasElement,
  brush: StretchBrush,
  color: string
): void {
  const w = 100;
  const h = 48;
  canvas.width = w * 2;
  canvas.height = h * 2;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(2, 2);

  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, w, h);

  const points: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    points.push({
      x: 6 + t * (w - 12),
      y: h / 2 + Math.sin(t * Math.PI * 1.4 - 0.2) * (h * 0.25),
    });
  }

  renderStretchBrush(ctx, points, brush, 14, color, 0.85, 42);
}
