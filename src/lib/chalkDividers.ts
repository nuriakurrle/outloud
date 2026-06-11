import { seededRandom } from "./seededRandom";
import { drawChalkStroke, CHALK_COLOR } from "./chalkPatterns";
import type { DividerStyle } from "../types/poster";

const SIDE_MARGIN = 50;

/**
 * Zeichnet den Trenner auf Höhe `y` (absolute Pixel). Position kommt vom
 * Nutzer (verschiebbar). Breite zentriert mit Rand links/rechts.
 */
export function drawChalkDivider(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  config: DividerStyle
): void {
  if (config.style === "none") return;
  const rng = seededRandom(54321);
  const alpha = 0.85;
  const x1 = SIDE_MARGIN;
  const x2 = w - SIDE_MARGIN;
  const cx = w / 2;

  ctx.save();
  switch (config.style) {
    case "line": {
      drawChalkStroke(ctx, rng, x1, y, x2, y, 2.5, alpha);
      break;
    }
    case "doubleline": {
      drawChalkStroke(ctx, rng, x1, y - 3, x2, y - 3, 2, alpha);
      drawChalkStroke(ctx, rng, x1, y + 3, x2, y + 3, 2, alpha);
      break;
    }
    case "dots": {
      ctx.fillStyle = CHALK_COLOR;
      for (let x = x1; x <= x2; x += 14) {
        const r = 2 + rng() * 1.5;
        ctx.globalAlpha = alpha * (0.6 + rng() * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "ornament": {
      const gap = 30;
      // Linien links und rechts vom mittigen Ornament
      drawChalkStroke(ctx, rng, x1, y, cx - gap, y, 2.5, alpha);
      drawChalkStroke(ctx, rng, cx + gap, y, x2, y, 2.5, alpha);
      // Halbkreis-Ornament in der Mitte
      ctx.strokeStyle = CHALK_COLOR;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, y, gap * 0.5, Math.PI, Math.PI * 2);
      ctx.stroke();
      // Punkt-Akzente an den Linienenden
      ctx.fillStyle = CHALK_COLOR;
      for (const px of [cx - gap, cx + gap]) {
        ctx.beginPath();
        ctx.arc(px, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
