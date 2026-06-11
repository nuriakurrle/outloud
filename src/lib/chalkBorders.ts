import { seededRandom } from "./seededRandom";
import { drawChalkStroke, CHALK_COLOR } from "./chalkPatterns";
import type { BorderConfig } from "../types/poster";

const MARGIN = 20;

function chalkRect(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  x: number,
  y: number,
  w: number,
  h: number,
  weight: number,
  alpha: number
) {
  drawChalkStroke(ctx, rng, x, y, x + w, y, weight, alpha);
  drawChalkStroke(ctx, rng, x + w, y, x + w, y + h, weight, alpha);
  drawChalkStroke(ctx, rng, x + w, y + h, x, y + h, weight, alpha);
  drawChalkStroke(ctx, rng, x, y + h, x, y, weight, alpha);
}

/** Stern-Ornament (radiale Linien) an einer Ecke. */
function drawCornerStar(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number,
  cy: number,
  size: number,
  weight: number,
  alpha: number
) {
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = i % 2 === 0 ? size : size * 0.55;
    drawChalkStroke(
      ctx,
      rng,
      cx,
      cy,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len,
      weight,
      alpha
    );
  }
}

export function drawChalkBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: BorderConfig
): void {
  if (config.style === "none") return;
  const rng = seededRandom(98765);
  const weight = config.weight;
  const alpha = 0.85;
  const x = MARGIN;
  const y = MARGIN;
  const iw = w - MARGIN * 2;
  const ih = h - MARGIN * 2;

  ctx.save();
  switch (config.style) {
    case "dashed": {
      ctx.strokeStyle = CHALK_COLOR;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = weight;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(x, y, iw, ih);
      ctx.setLineDash([]);
      break;
    }
    case "double": {
      chalkRect(ctx, rng, x, y, iw, ih, weight, alpha);
      chalkRect(
        ctx,
        rng,
        x + 8,
        y + 8,
        iw - 16,
        ih - 16,
        weight,
        alpha
      );
      break;
    }
    case "ornament": {
      chalkRect(ctx, rng, x, y, iw, ih, weight, alpha);
      const s = 16;
      drawCornerStar(ctx, rng, x, y, s, weight, alpha);
      drawCornerStar(ctx, rng, x + iw, y, s, weight, alpha);
      drawCornerStar(ctx, rng, x, y + ih, s, weight, alpha);
      drawCornerStar(ctx, rng, x + iw, y + ih, s, weight, alpha);
      break;
    }
    case "chalk": {
      // 3 leicht versetzte Lagen für einen dicken, handgemalten Look
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 2;
        chalkRect(
          ctx,
          rng,
          x + off,
          y + off,
          iw,
          ih,
          weight,
          alpha * 0.7
        );
      }
      break;
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
