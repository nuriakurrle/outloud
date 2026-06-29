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

// Referenz-Format (A3), gegen das Default-Schriftgrößen und Layouts gestaltet
// sind. Typografie skaliert mit der knapperen Achse – min(w/REF_W, h/REF_H) –
// damit der Text in jedes Format passt, ohne bei kurzen (quadratischen)
// Formaten zu überlappen oder bei schmalen über den Rand zu laufen.
export const REFERENCE_W = 420;
export const REFERENCE_H = 594;

export const CHALK = "#FFFFFF";
export const POSTER_BG = "#000000";
