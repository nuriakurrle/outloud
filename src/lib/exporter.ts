// ── Export-System ───────────────────────────────────────────────────────
// PNG (statisch), GIF (animiert, via modern-gif) und Video (animiert, WebM
// via MediaRecorder). Alle drei nutzen `renderPosterScene`; GIF/Video treiben
// den Pattern-Selbstzeichen-Fortschritt (Hintergrund-Striche) frameweise.

import { encode } from "modern-gif";
import {
  loadSceneImages,
  renderPosterScene,
  type PosterScene,
} from "./posterRender";

/** Selbstzeichen-Fortschritt: schnell anlaufend, sanft auslaufend (easeOut). */
function easeOut(raw: number): number {
  return 1 - Math.pow(1 - raw, 2.5);
}

/** Lädt einen Blob als Datei herunter. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Statischer PNG-Export. `scale` = Auflösungs-Multiplikator (3 = Druck). */
export async function exportPNG(scene: PosterScene, scale = 3): Promise<Blob> {
  const images = await loadSceneImages(scene);
  const canvas = makeCanvas(scene.w * scale, scene.h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  renderPosterScene(ctx, scene, images);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
}

/**
 * Animierter GIF-Export: die Hintergrund-Striche zeichnen sich über `duration`
 * Sekunden selbst. Fette Striche, Text und Assets bleiben statisch.
 */
export async function exportGIF(
  scene: PosterScene,
  duration = 5,
  fps = 12,
  scale = 1
): Promise<Blob> {
  const images = await loadSceneImages(scene);
  const w = Math.round(scene.w * scale);
  const h = Math.round(scene.h * scale);
  const total = Math.max(1, Math.round(duration * fps));
  const delay = Math.round(1000 / fps);

  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const frames: Array<{ data: Uint8ClampedArray; delay: number }> = [];
  for (let i = 0; i < total; i++) {
    const progress = easeOut(i / (total - 1 || 1));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderPosterScene(ctx, scene, images, progress);
    const frame = ctx.getImageData(0, 0, w, h);
    frames.push({ data: frame.data, delay });
  }

  return await encode({
    format: "blob",
    width: w,
    height: h,
    looped: true,
    maxColors: 255,
    frames,
  });
}

/**
 * Animierter Video-Export (WebM via MediaRecorder). Echtes MP4 bräuchte einen
 * separaten Encoder — WebM ist browser-nativ und überall abspielbar.
 */
export async function exportVideo(
  scene: PosterScene,
  duration = 5,
  fps = 30,
  scale = 1
): Promise<Blob> {
  const images = await loadSceneImages(scene);
  const w = Math.round(scene.w * scale);
  const h = Math.round(scene.h * scale);

  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(fps);

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 6_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.start();

    const total = Math.max(1, Math.round(duration * fps));
    let frame = 0;
    const tick = () => {
      const progress = easeOut(frame / total);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      renderPosterScene(ctx, scene, images, progress);
      frame++;
      if (frame <= total) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => recorder.stop(), 120);
      }
    };
    tick();
  });
}
