import { computePathLength } from "./mathUtils";

type Pt = { x: number; y: number };
type Img = HTMLImageElement | HTMLCanvasElement;

function imgSize(img: Img): { w: number; h: number } {
  return {
    w: (img as HTMLImageElement).naturalWidth || img.width,
    h: (img as HTMLImageElement).naturalHeight || img.height,
  };
}

/**
 * Zeichnet einen platzierten Stamp mit getrennter X-/Y-Skalierung, Rotation
 * und Spiegelung — zentriert auf (px, py) in Pixel-Koordinaten.
 */
export function renderPlacedStroke(
  ctx: CanvasRenderingContext2D,
  img: Img,
  opts: {
    px: number;
    py: number;
    scaleX: number;
    scaleY: number;
    rotation: number; // Grad
    flipX: boolean;
    flipY: boolean;
    opacity: number;
  }
): void {
  const { w, h } = imgSize(img);
  ctx.save();
  ctx.translate(opts.px, opts.py);
  ctx.rotate((opts.rotation * Math.PI) / 180);
  ctx.scale(
    opts.scaleX * (opts.flipX ? -1 : 1),
    opts.scaleY * (opts.flipY ? -1 : 1)
  );
  ctx.globalAlpha = opts.opacity;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Wrappt einen Stamp entlang eines Pfads: das Bild wird in 1px-breite
 * vertikale Spalten geschnitten, jede Spalte wird rotiert (Pfadrichtung) und
 * mit `thickness` skaliert am entsprechenden Pfadpunkt abgelegt. Der Stroke
 * folgt so exakt der Kurve, behält aber seine Original-Textur.
 */
export function renderWarpedStroke(
  ctx: CanvasRenderingContext2D,
  img: Img,
  path: Pt[],
  thickness: number,
  opacity: number
): void {
  if (path.length < 2) return;
  const { w: srcW, h: srcH } = imgSize(img);
  const pathLen = computePathLength(path);
  if (pathLen < 1) return;

  ctx.globalAlpha = opacity;
  const sliceWidth = 1;
  let accumDist = 0;

  for (let i = 1; i < path.length; i++) {
    const p0 = path[i - 1];
    const p1 = path[i];
    const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (segLen < 0.5) continue;

    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const steps = Math.max(Math.ceil(segLen), 1);

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const cx = p0.x + (p1.x - p0.x) * t;
      const cy = p0.y + (p1.y - p0.y) * t;
      const globalT = (accumDist + segLen * t) / pathLen;

      const srcX = Math.min(srcW - 1, Math.max(0, Math.floor(globalT * srcW)));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.scale(1, thickness);
      ctx.drawImage(
        img,
        srcX,
        0,
        sliceWidth,
        srcH,
        // +1 in der Breite vermeidet feine Lücken zwischen den Scheiben
        -0.5,
        -srcH / 2,
        sliceWidth + 1,
        srcH
      );
      ctx.restore();
    }

    accumDist += segLen;
  }

  ctx.globalAlpha = 1;
}
