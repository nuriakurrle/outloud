import type { Position } from "../../types/poster";

type PosKey = "header" | "sub" | "body" | "detail" | "divider";

export interface LogoSlot {
  x: number; // Position in % (0–100)
  y: number;
  scale: number; // Anteil der Posterbreite
}

export interface PosterLayout {
  id: string;
  name: string;
  /** Kurze Beschreibung für das Mini-Vorschau-Layout */
  hint: string;
  positions: Record<PosKey, Position>;
  /** Logo-Plätze – werden der Reihe nach mit den vorhandenen Logos gefüllt */
  logoSlots: LogoSlot[];
}

/**
 * Vordefinierte Kompositionen im Kreide-Plakat-Stil.
 * Jedes Layout ordnet Texte an und platziert die vorhandenen Logos
 * an kompositorisch sinnvollen Stellen.
 */
export const LAYOUTS: PosterLayout[] = [
  {
    id: "klassik",
    name: "Klassik",
    hint: "Titel oben · Logo über den Details",
    positions: {
      header: { x: 50, y: 18 },
      sub: { x: 50, y: 30 },
      divider: { x: 50, y: 40 },
      body: { x: 50, y: 52 },
      detail: { x: 50, y: 88 },
    },
    logoSlots: [{ x: 50, y: 70, scale: 0.34 }],
  },
  {
    id: "zentriert",
    name: "Zentriert",
    hint: "Kompakt gestapelt · kleines Logo unten",
    positions: {
      header: { x: 50, y: 30 },
      sub: { x: 50, y: 42 },
      divider: { x: 50, y: 50 },
      body: { x: 50, y: 60 },
      detail: { x: 50, y: 78 },
    },
    logoSlots: [{ x: 50, y: 91, scale: 0.22 }],
  },
  {
    id: "plakat",
    name: "Großes Plakat",
    hint: "Titel hoch · zwei Logos in den Ecken",
    positions: {
      header: { x: 50, y: 15 },
      sub: { x: 50, y: 27 },
      body: { x: 50, y: 45 },
      divider: { x: 50, y: 57 },
      detail: { x: 50, y: 72 },
    },
    logoSlots: [
      { x: 24, y: 90, scale: 0.2 },
      { x: 76, y: 90, scale: 0.2 },
    ],
  },
  {
    id: "festival",
    name: "Festival",
    hint: "Logo oben · Inhalt in der Mitte",
    positions: {
      header: { x: 50, y: 34 },
      sub: { x: 50, y: 46 },
      divider: { x: 50, y: 55 },
      body: { x: 50, y: 64 },
      detail: { x: 50, y: 82 },
    },
    logoSlots: [{ x: 50, y: 13, scale: 0.3 }],
  },
  {
    id: "sponsoren",
    name: "Sponsoren",
    hint: "Inhalt oben · Logo-Reihe unten",
    positions: {
      header: { x: 50, y: 16 },
      sub: { x: 50, y: 27 },
      divider: { x: 50, y: 35 },
      body: { x: 50, y: 47 },
      detail: { x: 50, y: 62 },
    },
    logoSlots: [
      { x: 25, y: 85, scale: 0.18 },
      { x: 50, y: 85, scale: 0.18 },
      { x: 75, y: 85, scale: 0.18 },
    ],
  },
  {
    id: "minimal",
    name: "Minimal",
    hint: "Logo oben · großer Titel · Datum unten",
    positions: {
      header: { x: 50, y: 44 },
      sub: { x: 50, y: 56 },
      divider: { x: 50, y: 64 },
      body: { x: 50, y: 72 },
      detail: { x: 50, y: 88 },
    },
    logoSlots: [{ x: 50, y: 17, scale: 0.26 }],
  },
];
