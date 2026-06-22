import type { SimpleNoise } from "./noise";
import type { DrawBrush } from "../types/poster";

// ── Stretch-Brush-System (Nachbau der Figma "Outload Brushes") ──────────
// Ein Stretch Brush definiert seinen Charakter über ein rechteckiges Profil,
// das entlang des Strich-Pfads gestretcht wird:
//   • Ober-/Unterkante  → Kontur (rau, wellig, gezackt)
//   • Innenfläche       → Dichte-Map (wo Kreide, wo scheint die Tafel durch)
//   • Körnung           → Oberflächentextur
// Der Renderer (stretchBrushRenderer.ts) sampelt diese Funktionen und zeichnet
// pro Pfad-Schritt einen Querschnitt — daraus entsteht ein durchgehender
// Strich, dessen Look komplett vom Brush kommt (keine Zufallspartikel).

export type EdgeFunction = (
  t: number, // Position entlang Strich (0–1)
  seed: number,
  noise: SimpleNoise
) => number; // Abweichung von der geraden Kante (relativ zur Breite)

export type DensityFunction = (
  t: number, // entlang Strich (0–1)
  d: number, // quer zum Strich (0=obere Kante, 1=untere Kante)
  noise: SimpleNoise,
  seed: number
) => number; // 0 = keine Kreide, 1 = volle Deckung

export interface GrainConfig {
  scale: number; // Noise-Scale für Körnung (0.02–0.15)
  intensity: number; // Stärke der Körnung (0–1)
  particleShape: "round" | "rough" | "angular" | "fiber";
  particleSizeRange: [number, number]; // min/max relativ zur Breite
}

export interface StretchBrush {
  name: string;
  label: string;
  topEdge: EdgeFunction;
  bottomEdge: EdgeFunction;
  fillDensity: DensityFunction;
  grain: GrainConfig;
  particlesPerStep: number; // Partikel pro Querschnitt (8–40)
  softness: number; // Randweichheit (0 = hart, 1 = sehr weich)
  pressureTaper: number; // Verjüngung an den Enden (0–1)
}

// ── 1. Vérité — realistische Kreide, sauber, leicht körnig ──────────────
const verite: StretchBrush = {
  name: "verite",
  label: "Vérité",
  topEdge: (t, seed, noise) =>
    noise.noise2D(t * 8 + seed, 0) * 0.08 +
    noise.noise2D(t * 25 + seed, 1) * 0.03,
  bottomEdge: (t, seed, noise) =>
    noise.noise2D(t * 8 + seed + 50, 10) * 0.08 +
    noise.noise2D(t * 22 + seed + 50, 11) * 0.03,
  fillDensity: (t, d, noise, seed) => {
    const n = noise.noise2D(t * 30 + seed, d * 15) * 0.15;
    const edgeFade = 1 - Math.pow(Math.abs(d - 0.5) * 2, 3) * 0.3;
    return Math.max(0, 0.75 + n) * edgeFade;
  },
  grain: {
    scale: 0.04,
    intensity: 0.3,
    particleShape: "rough",
    particleSizeRange: [0.03, 0.15],
  },
  particlesPerStep: 18,
  softness: 0.25,
  pressureTaper: 0.4,
};

// ── 2. Grindhouse — rau, körnig, distressed ─────────────────────────────
const grindhouse: StretchBrush = {
  name: "grindhouse",
  label: "Grindhouse",
  topEdge: (t, seed, noise) =>
    noise.noise2D(t * 15 + seed, 0) * 0.2 +
    noise.noise2D(t * 45 + seed, 1) * 0.12 +
    noise.noise2D(t * 90 + seed, 2) * 0.06,
  bottomEdge: (t, seed, noise) =>
    noise.noise2D(t * 15 + seed + 70, 10) * 0.2 +
    noise.noise2D(t * 50 + seed + 70, 11) * 0.1 +
    noise.noise2D(t * 80 + seed + 70, 12) * 0.08,
  fillDensity: (t, d, noise, seed) => {
    const n1 = noise.noise2D(t * 20 + seed, d * 20);
    const n2 = noise.noise2D(t * 50 + seed + 30, d * 40);
    const holes = n1 * 0.4 + n2 * 0.2;
    if (holes < -0.15) return 0;
    const edgeFade = 1 - Math.pow(Math.abs(d - 0.5) * 2, 2) * 0.5;
    return Math.max(0, 0.6 + holes * 0.3) * edgeFade;
  },
  grain: {
    scale: 0.07,
    intensity: 0.6,
    particleShape: "angular",
    particleSizeRange: [0.02, 0.2],
  },
  particlesPerStep: 22,
  softness: 0.6,
  pressureTaper: 0.3,
};

// ── 3. Heist — bold, kräftig, leicht rau, hohe Deckung ──────────────────
const heist: StretchBrush = {
  name: "heist",
  label: "Heist",
  topEdge: (t, seed, noise) =>
    noise.noise2D(t * 6 + seed, 0) * 0.1 +
    noise.noise2D(t * 18 + seed, 1) * 0.05,
  bottomEdge: (t, seed, noise) =>
    noise.noise2D(t * 6 + seed + 40, 10) * 0.1 +
    noise.noise2D(t * 20 + seed + 40, 11) * 0.05,
  fillDensity: (t, d, noise, seed) => {
    const n = noise.noise2D(t * 15 + seed, d * 10) * 0.1;
    const edgeFade = 1 - Math.pow(Math.abs(d - 0.5) * 2, 4) * 0.2;
    return Math.max(0, 0.85 + n) * edgeFade;
  },
  grain: {
    scale: 0.035,
    intensity: 0.2,
    particleShape: "rough",
    particleSizeRange: [0.04, 0.18],
  },
  particlesPerStep: 25,
  softness: 0.15,
  pressureTaper: 0.5,
};

// ── 4. Biopic — smooth, elegant, feine Textur, fast solid ───────────────
const biopic: StretchBrush = {
  name: "biopic",
  label: "Biopic",
  topEdge: (t, seed, noise) =>
    noise.noise2D(t * 5 + seed, 0) * 0.04 +
    noise.noise2D(t * 15 + seed, 1) * 0.02,
  bottomEdge: (t, seed, noise) =>
    noise.noise2D(t * 5 + seed + 30, 10) * 0.04 +
    noise.noise2D(t * 12 + seed + 30, 11) * 0.02,
  fillDensity: (t, d, noise, seed) => {
    const n = noise.noise2D(t * 12 + seed, d * 8) * 0.08;
    const edgeFade = 1 - Math.pow(Math.abs(d - 0.5) * 2, 5) * 0.15;
    return Math.max(0, 0.9 + n) * edgeFade;
  },
  grain: {
    scale: 0.025,
    intensity: 0.15,
    particleShape: "round",
    particleSizeRange: [0.03, 0.1],
  },
  particlesPerStep: 30,
  softness: 0.1,
  pressureTaper: 0.35,
};

// ── 5. Spaghetti Western — wild, aggressiv, extrem rau, streifig ────────
const spaghettiWestern: StretchBrush = {
  name: "spaghetti_western",
  label: "Spaghetti Western",
  topEdge: (t, seed, noise) =>
    noise.noise2D(t * 4 + seed, 0) * 0.25 +
    noise.noise2D(t * 20 + seed, 1) * 0.15 +
    noise.noise2D(t * 60 + seed, 2) * 0.1 +
    noise.noise2D(t * 120 + seed, 3) * 0.05,
  bottomEdge: (t, seed, noise) =>
    noise.noise2D(t * 4 + seed + 80, 10) * 0.25 +
    noise.noise2D(t * 25 + seed + 80, 11) * 0.15 +
    noise.noise2D(t * 55 + seed + 80, 12) * 0.1 +
    noise.noise2D(t * 100 + seed + 80, 13) * 0.06,
  fillDensity: (t, d, noise, seed) => {
    const stripe =
      Math.sin(d * Math.PI * 6 + noise.noise2D(t * 8, seed) * 3) * 0.3;
    const n = noise.noise2D(t * 25 + seed, d * 30) * 0.35;
    const base = 0.5 + stripe + n;
    if (base < 0.25) return 0;
    const edgeFade = 1 - Math.pow(Math.abs(d - 0.5) * 2, 1.5) * 0.6;
    return Math.max(0, Math.min(1, base)) * edgeFade;
  },
  grain: {
    scale: 0.09,
    intensity: 0.7,
    particleShape: "angular",
    particleSizeRange: [0.02, 0.25],
  },
  particlesPerStep: 20,
  softness: 0.7,
  pressureTaper: 0.2,
};

// ── 6. Slasher — scharf, energisch, starker Druckverlauf (spitze Enden) ──
const slasher: StretchBrush = {
  name: "slasher",
  label: "Slasher",
  topEdge: (t, seed, noise) => {
    const base = noise.noise2D(t * 10 + seed, 0) * 0.08;
    const spike = noise.noise2D(t * 40 + seed, 1);
    const spikeVal = spike > 0.6 ? (spike - 0.6) * 0.4 : 0;
    return base + spikeVal;
  },
  bottomEdge: (t, seed, noise) => {
    const base = noise.noise2D(t * 10 + seed + 60, 10) * 0.08;
    const spike = noise.noise2D(t * 35 + seed + 60, 11);
    const spikeVal = spike > 0.6 ? (spike - 0.6) * 0.4 : 0;
    return base + spikeVal;
  },
  fillDensity: (t, d, noise, seed) => {
    const center = 1 - Math.pow(Math.abs(d - 0.5) * 2, 2);
    const n = noise.noise2D(t * 20 + seed, d * 15) * 0.12;
    return Math.max(0, center * 0.85 + 0.1 + n);
  },
  grain: {
    scale: 0.04,
    intensity: 0.35,
    particleShape: "rough",
    particleSizeRange: [0.03, 0.15],
  },
  particlesPerStep: 24,
  softness: 0.2,
  pressureTaper: 0.7,
};

// ── 7. Doppelspur — Split-Track: bricht in zwei parallele Spuren auf ─────
const doppelspur: StretchBrush = {
  name: "doppelspur",
  label: "Doppelspur",
  topEdge: (t, seed, noise) => noise.noise2D(t * 8 + seed, 0) * 0.06,
  bottomEdge: (t, seed, noise) => noise.noise2D(t * 8 + seed + 50, 10) * 0.06,
  fillDensity: (t, d, noise, seed) => {
    // Zwei Dichte-Peaks (zwei Kontaktpunkte der Kreide-Kante)
    const track1 = Math.exp(-Math.pow((d - 0.28) / 0.1, 2));
    const track2 = Math.exp(-Math.pow((d - 0.72) / 0.1, 2));
    // Spuren verschmelzen teilweise (Noise-gesteuert)
    const merge = (noise.noise2D(t * 6 + seed, 5) + 1) * 0.5;
    const separation = 0.3 + merge * 0.7;
    const middle =
      (1 - separation) * Math.exp(-Math.pow((d - 0.5) / 0.2, 2));
    const density = (track1 + track2) * separation + middle;
    const n = noise.noise2D(t * 30 + seed, d * 20) * 0.15;
    return Math.min(1, Math.max(0, density + n)) * 0.75;
  },
  grain: {
    scale: 0.04,
    intensity: 0.25,
    particleShape: "rough",
    particleSizeRange: [0.03, 0.12],
  },
  particlesPerStep: 20,
  softness: 0.3,
  pressureTaper: 0.5,
};

// ── 8. Feine Linie — gleichmäßig dünn, präzise Kante ────────────────────
const feineLinie: StretchBrush = {
  name: "feine_linie",
  label: "Feine Linie",
  topEdge: (t, seed, noise) => noise.noise2D(t * 12 + seed, 0) * 0.02,
  bottomEdge: (t, seed, noise) => noise.noise2D(t * 12 + seed + 40, 10) * 0.02,
  fillDensity: (t, d, noise, seed) => {
    const core = Math.exp(-Math.pow((d - 0.5) / 0.08, 2));
    const n = noise.noise2D(t * 40 + seed, d * 10) * 0.1;
    // Gelegentliche winzige Lücken (Kreide hebt kurz ab)
    const gap = noise.noise2D(t * 80 + seed + 20, 0);
    if (gap > 0.85) return 0;
    return Math.max(0, core * 0.9 + n);
  },
  grain: {
    scale: 0.03,
    intensity: 0.12,
    particleShape: "round",
    particleSizeRange: [0.02, 0.06],
  },
  particlesPerStep: 12,
  softness: 0.05,
  pressureTaper: 0.15,
};

export const STRETCH_BRUSHES: Record<DrawBrush, StretchBrush> = {
  verite,
  grindhouse,
  heist,
  biopic,
  spaghetti_western: spaghettiWestern,
  slasher,
  doppelspur,
  feine_linie: feineLinie,
};

/** Stabile Reihenfolge für die Brush-Auswahl in der Toolbar. */
export const STRETCH_BRUSH_ORDER: DrawBrush[] = [
  "verite",
  "grindhouse",
  "heist",
  "biopic",
  "spaghetti_western",
  "slasher",
  "doppelspur",
  "feine_linie",
];
