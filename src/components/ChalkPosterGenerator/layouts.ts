import type { Position } from "../../types/poster";
import type { Align } from "../../types/poster";

type PosKey = "header" | "sub" | "body" | "detail" | "divider";
type TextKey = "header" | "sub" | "body" | "detail";

export interface LogoSlot {
  x: number;
  y: number;
  scale: number;
}

export interface PosterLayout {
  id: string;
  name: string;
  hint: string;
  preview?: string; // path to preview image (relative to public/)
  positions: Record<PosKey, Position>;
  aligns?: Partial<Record<TextKey, Align>>;
  logoSlots: LogoSlot[];
  strokeRows: number[]; // y-Reihen (%) für Kreide-Linien — in den Weißräumen zwischen den Textblöcken
}

export const LAYOUTS: PosterLayout[] = [
  {
    id: "nationalism_a3",
    name: "Націоналізм",
    hint: "Великий заголовок зліва · Логотип внизу · Деталі зліва",
    preview: `${import.meta.env.BASE_URL}layouts/nationalism-a3.png`,
    // Hierarchie wie Referenzposter: Titel → Tagline → Termin → Details → Logo unten links
    positions: {
      header:  { x: 4.94,  y: 14 },
      sub:     { x: 5.60,  y: 29 },
      divider: { x: 50,    y: 46.5 },
      body:    { x: 5.60,  y: 40 },
      detail:  { x: 5.60,  y: 52 },
    },
    aligns: { header: "left", sub: "left", body: "left", detail: "left" },
    // Logo zentriert verankert: x so, dass die linke Kante (x − scale·50) auf der Textspalte liegt
    logoSlots: [{ x: 23.1, y: 76.84, scale: 0.35 }],
    strokeRows: [48.5, 62, 91.5],
  },
  {
    id: "zentriert",
    name: "Zentriert",
    hint: "Kompakt gestapelt · kleines Logo unten",
    positions: {
      header: { x: 50, y: 28 },
      sub: { x: 50, y: 44 },
      divider: { x: 50, y: 50 },
      body: { x: 50, y: 56 },
      detail: { x: 50, y: 68 },
    },
    logoSlots: [{ x: 50, y: 84, scale: 0.22 }],
    strokeRows: [9, 75.5, 93],
  },
];
