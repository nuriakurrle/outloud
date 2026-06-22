import tornWide from "../assets/shapes/torn-wide.svg?url";
import tornNote from "../assets/shapes/torn-note.svg?url";
import tornStrip from "../assets/shapes/torn-strip.svg?url";
import lineStraight from "../assets/shapes/line-straight.svg?url";
import lineDouble from "../assets/shapes/line-double.svg?url";
import lineWavy from "../assets/shapes/line-wavy.svg?url";
import lineArrow from "../assets/shapes/line-arrow.svg?url";
import type { AssetItem } from "../types/poster";

// ── Formen-Bibliothek ───────────────────────────────────────────────────
// Weiß-auf-transparente SVGs, die – genau wie die Stroke-Stamps – als Maske
// in Kreide-Weiß ODER -Schwarz getönt aufs Poster gelegt werden. So entsteht
// ohne neue Render-Logik eine "Formen"-Sektion mit gerissenem Papier (für
// Text-/Label-Flächen) und Linien/Trennern.

interface ShapeDef {
  id: string;
  name: string;
  src: string;
  w: number;
  h: number;
  defaultScale: number; // Anteil der Posterbreite
}

const SHAPES: ShapeDef[] = [
  // Gerissenes Papier
  { id: "torn-wide", name: "Papier breit", src: tornWide, w: 600, h: 380, defaultScale: 0.5 },
  { id: "torn-note", name: "Papier Notiz", src: tornNote, w: 440, h: 470, defaultScale: 0.32 },
  { id: "torn-strip", name: "Papier Streifen", src: tornStrip, w: 600, h: 190, defaultScale: 0.55 },
  // Linien & Trenner
  { id: "line-straight", name: "Linie", src: lineStraight, w: 600, h: 40, defaultScale: 0.6 },
  { id: "line-double", name: "Doppellinie", src: lineDouble, w: 600, h: 70, defaultScale: 0.6 },
  { id: "line-wavy", name: "Wellenlinie", src: lineWavy, w: 600, h: 90, defaultScale: 0.6 },
  { id: "line-arrow", name: "Pfeil", src: lineArrow, w: 600, h: 90, defaultScale: 0.45 },
];

export const SHAPE_ASSETS: AssetItem[] = SHAPES.map((s) => ({
  id: `shapes/${s.id}`,
  name: s.name,
  category: "shapes",
  src: s.src,
  defaultScale: s.defaultScale,
  anchor: "center",
  naturalWidth: s.w,
  naturalHeight: s.h,
}));
