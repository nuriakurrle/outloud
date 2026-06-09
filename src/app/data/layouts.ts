export interface Layout {
  id: string;
  name: string;
  preview: string;
  config: {
    headerPosition: { x: number; y: number };
    subheaderPosition: { x: number; y: number };
    logoPosition: { x: number; y: number };
    logoSize: number;
    imagePosition?: { x: number; y: number; width: number; height: number };
    decorations?: Array<{
      type: 'line' | 'border' | 'corner';
      positions: number[];
    }>;
  };
}

export const layouts: Layout[] = [
  {
    id: "classic-center",
    name: "Classic Center",
    preview: "Center aligned with decorative borders",
    config: {
      headerPosition: { x: 50, y: 35 },
      subheaderPosition: { x: 50, y: 50 },
      logoPosition: { x: 50, y: 15 },
      logoSize: 60,
      decorations: [
        { type: 'border', positions: [10, 10, 90, 90] },
        { type: 'line', positions: [20, 60, 80, 60] },
      ],
    },
  },
  {
    id: "vintage-top",
    name: "Vintage Top",
    preview: "Top-aligned vintage style",
    config: {
      headerPosition: { x: 50, y: 20 },
      subheaderPosition: { x: 50, y: 32 },
      logoPosition: { x: 50, y: 70 },
      logoSize: 80,
      decorations: [
        { type: 'line', positions: [15, 40, 85, 40] },
        { type: 'corner', positions: [10, 10, 90, 90] },
      ],
    },
  },
  {
    id: "split-design",
    name: "Split Design",
    preview: "Divided layout with image space",
    config: {
      headerPosition: { x: 30, y: 30 },
      subheaderPosition: { x: 30, y: 42 },
      logoPosition: { x: 30, y: 15 },
      logoSize: 50,
      imagePosition: { x: 60, y: 25, width: 30, height: 50 },
      decorations: [
        { type: 'line', positions: [50, 10, 50, 90] },
      ],
    },
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    preview: "Clean minimal design",
    config: {
      headerPosition: { x: 50, y: 45 },
      subheaderPosition: { x: 50, y: 55 },
      logoPosition: { x: 20, y: 20 },
      logoSize: 40,
      decorations: [],
    },
  },
  {
    id: "banner-style",
    name: "Banner Style",
    preview: "Banner with decorative elements",
    config: {
      headerPosition: { x: 50, y: 50 },
      subheaderPosition: { x: 50, y: 62 },
      logoPosition: { x: 50, y: 25 },
      logoSize: 70,
      decorations: [
        { type: 'line', positions: [10, 45, 90, 45] },
        { type: 'line', positions: [10, 70, 90, 70] },
      ],
    },
  },
  {
    id: "corner-logo",
    name: "Corner Logo",
    preview: "Logo in corner, centered text",
    config: {
      headerPosition: { x: 50, y: 40 },
      subheaderPosition: { x: 50, y: 60 },
      logoPosition: { x: 85, y: 15 },
      logoSize: 50,
      decorations: [
        { type: 'border', positions: [5, 5, 95, 95] },
      ],
    },
  },
];
