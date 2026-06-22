export type BrushType =
  | "kreide" // Standard-Schulkreide — körnig, mittel-deckend
  | "pastell" // Pastell-Kreide — weich, breit, leicht transparent
  | "kohle" // Kohle — rau, kratzig, hoher Kontrast
  | "fein" // Dünne Kreide — präzise, wenig Körnung
  | "trocken" // Trockener Pinsel — lückenhaft, viel Tafel sichtbar
  | "kreidestift"; // Kreidestift/Marker — gleichmäßiger, fast deckend

export interface BrushProfile {
  label: string;
  // Partikel-Einstellungen
  particleDensity: number; // Partikel pro Pixel Strecke (0.5–4)
  particleSizeMin: number; // Min Radius relativ zu strokeWeight (0.05–0.5)
  particleSizeMax: number; // Max Radius relativ zu strokeWeight (0.2–1.0)
  particleShape: "round" | "rough" | "angular";
  // Jitter
  spreadX: number; // Seitliches Streuen relativ zu weight (0.2–2.0)
  spreadY: number;
  // Opacity
  opacityMin: number; // (0.05–0.5)
  opacityMax: number; // (0.3–1.0)
  // Textur
  grainFrequency: number; // Wie oft Lücken entstehen (0 = nie, 1 = sehr oft)
  grainScale: number; // Noise-Scale für Tafel-Textur (0.01–0.1)
  // Druckverlauf
  pressureCurve: "flat" | "taper" | "pulse" | "decay";
  // Edge
  edgeRoughness: number; // Wie ausgefranst die Kanten sind (0–1)
}

export const BRUSH_PROFILES: Record<BrushType, BrushProfile> = {
  kreide: {
    label: "Kreide",
    particleDensity: 2.0,
    particleSizeMin: 0.1,
    particleSizeMax: 0.6,
    particleShape: "rough",
    spreadX: 0.9,
    spreadY: 0.9,
    opacityMin: 0.08,
    opacityMax: 0.55,
    grainFrequency: 0.35,
    grainScale: 0.04,
    pressureCurve: "taper",
    edgeRoughness: 0.6,
  },
  pastell: {
    label: "Pastell",
    particleDensity: 3.0,
    particleSizeMin: 0.15,
    particleSizeMax: 0.8,
    particleShape: "round",
    spreadX: 1.4,
    spreadY: 1.4,
    opacityMin: 0.04,
    opacityMax: 0.35,
    grainFrequency: 0.2,
    grainScale: 0.03,
    pressureCurve: "flat",
    edgeRoughness: 0.3,
  },
  kohle: {
    label: "Kohle",
    particleDensity: 2.5,
    particleSizeMin: 0.08,
    particleSizeMax: 0.5,
    particleShape: "angular",
    spreadX: 1.2,
    spreadY: 0.6,
    opacityMin: 0.15,
    opacityMax: 0.75,
    grainFrequency: 0.45,
    grainScale: 0.06,
    pressureCurve: "pulse",
    edgeRoughness: 0.85,
  },
  fein: {
    label: "Fein",
    particleDensity: 3.5,
    particleSizeMin: 0.05,
    particleSizeMax: 0.25,
    particleShape: "round",
    spreadX: 0.3,
    spreadY: 0.3,
    opacityMin: 0.2,
    opacityMax: 0.7,
    grainFrequency: 0.15,
    grainScale: 0.02,
    pressureCurve: "taper",
    edgeRoughness: 0.15,
  },
  trocken: {
    label: "Trocken",
    particleDensity: 1.2,
    particleSizeMin: 0.1,
    particleSizeMax: 0.7,
    particleShape: "rough",
    spreadX: 1.6,
    spreadY: 1.0,
    opacityMin: 0.05,
    opacityMax: 0.4,
    grainFrequency: 0.6,
    grainScale: 0.07,
    pressureCurve: "decay",
    edgeRoughness: 0.9,
  },
  kreidestift: {
    label: "Kreidestift",
    particleDensity: 4.0,
    particleSizeMin: 0.1,
    particleSizeMax: 0.35,
    particleShape: "round",
    spreadX: 0.4,
    spreadY: 0.4,
    opacityMin: 0.25,
    opacityMax: 0.85,
    grainFrequency: 0.08,
    grainScale: 0.02,
    pressureCurve: "flat",
    edgeRoughness: 0.1,
  },
};

/** Stabile Reihenfolge für die Brush-Auswahl in der Sidebar. */
export const BRUSH_ORDER: BrushType[] = [
  "kreide",
  "pastell",
  "kohle",
  "fein",
  "trocken",
  "kreidestift",
];
