// Lokale MediaPipe-Laufzeitdateien für Offline-Betrieb. Vite bündelt jede
// Datei über `?url` als (gehashte) Asset-URL → kein jsDelivr-CDN nötig, läuft
// offline in Dev und im Production-Build. Die Dateien stammen aus dem
// installierten npm-Paket und bleiben so automatisch versionsgleich.
import simdJs from "@mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.js?url";
import simdWasm from "@mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.wasm?url";
import simdData from "@mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.data?url";
import plainJs from "@mediapipe/selfie_segmentation/selfie_segmentation_solution_wasm_bin.js?url";
import plainWasm from "@mediapipe/selfie_segmentation/selfie_segmentation_solution_wasm_bin.wasm?url";
import tflite from "@mediapipe/selfie_segmentation/selfie_segmentation.tflite?url";
import tfliteLandscape from "@mediapipe/selfie_segmentation/selfie_segmentation_landscape.tflite?url";
import binarypb from "@mediapipe/selfie_segmentation/selfie_segmentation.binarypb?url";

// MediaPipe fragt zur Laufzeit Dateien per Dateiname an (locateFile). Diese
// Map liefert dafür die lokale, gebündelte URL.
const FILE_MAP: Record<string, string> = {
  "selfie_segmentation_solution_simd_wasm_bin.js": simdJs,
  "selfie_segmentation_solution_simd_wasm_bin.wasm": simdWasm,
  "selfie_segmentation_solution_simd_wasm_bin.data": simdData,
  "selfie_segmentation_solution_wasm_bin.js": plainJs,
  "selfie_segmentation_solution_wasm_bin.wasm": plainWasm,
  "selfie_segmentation.tflite": tflite,
  "selfie_segmentation_landscape.tflite": tfliteLandscape,
  "selfie_segmentation.binarypb": binarypb,
};

/** locateFile-Callback für MediaPipe: liefert lokale URLs statt CDN. */
export function locateMediapipeFile(file: string): string {
  return FILE_MAP[file] ?? file;
}
