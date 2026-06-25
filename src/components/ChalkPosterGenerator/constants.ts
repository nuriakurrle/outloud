import type { PosterSize } from "../../types/poster";

export const makeId = () => crypto.randomUUID();

export const POS_KEYS = ["header", "sub", "body", "detail"] as const;
export type PosKey = (typeof POS_KEYS)[number];

export const FONTS = [
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Oswald", value: "Oswald" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Permanent Marker", value: "Permanent Marker" },
  { label: "Caveat", value: "Caveat" },
  { label: "Special Elite", value: "Special Elite" },
  { label: "Rock Salt", value: "Rock Salt" },
  { label: "Abril Fatface", value: "Abril Fatface" },
];

export const POSTER_SIZES: PosterSize[] = [
  { label: "A3 Hochformat", w: 420, h: 594 },
  { label: "A4 Hochformat", w: 297, h: 420 },
  { label: "Flyer", w: 280, h: 594 }, // schmales Hochformat (DL-Proportion)
  { label: "Instagram", w: 400, h: 400 },
];

// Schrift-Pools für „Alles neu generieren" — pro Textrolle passend gewählt,
// damit der gewürfelte Look im Brand-Rahmen bleibt.
export const DISPLAY_FONTS = [
  "Playfair Display",
  "Abril Fatface",
  "Permanent Marker",
  "Pacifico",
  "Rock Salt",
];
export const SCRIPT_FONTS = ["Caveat", "Pacifico", "Permanent Marker"];
export const BODY_FONTS = ["Oswald", "Special Elite", "Caveat"];
export const DETAIL_FONTS = ["Special Elite", "Oswald", "Caveat"];
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const CHALK = "#FFFFFF";
export const CHALK_DIM = "#b0aca8";
export const POSTER_BG = "#000000";
