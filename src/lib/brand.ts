// ── Brand-Konstanten: Вголос! ────────────────────────────────────────────
// Feste visuelle Identität — der Rahmen, innerhalb dessen das generative
// System variiert. Diese Werte ändern sich nicht.

export const BRAND = {
  name: "Вголос!",
  tagline: "Ukrainische Kulturabende",

  colors: {
    chalk: "#FFFFFF",
    chalkDim: "#FFFFFF",
    board: "#1e1e1e", // Tafel-Hintergrund
    boardLight: "#2a2a2a", // Leicht heller für Grain
    accent: {
      yellow: "#f5e6a3",
      pink: "#e8a0b4",
      blue: "#8cb8d4",
      green: "#9cc4a0",
      orange: "#e8b87a",
      red: "#c45c5c",
      purple: "#b89ad4",
    },
  },

  // Typografie — konsistent über alle Formate
  fonts: {
    display: "Playfair Display", // Große Headlines
    heading: "Oswald", // Unter-Headlines
    accent: "Caveat", // Handschrift-Akzent
    body: "Inter", // Fließtext
    detail: "Special Elite", // Datum/Ort (Typewriter)
    marker: "Permanent Marker", // Marker-Effekt
  },

  // Feste Event-Elemente
  venue: "Mikado Café",
  address: "Schertlinstr. 6",
  social: "@outloud_muc",
} as const;

/** Alle Akzentfarben als Array (für den Random-Generator). */
export const ACCENT_COLORS: string[] = Object.values(BRAND.colors.accent);
