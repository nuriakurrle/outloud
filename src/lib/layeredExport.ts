import { zipSync, strToU8 } from "fflate";
import { renderPosterScene, loadSceneImages } from "./posterRender";
import type { PosterScene } from "./posterRender";

export interface DesignFileState {
  v: 2;
  app: "outloud-poster";
  snap: Record<string, unknown>;
  textAligns: Record<string, string>;
  textWidths: Record<string, number>;
  margins: { left: number; right: number; top: number; bottom: number };
  text: { headerText: string; subText: string; bodyText: string; detailText: string };
  inverted: boolean;
  posterSizeIndex: number;
}

async function sceneToBlob(scene: PosterScene, images: Map<string, HTMLImageElement>, scale: number): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = scene.w * scale;
  canvas.height = scene.h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  await renderPosterScene(ctx, scene, images);
  return new Promise(res => canvas.toBlob(b => {
    b!.arrayBuffer().then(ab => res(new Uint8Array(ab)));
  }, "image/png"));
}

export async function exportDesignZip(
  scene: PosterScene,
  designState: DesignFileState,
  scale = 2,
): Promise<Blob> {
  const images = await loadSceneImages(scene);
  const s = scene;
  const back = s.strokes.filter(st => !st.front);
  const front = s.strokes.filter(st => st.front);

  const layers: Record<string, PosterScene> = {
    "layers/1-background.png":   { ...s, patternStrokes: [], strokes: [], texts: [], assets: [] },
    "layers/2-pattern.png":      { ...s, skipBg: true, strokes: [], texts: [], assets: [] },
    "layers/3-strokes-back.png": { ...s, skipBg: true, patternStrokes: [], strokes: back, texts: [], assets: [] },
    "layers/4-assets.png":       { ...s, skipBg: true, patternStrokes: [], strokes: [], texts: [] },
    "layers/5-text.png":         { ...s, skipBg: true, patternStrokes: [], strokes: [], assets: [] },
    "layers/6-strokes-front.png":{ ...s, skipBg: true, patternStrokes: [], strokes: front, texts: [], assets: [] },
    "preview.png":               s,
  };

  const rendered = await Promise.all(
    Object.entries(layers).map(async ([name, sc]) => [name, await sceneToBlob(sc, images, scale)] as const)
  );

  const files: Record<string, Uint8Array> = {};
  for (const [name, data] of rendered) files[name] = data;
  files["design.json"] = strToU8(JSON.stringify(designState, null, 2));

  return new Blob([zipSync(files)], { type: "application/zip" });
}
