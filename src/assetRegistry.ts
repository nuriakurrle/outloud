import type { AssetCategory, AssetItem } from "./types/poster";

// Vite scannt den Ordner automatisch und liefert die finalen Asset-URLs.
const svgModules = import.meta.glob("./assets/illustrations/**/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const CATEGORY_DEFAULTS: Record<
  AssetCategory,
  { defaultScale: number; anchor: AssetItem["anchor"] }
> = {
  // defaultScale = Anteil der Posterbreite (z.B. 0.45 = 45% der Breite)
  portraits: { defaultScale: 0.5, anchor: "center" },
  buildings: { defaultScale: 0.6, anchor: "bottom" },
  icons: { defaultScale: 0.2, anchor: "top" },
  ornaments: { defaultScale: 0.3, anchor: "corner" },
  logos: { defaultScale: 0.4, anchor: "top" },
};

const KNOWN_CATEGORIES: AssetCategory[] = [
  "portraits",
  "buildings",
  "icons",
  "ornaments",
  "logos",
];

function prettify(fileName: string): string {
  return fileName
    .replace(/\.svg$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ASSET_REGISTRY: AssetItem[] = Object.entries(svgModules)
  .map(([path, src]) => {
    // path z.B. "./assets/illustrations/icons/star.svg"
    const parts = path.split("/");
    const fileName = parts[parts.length - 1];
    const folder = parts[parts.length - 2] as AssetCategory;
    const category: AssetCategory = KNOWN_CATEGORIES.includes(folder)
      ? folder
      : "logos";
    const defaults = CATEGORY_DEFAULTS[category];
    return {
      id: `${category}/${fileName}`,
      name: prettify(fileName),
      category,
      src,
      defaultScale: defaults.defaultScale,
      anchor: defaults.anchor,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const BY_ID = new Map(ASSET_REGISTRY.map((a) => [a.id, a]));

export function getAsset(assetId: string): AssetItem | undefined {
  return BY_ID.get(assetId);
}
