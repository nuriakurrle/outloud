import * as SelfieSegModule from "@mediapipe/selfie_segmentation";
import * as CameraModule from "@mediapipe/camera_utils";
import { locateMediapipeFile } from "./mediapipeAssets";

// Die MediaPipe-Pakete sind Closure-IIFEs ohne echte ES-Named-Exports: die
// Klasse wird dynamisch ans Default-Export-Objekt gehängt (Vite/esbuild liefern
// sie unter `default.X`, eine evtl. Interop-Schicht unter `.X`). Beide Pfade
// abdecken, damit es in Dev (esbuild) und Build (rollup) gleichermaßen läuft.
const SelfieSegmentation: typeof import("@mediapipe/selfie_segmentation").SelfieSegmentation =
  (SelfieSegModule as any).SelfieSegmentation ??
  (SelfieSegModule as any).default?.SelfieSegmentation;
const Camera: typeof import("@mediapipe/camera_utils").Camera =
  (CameraModule as any).Camera ?? (CameraModule as any).default?.Camera;

/**
 * Ergebnis eines Segmentation-Frames: die Personen-Maske (Person = hell,
 * Hintergrund = dunkel) plus den Original-Webcam-Frame (für Helligkeits-Tiefe).
 */
export interface SegmentationResult {
  mask: ImageData; // Personen-Maske (Kanal R: 0–255, 255 = Person)
  videoFrame: ImageData; // Original-Webcam-Frame (gespiegelt wie die Maske)
  width: number;
  height: number;
}

export interface SegmentationHandle {
  stop: () => void;
}

/**
 * Startet Webcam + MediaPipe Selfie Segmentation und ruft `onResult` pro Frame.
 * `onError` fängt fehlende Kamera-Rechte / kein Gerät ab.
 *
 * Maske und Frame werden gespiegelt geliefert (selfieMode), damit sich die
 * Person wie in einem Spiegel sieht.
 */
export function startBodySegmentation(
  videoElement: HTMLVideoElement,
  onResult: (result: SegmentationResult) => void,
  onError?: (err: unknown) => void
): SegmentationHandle {
  // Wiederverwendete Offscreen-Canvas — kein Neu-Allozieren pro Frame.
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
  const frameCanvas = document.createElement("canvas");
  const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true })!;

  const selfieSegmentation = new SelfieSegmentation({
    // Lokale, gebündelte Laufzeitdateien → offline, kein CDN.
    locateFile: locateMediapipeFile,
  });

  selfieSegmentation.setOptions({
    modelSelection: 1, // 0 = general, 1 = landscape (schneller, fürs Querformat)
    selfieMode: true, // spiegeln
  });

  selfieSegmentation.onResults((results) => {
    const segMask = results.segmentationMask as CanvasImageSource & {
      width: number;
      height: number;
    };
    const w = segMask.width;
    const h = segMask.height;
    if (!w || !h) return;

    if (maskCanvas.width !== w || maskCanvas.height !== h) {
      maskCanvas.width = w;
      maskCanvas.height = h;
    }
    maskCtx.drawImage(segMask, 0, 0);
    const mask = maskCtx.getImageData(0, 0, w, h);

    // Frame auf Masken-Größe rastern → mask und videoFrame sind pixelgenau
    // deckungsgleich (gleicher Index), unabhängig von der Kamera-Auflösung.
    const frameImg = results.image as CanvasImageSource;
    if (frameCanvas.width !== w || frameCanvas.height !== h) {
      frameCanvas.width = w;
      frameCanvas.height = h;
    }
    frameCtx.drawImage(frameImg, 0, 0, w, h);
    const videoFrame = frameCtx.getImageData(0, 0, w, h);

    onResult({ mask, videoFrame, width: w, height: h });
  });

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      try {
        await selfieSegmentation.send({ image: videoElement });
      } catch (err) {
        onError?.(err);
      }
    },
    width: 640,
    height: 480,
  });

  camera.start().catch((err: unknown) => onError?.(err));

  return {
    stop: () => {
      try {
        camera.stop();
      } catch {
        /* Kamera evtl. nie gestartet */
      }
      selfieSegmentation.close();
    },
  };
}
