import type { PosterSize, PatternConfig } from "../../types/poster";

export const MERCH_SIZE: PosterSize = { label: "T-Shirt", w: 400, h: 500 };

export const EMPTY_PATTERN: PatternConfig = {
  patternType: "lines", count: 0, brushName: "Figma Verite",
  strokeWidth: 0, opacity: 0, color: "white", seed: 0,
};

export const MERCH_ITEMS = [{ id: "tshirt", label: "T-Shirt" }] as const;

export const TSHIRT_VIEWS = [
  { id: "front" as const, label: "Front" },
  { id: "back" as const, label: "Back" },
];
