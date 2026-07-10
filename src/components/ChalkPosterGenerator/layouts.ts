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
}

export const LAYOUTS: PosterLayout[] = [
  {
    id: "nationalism_a3",
    name: "Націоналізм",
    hint: "Великий заголовок зліва · Логотип внизу · Деталі зліва",
    preview: `${import.meta.env.BASE_URL}layouts/nationalism-a3.png`,
    positions: {
      header:  { x: 4.94,  y: 10.52 },
      sub:     { x: 5.60,  y: 63.68 },
      divider: { x: 50,    y: 40    },
      body:    { x: 5.60,  y: 36.45 },
      detail:  { x: 5.60,  y: 46.56 },
    },
    aligns: { header: "left", sub: "left", body: "left", detail: "left" },
    // Logo zentriert verankert: x so, dass die linke Kante (x − scale·50) auf der Textspalte liegt
    logoSlots: [{ x: 23.1, y: 76.84, scale: 0.35 }],
  },
  {
    id: "event_links",
    name: "Event (Links)",
    hint: "Logo oben links · Titel & Text links · Details unten",
    positions: {
      header: { x: 8, y: 26 },
      sub: { x: 8, y: 43 },
      divider: { x: 50, y: 38 },
      body: { x: 8, y: 52 },
      detail: { x: 8, y: 88 },
    },
    aligns: { header: "left", sub: "left", body: "left", detail: "left" },
    logoSlots: [{ x: 20, y: 12, scale: 0.3 }],
  },
  {
    id: "zentriert",
    name: "Zentriert",
    hint: "Kompakt gestapelt · kleines Logo unten",
    positions: {
      header: { x: 50, y: 30 },
      sub: { x: 50, y: 46 },
      divider: { x: 50, y: 53 },
      body: { x: 50, y: 60 },
      detail: { x: 50, y: 78 },
    },
    logoSlots: [{ x: 50, y: 91, scale: 0.22 }],
  },
];
