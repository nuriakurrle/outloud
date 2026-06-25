// ── Layout-Presets pro Format ────────────────────────────────────────────
// Jedes Layout definiert die Standard-Positionen aller Elemente (in % des
// Formats) plus empfohlene Defaults (Schriftgrößen, Rahmen, Muster, Striche).
// Nach dem Anwenden kann der Nutzer alles per Drag & Drop verschieben.

export type Align = "center" | "left" | "right";

export interface TextSlot {
  x: number; // % (0–100)
  y: number;
  align: Align;
}

export interface LogoSlot {
  x: number;
  y: number;
  scale: number; // Anteil der Formatbreite
}

export interface LayoutPositions {
  header: TextSlot;
  sub: TextSlot;
  body: TextSlot;
  detail: TextSlot;
  divider: { y: number };
  /** Primärer Logo-Platz (oder null = kein Logo). */
  logo: LogoSlot | null;
  /** Optional mehrere Logo-Plätze (z.B. Sponsoren-Reihe). */
  logoSlots?: LogoSlot[];
}

export interface LayoutDefaults {
  headerSize: number;
  subSize: number;
  bodySize: number;
  detailSize: number;
  borderStyle: string;
  patternStyle: string;
  strokeScheme: string | null;
}

export interface LayoutPreset {
  id: string;
  label: string;
  positions: LayoutPositions;
  defaults: LayoutDefaults;
}

// Kurz-Helfer für Text-Slots
const C = (x: number, y: number): TextSlot => ({ x, y, align: "center" });
const L = (x: number, y: number): TextSlot => ({ x, y, align: "left" });
const R = (x: number, y: number): TextSlot => ({ x, y, align: "right" });

export const LAYOUTS: Record<string, LayoutPreset> = {
  // ── Print (A3/A4) ──────────────────────────────────────────────────────
  classic: {
    id: "classic",
    label: "Klassik",
    positions: {
      header: C(50, 18),
      sub: C(50, 30),
      body: C(50, 52),
      detail: C(50, 88),
      divider: { y: 40 },
      logo: { x: 50, y: 70, scale: 0.34 },
    },
    defaults: {
      headerSize: 52, subSize: 26, bodySize: 18, detailSize: 14,
      borderStyle: "dashed", patternStyle: "flowing", strokeScheme: null,
    },
  },
  centered: {
    id: "centered",
    label: "Zentriert",
    positions: {
      header: C(50, 30),
      sub: C(50, 42),
      body: C(50, 60),
      detail: C(50, 78),
      divider: { y: 50 },
      logo: { x: 50, y: 91, scale: 0.22 },
    },
    defaults: {
      headerSize: 48, subSize: 24, bodySize: 17, detailSize: 13,
      borderStyle: "chalk", patternStyle: "swirls", strokeScheme: null,
    },
  },
  big_poster: {
    id: "big_poster",
    label: "Großes Plakat",
    positions: {
      header: C(50, 15),
      sub: C(50, 27),
      body: C(50, 45),
      detail: C(50, 72),
      divider: { y: 57 },
      logo: { x: 50, y: 90, scale: 0.2 },
      logoSlots: [
        { x: 24, y: 90, scale: 0.2 },
        { x: 76, y: 90, scale: 0.2 },
      ],
    },
    defaults: {
      headerSize: 64, subSize: 28, bodySize: 18, detailSize: 14,
      borderStyle: "double", patternStyle: "topo", strokeScheme: "cross",
    },
  },
  festival: {
    id: "festival",
    label: "Festival",
    positions: {
      header: C(50, 34),
      sub: C(50, 46),
      body: C(50, 64),
      detail: C(50, 82),
      divider: { y: 55 },
      logo: { x: 50, y: 13, scale: 0.3 },
    },
    defaults: {
      headerSize: 60, subSize: 28, bodySize: 18, detailSize: 14,
      borderStyle: "ornament", patternStyle: "flowing", strokeScheme: "fan",
    },
  },
  sponsors: {
    id: "sponsors",
    label: "Sponsoren",
    positions: {
      header: C(50, 16),
      sub: C(50, 27),
      body: C(50, 47),
      detail: C(50, 62),
      divider: { y: 35 },
      logo: { x: 50, y: 85, scale: 0.18 },
      logoSlots: [
        { x: 25, y: 85, scale: 0.18 },
        { x: 50, y: 85, scale: 0.18 },
        { x: 75, y: 85, scale: 0.18 },
      ],
    },
    defaults: {
      headerSize: 50, subSize: 24, bodySize: 16, detailSize: 13,
      borderStyle: "dashed", patternStyle: "scattered", strokeScheme: null,
    },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    positions: {
      header: C(50, 44),
      sub: C(50, 56),
      body: C(50, 72),
      detail: C(50, 88),
      divider: { y: 64 },
      logo: { x: 50, y: 17, scale: 0.26 },
    },
    defaults: {
      headerSize: 56, subSize: 24, bodySize: 16, detailSize: 13,
      borderStyle: "none", patternStyle: "none", strokeScheme: null,
    },
  },

  // ── Instagram Post (1080×1080) ──────────────────────────────────────────
  social_centered: {
    id: "social_centered",
    label: "Zentriert",
    positions: {
      header: C(50, 30),
      sub: C(50, 42),
      body: C(50, 58),
      detail: C(50, 82),
      divider: { y: 70 },
      logo: { x: 50, y: 14, scale: 0.15 },
    },
    defaults: {
      headerSize: 72, subSize: 36, bodySize: 22, detailSize: 18,
      borderStyle: "dashed", patternStyle: "flowing", strokeScheme: null,
    },
  },
  social_bold: {
    id: "social_bold",
    label: "Bold",
    positions: {
      header: C(50, 45),
      sub: C(50, 60),
      body: C(50, 75),
      detail: C(50, 90),
      divider: { y: 68 },
      logo: { x: 50, y: 12, scale: 0.12 },
    },
    defaults: {
      headerSize: 96, subSize: 28, bodySize: 20, detailSize: 16,
      borderStyle: "none", patternStyle: "none", strokeScheme: "cross",
    },
  },
  social_minimal: {
    id: "social_minimal",
    label: "Minimal",
    positions: {
      header: C(50, 42),
      sub: C(50, 54),
      body: C(50, 68),
      detail: C(50, 86),
      divider: { y: 60 },
      logo: { x: 50, y: 16, scale: 0.13 },
    },
    defaults: {
      headerSize: 80, subSize: 30, bodySize: 20, detailSize: 16,
      borderStyle: "none", patternStyle: "scattered", strokeScheme: null,
    },
  },
  social_type: {
    id: "social_type",
    label: "Typo",
    positions: {
      header: L(12, 30),
      sub: L(12, 46),
      body: L(12, 60),
      detail: L(12, 86),
      divider: { y: 72 },
      logo: { x: 86, y: 14, scale: 0.13 },
    },
    defaults: {
      headerSize: 100, subSize: 32, bodySize: 22, detailSize: 18,
      borderStyle: "none", patternStyle: "topo", strokeScheme: "slash",
    },
  },

  // ── Instagram Story (1080×1920) ─────────────────────────────────────────
  story_hero: {
    id: "story_hero",
    label: "Hero",
    positions: {
      header: C(50, 28),
      sub: C(50, 38),
      body: C(50, 52),
      detail: C(50, 84),
      divider: { y: 70 },
      logo: { x: 50, y: 12, scale: 0.16 },
    },
    defaults: {
      headerSize: 110, subSize: 42, bodySize: 26, detailSize: 22,
      borderStyle: "dashed", patternStyle: "flowing", strokeScheme: null,
    },
  },
  story_split: {
    id: "story_split",
    label: "Split",
    positions: {
      header: C(50, 38),
      sub: C(50, 48),
      body: C(50, 62),
      detail: C(50, 88),
      divider: { y: 55 },
      logo: { x: 50, y: 14, scale: 0.16 },
    },
    defaults: {
      headerSize: 96, subSize: 38, bodySize: 24, detailSize: 20,
      borderStyle: "chalk", patternStyle: "swirls", strokeScheme: "diagonal",
    },
  },
  story_minimal: {
    id: "story_minimal",
    label: "Minimal",
    positions: {
      header: C(50, 44),
      sub: C(50, 54),
      body: C(50, 66),
      detail: C(50, 88),
      divider: { y: 60 },
      logo: { x: 50, y: 14, scale: 0.14 },
    },
    defaults: {
      headerSize: 100, subSize: 38, bodySize: 24, detailSize: 20,
      borderStyle: "none", patternStyle: "none", strokeScheme: null,
    },
  },

  // ── Facebook Event (1920×1005) ──────────────────────────────────────────
  banner_centered: {
    id: "banner_centered",
    label: "Zentriert",
    positions: {
      header: C(50, 34),
      sub: C(50, 52),
      body: C(50, 68),
      detail: C(50, 86),
      divider: { y: 60 },
      logo: { x: 50, y: 14, scale: 0.12 },
    },
    defaults: {
      headerSize: 120, subSize: 42, bodySize: 26, detailSize: 22,
      borderStyle: "dashed", patternStyle: "flowing", strokeScheme: null,
    },
  },
  banner_split: {
    id: "banner_split",
    label: "Split",
    positions: {
      header: L(8, 38),
      sub: L(8, 56),
      body: L(8, 72),
      detail: R(92, 50),
      divider: { y: 88 },
      logo: { x: 88, y: 22, scale: 0.16 },
    },
    defaults: {
      headerSize: 110, subSize: 40, bodySize: 26, detailSize: 22,
      borderStyle: "none", patternStyle: "topo", strokeScheme: "slash",
    },
  },

  // ── Ticket (600×200) ────────────────────────────────────────────────────
  ticket_classic: {
    id: "ticket_classic",
    label: "Klassisch",
    positions: {
      header: L(35, 35),
      sub: L(35, 55),
      body: L(35, 75),
      detail: R(82, 50),
      divider: { y: 90 },
      logo: { x: 10, y: 50, scale: 0.3 },
    },
    defaults: {
      headerSize: 28, subSize: 16, bodySize: 12, detailSize: 14,
      borderStyle: "dashed", patternStyle: "scattered", strokeScheme: null,
    },
  },
  ticket_minimal: {
    id: "ticket_minimal",
    label: "Minimal",
    positions: {
      header: L(8, 32),
      sub: L(8, 56),
      body: L(8, 78),
      detail: R(94, 50),
      divider: { y: 92 },
      logo: null,
    },
    defaults: {
      headerSize: 30, subSize: 15, bodySize: 11, detailSize: 13,
      borderStyle: "none", patternStyle: "none", strokeScheme: null,
    },
  },

  // ── Wandschild (400×300) ────────────────────────────────────────────────
  label_centered: {
    id: "label_centered",
    label: "Zentriert",
    positions: {
      header: C(50, 30),
      sub: C(50, 48),
      body: C(50, 64),
      detail: C(50, 86),
      divider: { y: 56 },
      logo: { x: 50, y: 12, scale: 0.18 },
    },
    defaults: {
      headerSize: 40, subSize: 22, bodySize: 16, detailSize: 16,
      borderStyle: "chalk", patternStyle: "flowing", strokeScheme: null,
    },
  },

  // ── Animation (Quadrat / Story) ─────────────────────────────────────────
  anim_strokes: {
    id: "anim_strokes",
    label: "Striche",
    positions: {
      header: C(50, 40),
      sub: C(50, 54),
      body: C(50, 68),
      detail: C(50, 86),
      divider: { y: 62 },
      logo: { x: 50, y: 14, scale: 0.14 },
    },
    defaults: {
      headerSize: 84, subSize: 34, bodySize: 22, detailSize: 18,
      borderStyle: "none", patternStyle: "none", strokeScheme: "fan",
    },
  },
  anim_pattern: {
    id: "anim_pattern",
    label: "Muster",
    positions: {
      header: C(50, 38),
      sub: C(50, 52),
      body: C(50, 66),
      detail: C(50, 86),
      divider: { y: 60 },
      logo: { x: 50, y: 14, scale: 0.14 },
    },
    defaults: {
      headerSize: 80, subSize: 32, bodySize: 22, detailSize: 18,
      borderStyle: "dashed", patternStyle: "swirls", strokeScheme: null,
    },
  },
  anim_text: {
    id: "anim_text",
    label: "Text",
    positions: {
      header: C(50, 42),
      sub: C(50, 56),
      body: C(50, 70),
      detail: C(50, 88),
      divider: { y: 64 },
      logo: { x: 50, y: 16, scale: 0.13 },
    },
    defaults: {
      headerSize: 96, subSize: 34, bodySize: 22, detailSize: 18,
      borderStyle: "none", patternStyle: "scattered", strokeScheme: null,
    },
  },
  anim_reveal: {
    id: "anim_reveal",
    label: "Reveal",
    positions: {
      header: C(50, 36),
      sub: C(50, 48),
      body: C(50, 62),
      detail: C(50, 88),
      divider: { y: 56 },
      logo: { x: 50, y: 12, scale: 0.15 },
    },
    defaults: {
      headerSize: 104, subSize: 40, bodySize: 24, detailSize: 20,
      borderStyle: "chalk", patternStyle: "flowing", strokeScheme: "diagonal",
    },
  },
};

