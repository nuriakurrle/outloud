import type { AssetCategory, AssetItem } from "./types/poster";

const logoModules = import.meta.glob("../assets/logo/**/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const svgModules = import.meta.glob("./assets/illustrations/**/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ILLUSTRATION_CATEGORY_DEFAULTS: Partial<Record<AssetCategory, { defaultScale: number; anchor: AssetItem["anchor"] }>> = {
  portraits: { defaultScale: 0.5, anchor: "center" },
  buildings: { defaultScale: 0.6, anchor: "bottom" },
  icons: { defaultScale: 0.2, anchor: "top" },
  ornaments: { defaultScale: 0.3, anchor: "corner" },
};

const KNOWN_ILLUSTRATION_CATEGORIES: AssetCategory[] = [
  "portraits",
  "buildings",
  "icons",
  "ornaments",
];

function prettify(fileName: string): string {
  return fileName
    .replace(/\.svg$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const LOGO_REGISTRY: AssetItem[] = Object.entries(logoModules)
  .map(([path, src]) => {
    const fileName = path.split("/").pop()!;
    return {
      id: `logos/${fileName}`,
      name: prettify(fileName),
      category: "logos" as AssetCategory,
      src,
      defaultScale: 0.35,
      anchor: "top" as AssetItem["anchor"],
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const ASSET_REGISTRY: AssetItem[] = Object.entries(svgModules)
  .map(([path, src]) => {
    const parts = path.split("/");
    const fileName = parts[parts.length - 1];
    const folder = parts[parts.length - 2] as AssetCategory;
    const category: AssetCategory = KNOWN_ILLUSTRATION_CATEGORIES.includes(folder)
      ? folder
      : "icons";
    const defaults = ILLUSTRATION_CATEGORY_DEFAULTS[category] ?? { defaultScale: 0.25, anchor: "center" as AssetItem["anchor"] };
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

const BY_ID = new Map([...LOGO_REGISTRY, ...ASSET_REGISTRY].map((a) => [a.id, a]));

export function getAsset(assetId: string): AssetItem | undefined {
  return BY_ID.get(assetId);
}
