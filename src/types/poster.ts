export interface Position {
  x: number; // Prozent (0–100)
  y: number; // Prozent (0–100)
}

export interface PosterSize {
  label: string;
  w: number;
  h: number;
}

export interface PatternConfig {
  style: "flowing" | "swirls" | "topo" | "scattered" | "none";
  density: number; // 0–100
  strokeWeight: number; // 1–8
  opacity: number; // 5–100
  seed: number;
}

export interface BorderConfig {
  style: "none" | "dashed" | "double" | "ornament" | "chalk";
  weight: number; // 1–5
}

export interface DividerStyle {
  style: "none" | "line" | "doubleline" | "dots" | "ornament";
}

export interface TextElement {
  text: string;
  font: string;
  size: number;
  weight?: string;
  position: Position;
}

export type AssetCategory =
  | "portraits"
  | "buildings"
  | "icons"
  | "ornaments"
  | "logos";

export interface AssetItem {
  id: string;
  name: string;
  category: AssetCategory;
  src: string; // Import-Pfad (URL)
  defaultScale: number; // Empfohlene Startgröße (0.1–1.0 relativ zum Poster)
  anchor: "center" | "top" | "bottom" | "corner"; // Für Smart Placement
}

export interface PlacedAsset {
  id: string; // Unique ID
  assetId: string; // Referenz auf AssetItem
  x: number; // Position in % (0–100)
  y: number; // Position in % (0–100)
  scale: number; // Skalierung (0.05–2.0)
  rotation: number; // Grad (0–360)
  opacity: number; // 0–1
  flipX: boolean; // Horizontal spiegeln
  zIndex: number; // Ebene
}

export interface PosterState {
  size: PosterSize;
  pattern: PatternConfig;
  border: BorderConfig;
  divider: DividerStyle;
  header: TextElement;
  sub: TextElement;
  body: TextElement;
  detail: TextElement;
  dividerPosition: Position;
}
