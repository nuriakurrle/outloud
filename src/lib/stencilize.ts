// Adaptive threshold (integral-image method) → white-on-transparent PNG.
// Light pixels become opaque white; dark pixels become transparent — matches
// the chalk asset format so stencils composite correctly on the dark canvas.

const MAX_DIM = 1200;

function luma(r: number, g: number, b: number): number {
  return (r * 6966 + g * 23436 + b * 2366) >> 15;
}

function buildIntegral(data: Uint8ClampedArray, w: number, h: number): Uint32Array {
  const integral = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      sum += luma(data[i], data[i + 1], data[i + 2]);
      integral[y * w + x] = (y > 0 ? integral[(y - 1) * w + x] : 0) + sum;
    }
  }
  return integral;
}

function areaSum(integral: Uint32Array, w: number, x1: number, y1: number, x2: number, y2: number): number {
  const a = x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + x1 - 1] : 0;
  const b = y1 > 0 ? integral[(y1 - 1) * w + x2] : 0;
  const c = x1 > 0 ? integral[y2 * w + x1 - 1] : 0;
  return integral[y2 * w + x2] - b - c + a;
}

export function stencilize(img: HTMLImageElement, blockSize: number, c: number): string {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const ratio = Math.min(1, MAX_DIM / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * ratio));
  const h = Math.max(1, Math.round(nh * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const src = ctx.getImageData(0, 0, w, h);
  const integral = buildIntegral(src.data, w, h);
  const out = new ImageData(w, h);
  const half = Math.max(1, Math.floor(blockSize / 2));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(x - half, 0), y1 = Math.max(y - half, 0);
      const x2 = Math.min(x + half, w - 1), y2 = Math.min(y + half, h - 1);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const mean = areaSum(integral, w, x1, y1, x2, y2) / area;
      const i = (y * w + x) * 4;
      const isLight = luma(src.data[i], src.data[i + 1], src.data[i + 2]) > mean - c;
      out.data[i] = out.data[i + 1] = out.data[i + 2] = 255;
      out.data[i + 3] = isLight ? 255 : 0;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/png");
}
