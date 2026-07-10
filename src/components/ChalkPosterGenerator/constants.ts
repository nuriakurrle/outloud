import type { PosterSize } from "../../types/poster";

export const makeId = () => crypto.randomUUID();

export const POS_KEYS = ["header", "sub", "body", "detail"] as const;
export type PosKey = (typeof POS_KEYS)[number];

export const FONTS = [
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Oswald", value: "Oswald" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Caveat", value: "Caveat" },
  { label: "Bad Script", value: "Bad Script" },
  { label: "Inter", value: "Inter" },
  { label: "Ink Free", value: "Ink Free" },
  { label: "KyivType Titling", value: "KyivType Titling" },
  { label: "KyivType Serif", value: "KyivType Serif" },
  { label: "KyivType Sans", value: "KyivType Sans" },
  { label: "Segoe Script", value: "Segoe Script" },
  { label: "Outloud Type", value: "Outloud Type" },
];

export const POSTER_SIZES: PosterSize[] = [
  { label: "A3 Hochformat", w: 420, h: 594 },
  { label: "A4 Hochformat", w: 297, h: 420 },
  { label: "Flyer", w: 280, h: 594 }, // schmales Hochformat (DL-Proportion)
  { label: "Instagram", w: 400, h: 400 },
];

export const CHALK = "#FFFFFF";
export const POSTER_BG = "#000000";
