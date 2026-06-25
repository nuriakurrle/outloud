import type { Position } from "../../types/poster";
import type { Align } from "../../lib/layouts";

type PosKey = "header" | "sub" | "body" | "detail" | "divider";
type TextKey = "header" | "sub" | "body" | "detail";

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
  /** Ausrichtung je Textfeld (Default: zentriert). */
  aligns?: Partial<Record<TextKey, Align>>;
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

  // ── Referenz-Layouts (OUTLOUD / Вголос!-Stil) ──────────────────────────
  // Linksbündig: Logo oben links, Titel/Text linksbündig, Hero-Illustration
  // füllt die Mitte (frei platzierbar), Event-Details unten links.
  {
    id: "event_links",
    name: "Event (Links)",
    hint: "Logo oben links · Titel & Text links · Details unten",
    positions: {
      header: { x: 8, y: 26 },
      sub: { x: 8, y: 35 },
      divider: { x: 50, y: 44 },
      body: { x: 8, y: 42 },
      detail: { x: 8, y: 88 },
    },
    aligns: { header: "left", sub: "left", body: "left", detail: "left" },
    logoSlots: [{ x: 20, y: 12, scale: 0.3 }],
  },
  {
    id: "aufruf",
    name: "Aufruf",
    hint: "Logo oben links · großer Betrag · Aufruf-Text",
    positions: {
      header: { x: 50, y: 40 },
      sub: { x: 8, y: 22 },
      divider: { x: 50, y: 52 },
      body: { x: 8, y: 30 },
      detail: { x: 8, y: 90 },
    },
    aligns: { sub: "left", body: "left", detail: "left" },
    logoSlots: [{ x: 22, y: 12, scale: 0.34 }],
  },
  {
    id: "vs_diskussion",
    name: "VS-Diskussion",
    hint: "Großer Titel links · Logo oben rechts · Details rechts",
    positions: {
      header: { x: 8, y: 18 },
      sub: { x: 8, y: 32 },
      divider: { x: 50, y: 40 },
      body: { x: 8, y: 42 },
      detail: { x: 92, y: 86 },
    },
    aligns: { header: "left", sub: "left", body: "left", detail: "right" },
    logoSlots: [{ x: 82, y: 14, scale: 0.3 }],
  },
];
