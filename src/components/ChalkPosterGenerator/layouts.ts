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
    preview: "/layouts/nationalism-a3.png",
    positions: {
      header:  { x: 4.94,  y: 10.52 },
      sub:     { x: 19.96, y: 63.68 },
      divider: { x: 50,    y: 40    },
      body:    { x: 5.60,  y: 36.45 },
      detail:  { x: 5.60,  y: 46.56 },
    },
    aligns: { header: "left", sub: "center", body: "left", detail: "left" },
    logoSlots: [{ x: 10.04, y: 76.84, scale: 0.35 }],
  },
];
