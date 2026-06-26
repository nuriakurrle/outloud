import {
  loadSceneImages,
  renderPosterScene,
  type PosterScene,
} from "./posterRender";

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

export async function exportPNG(scene: PosterScene, scale = 3): Promise<Blob> {
  const images = await loadSceneImages(scene);
  const canvas = makeCanvas(scene.w * scale, scene.h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  await renderPosterScene(ctx, scene, images);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
}
