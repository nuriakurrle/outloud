import type { AssetItem } from "../types/poster";

type Zone = { x: number; y: number };

const DEFAULT_ZONES: Zone[] = [
  { x: 50, y: 50 },
  { x: 30, y: 40 },
  { x: 70, y: 60 },
  { x: 50, y: 25 },
  { x: 50, y: 75 },
];

const ZONES: Partial<Record<AssetItem["category"], Zone[]>> = {
  portraits: [
    { x: 50, y: 40 },
    { x: 25, y: 45 },
    { x: 75, y: 45 },
  ],
  buildings: [
    { x: 50, y: 60 },
    { x: 30, y: 65 },
    { x: 70, y: 65 },
  ],
  icons: [
    { x: 50, y: 15 },
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 50, y: 75 },
  ],
  ornaments: [
    { x: 15, y: 15 },
    { x: 85, y: 15 },
    { x: 15, y: 85 },
    { x: 85, y: 85 },
    { x: 50, y: 50 },
  ],
  logos: [
    { x: 50, y: 10 },
    { x: 85, y: 10 },
    { x: 15, y: 10 },
    { x: 50, y: 90 },
  ],
};

/**
 * Platziert ein Asset kompositorisch sinnvoll: wählt aus den für den
 * Asset-Typ definierten Zonen jene mit dem größten Abstand zu bereits
 * vorhandenen Elementen und fügt eine leichte Zufallsvariation hinzu.
 */
export function smartPlace(
  asset: AssetItem,
  existingElements: { x: number; y: number }[],
  _posterAspect: number
): { x: number; y: number } {
  const candidates = ZONES[asset.category] ?? DEFAULT_ZONES;

  let bestZone = candidates[0];
  let bestMinDist = -Infinity;

  for (const zone of candidates) {
    let minDist = Infinity;
    for (const el of existingElements) {
      const d = Math.hypot(zone.x - el.x, zone.y - el.y);
      minDist = Math.min(minDist, d);
    }
    if (minDist > bestMinDist) {
      bestMinDist = minDist;
      bestZone = zone;
    }
  }

  const clamp = (v: number) => Math.max(5, Math.min(95, v));
  return {
    x: clamp(bestZone.x + (Math.random() - 0.5) * 6),
    y: clamp(bestZone.y + (Math.random() - 0.5) * 6),
  };
}
