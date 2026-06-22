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
  count: number; // 1–15, Anzahl Hintergrund-Striche
  noise: number; // 0–1, Pfad-Wackeln
  weight: number; // 5–120, Strichstärke (Basis)
  opacity: number; // 10–100 (%)
  direction: number; // 0–360 (°), Hauptrichtung
  spread: number; // 0–1, Streuung um die Hauptrichtung
  seed: number;
}

/**
 * Ein generierter Hintergrund-Kreidestrich (Tafel-Muster). Anders als der
 * fette/freihand `ChalkStroke` ist dies eine reine Render-Datenstruktur ohne
 * Transform/Interaktion — wird aus `PatternConfig` erzeugt und mit körniger
 * Kreide-Textur gezeichnet (siehe `lib/chalkBackground`).
 */
export interface PatternStroke {
  id: string; // stabile ID (für Auswahl/Drag); pro Regenerierung neu vergeben
  points: Array<{ x: number; y: number }>; // Pfad in % (0–100)
  weight: number; // tatsächliche Stärke (mit Variation)
  opacity: number; // tatsächliche Deckkraft 0–1 (mit Variation)
  seed: number; // Textur-Seed
  offsetX: number; // Verschiebung in % (Drag), Default 0
  offsetY: number;
}

/** Werkzeug-Modus: Elemente verschieben vs. Freihand zeichnen. */
export type ToolMode = "move" | "draw";

/**
 * Pinsel-Typ für das Freihand-Zeichnen. Die Profile (Stretch Brushes, Nachbau
 * der Figma "Outload Brushes") liegen in `lib/stretchBrush` als
 * `STRETCH_BRUSHES`.
 */
export type DrawBrush =
  | "verite" // Realistische Kreide — sauber, leicht körnig
  | "grindhouse" // Rau, körnig, distressed
  | "heist" // Bold, kräftig, hohe Deckung
  | "biopic" // Smooth, elegant, feine Textur
  | "spaghetti_western" // Wild, streifig, extrem rau
  | "slasher" // Scharf, energisch, spitze Enden
  | "doppelspur" // Split-Track — bricht in zwei parallele Spuren auf
  | "feine_linie"; // Gleichmäßig dünn, präzise Kante

export type StrokeScheme =
  | "cross"
  | "diagonal"
  | "fan"
  | "slash"
  | "frame"
  | "random";

/**
 * Ein fetter Kreide-Strich — entweder generativ erzeugt oder freihand
 * gezeichnet. Wird einzeln gespeichert, damit er verschoben/rotiert/skaliert
 * werden kann.
 */
export interface ChalkStroke {
  id: string;
  // Pfad als Punktkette (relativ zum Poster in %)
  points: Array<{ x: number; y: number }>;
  weight: number; // 30–100 (Pixel bei Basis-Postergröße)
  opacity: number; // 0.5–1.0
  color: string; // Kreide-Farbe (Hex)
  brushType: DrawBrush; // Pinsel-Profil
  seed: number; // Für reproduzierbare Textur
  // Transform (für Verschieben/Rotieren/Skalieren)
  offsetX: number; // Verschiebung in %
  offsetY: number;
  rotation: number; // Grad
  scale: number; // 0.5–2.0
  isGenerated: boolean; // true = generiert, false = freihand
  zIndex: number;
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
  | "logos"
  | "shapes" // Formen: gerissenes Papier & Linien/Trenner (weiß-auf-transparent SVG, tintbar)
  | "strokes"; // Echte Kreide-Stroke-Stamps (weiß-auf-transparent PNG)

export interface AssetItem {
  id: string;
  name: string;
  category: AssetCategory;
  src: string; // Import-Pfad (URL)
  defaultScale: number; // Empfohlene Startgröße (0.1–1.0 relativ zum Poster)
  anchor: "center" | "top" | "bottom" | "corner"; // Für Smart Placement
  naturalWidth?: number; // Nur Stroke-Stamps: Originalmaße fürs Seitenverhältnis
  naturalHeight?: number;
  // Nur hochgeladene Fotos: Original-URL (für erneutes Kreide-Verarbeiten) und
  // die aktuell angewandten Kreide-Filter-Parameter. `src` zeigt dann auf die
  // verarbeitete Data-URL (bzw. = originalSrc, wenn der Filter aus ist).
  originalSrc?: string;
  chalk?: ChalkAssetSettings;
}

/** Kreide-Filter-Einstellungen eines hochgeladenen Fotos. */
export interface ChalkAssetSettings {
  enabled: boolean; // Filter an/aus (aus = Originalfoto)
  contrast: number; // 0.5–2.5
  brightness: number; // -0.3–0.3
  threshold: number; // 0 = weiche Schattierung, >0 = harter Cutout
}

export interface PlacedAsset {
  id: string; // Unique ID
  assetId: string; // Referenz auf AssetItem
  x: number; // Position in % (0–100)
  y: number; // Position in % (0–100)
  scale: number; // Skalierung / Länge (0.05–2.0)
  rotation: number; // Grad (0–360)
  opacity: number; // 0–1
  flipX: boolean; // Horizontal spiegeln
  zIndex: number; // Ebene
  // Freies Stretchen (per Maus-Griffe): horizontaler/vertikaler Streckfaktor
  // zusätzlich zur Basis-Größe `scale` (Default je 1).
  scaleX?: number; // Horizontaler Streckfaktor (Default 1)
  scaleY?: number; // Vertikaler Streckfaktor / Strichstärke (Default 1)
  flipY?: boolean; // Vertikal spiegeln
  tint?: string; // Kreide-Farbe (Hex); leer = weiß
}

export interface PosterState {
  size: PosterSize;
  pattern: PatternConfig;
  header: TextElement;
  sub: TextElement;
  body: TextElement;
  detail: TextElement;
}
