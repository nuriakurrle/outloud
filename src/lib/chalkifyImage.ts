// Wandelt ein Foto (PNG/JPG) in einen Kreide-Look um: hochkontrastiges
// Monochrom, dessen dunkle Bereiche transparent werden und so mit der
// schwarzen Tafel verschmelzen — wie die Trump-/Putin-Porträts der Referenz.
//
// Ergebnis ist ein transparentes PNG als Data-URL. Dadurch funktioniert es
// überall, wo bereits ein Bild-`src` verwendet wird: in der Live-Vorschau
// (<img>) genauso wie im Canvas-Export (drawImage) — ohne Sonderpfade.

import { loadImage } from "./posterRender";

export interface ChalkifyOptions {
  contrast: number; // 0.5–2.5, Default ~1.35
  brightness: number; // -0.3–0.3, Default 0.05
  threshold: number; // 0 = weiche Schattierung; >0 = harter Schnitt (Cutout)
  tint: string; // Kreide-Farbe (Hex), Default Off-White
}

export const DEFAULT_CHALKIFY: ChalkifyOptions = {
  contrast: 1.35,
  brightness: 0.05,
  threshold: 0,
  tint: "#e8e5e0",
};

const MAX_DIM = 1400; // Verarbeitungsgröße deckeln → flüssig, scharf genug

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Weicher Stufenübergang (für Threshold-Kanten ohne Treppchen). */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Verarbeitet ein bereits geladenes Bild und liefert eine Kreide-Data-URL.
 * Alpha = aufbereitete Helligkeit → helle Partien werden zu Kreide, dunkle
 * verschwinden in der Tafel.
 */
export function chalkifyLoadedImage(
  img: HTMLImageElement,
  opts: ChalkifyOptions = DEFAULT_CHALKIFY
): string {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return img.src;

  const ratio = Math.min(1, MAX_DIM / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * ratio));
  const h = Math.max(1, Math.round(ih * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  const [tr, tg, tb] = hexToRgb(opts.tint);
  const { contrast, brightness, threshold } = opts;
  const useThreshold = threshold > 0.001;
  const edge = 0.06; // Kantenweichheit beim Cutout

  for (let i = 0; i < px.length; i += 4) {
    const srcA = px[i + 3] / 255;
    // Helligkeit (Rec. 601) normiert 0–1
    let lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    // Kontrast um die Mitte + Helligkeit
    lum = clamp01((lum - 0.5) * contrast + 0.5 + brightness);

    let alpha: number;
    if (useThreshold) {
      alpha = smoothstep(threshold - edge, threshold + edge, lum);
    } else {
      // weiche Kreide-Schattierung: dunkle Töne fallen stärker ab (Gamma)
      alpha = Math.pow(lum, 1.25);
    }

    px[i] = tr;
    px[i + 1] = tg;
    px[i + 2] = tb;
    px[i + 3] = Math.round(clamp01(alpha) * srcA * 255);
  }

  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Lädt eine Bildquelle und liefert direkt die Kreide-Data-URL. */
export async function chalkifyImage(
  src: string,
  opts: ChalkifyOptions = DEFAULT_CHALKIFY
): Promise<string> {
  const img = await loadImage(src);
  return chalkifyLoadedImage(img, opts);
}
