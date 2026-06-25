// ── Output-Formate ──────────────────────────────────────────────────────
// Jedes Format hat eigene Dimensionen, Preview-Skalierung und verfügbare
// Layouts/Export-Optionen. Basis für den Format-Selector.

export interface OutputFormat {
  id: string;
  label: string;
  category: "print" | "social" | "event" | "animation";
  width: number;
  height: number;
  previewScale: number;
  animated: boolean;
  exportFormats: string[]; // z.B. ["png"] oder ["png","gif","mp4"]
  layoutPresets: string[];
}

export const FORMATS: OutputFormat[] = [
  // ── Print ──
  {
    id: "poster_a3",
    label: "Poster A3",
    category: "print",
    width: 420,
    height: 594,
    previewScale: 1.2,
    animated: false,
    exportFormats: ["png"],
    layoutPresets: [
      "classic",
      "centered",
      "big_poster",
      "festival",
      "sponsors",
      "minimal",
    ],
  },
  {
    id: "poster_a4",
    label: "Poster A4",
    category: "print",
    width: 297,
    height: 420,
    previewScale: 1.4,
    animated: false,
    exportFormats: ["png"],
    layoutPresets: ["classic", "centered", "minimal"],
  },

  // ── Social Media ──
  {
    id: "instagram_post",
    label: "Instagram Post",
    category: "social",
    width: 1080,
    height: 1080,
    previewScale: 0.55,
    animated: true,
    exportFormats: ["png", "gif"],
    layoutPresets: [
      "social_centered",
      "social_bold",
      "social_minimal",
      "social_type",
    ],
  },
  {
    id: "instagram_story",
    label: "Instagram Story",
    category: "social",
    width: 1080,
    height: 1920,
    previewScale: 0.35,
    animated: true,
    exportFormats: ["png", "gif"],
    layoutPresets: ["story_hero", "story_split", "story_minimal"],
  },
  {
    id: "facebook_event",
    label: "Facebook Event",
    category: "social",
    width: 1920,
    height: 1005,
    previewScale: 0.4,
    animated: false,
    exportFormats: ["png"],
    layoutPresets: ["banner_centered", "banner_split"],
  },

  // ── Event ──
  {
    id: "ticket",
    label: "Eintrittskarte",
    category: "event",
    width: 600,
    height: 200,
    previewScale: 1.0,
    animated: false,
    exportFormats: ["png"],
    layoutPresets: ["ticket_classic", "ticket_minimal"],
  },
  {
    id: "wall_label",
    label: "Wandschild",
    category: "event",
    width: 400,
    height: 300,
    previewScale: 1.0,
    animated: false,
    exportFormats: ["png"],
    layoutPresets: ["label_centered"],
  },

  // ── Animation ──
  {
    id: "animation_square",
    label: "Animation (Quadrat)",
    category: "animation",
    width: 1080,
    height: 1080,
    previewScale: 0.55,
    animated: true,
    exportFormats: ["gif", "mp4"],
    layoutPresets: ["anim_strokes", "anim_pattern", "anim_text"],
  },
  {
    id: "animation_story",
    label: "Animation (Story)",
    category: "animation",
    width: 1080,
    height: 1920,
    previewScale: 0.35,
    animated: true,
    exportFormats: ["gif", "mp4"],
    layoutPresets: ["anim_strokes", "anim_reveal"],
  },
];

export const FORMAT_CATEGORIES: Array<{
  id: OutputFormat["category"];
  label: string;
  icon: string;
}> = [
  { id: "print", label: "Print", icon: "🖨️" },
  { id: "social", label: "Social", icon: "📱" },
  { id: "event", label: "Event", icon: "🎫" },
  { id: "animation", label: "Animation", icon: "🎬" },
];

