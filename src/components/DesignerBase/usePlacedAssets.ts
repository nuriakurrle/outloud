import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { AssetCategory, AssetItem, PlacedAsset, Position } from "../../types/poster";
import type { ChalkifyOptions } from "../../lib/chalkifyImage";
import { chalkifyImage, DEFAULT_CHALKIFY } from "../../lib/chalkifyImage";
import { smartPlace } from "../../lib/smartPlace";

const isMaskAsset = (cat: string) => cat === "strokes" || cat === "shapes";
const isDefaultWhite = (c: string) => c.toLowerCase() === "#ffffff";
const makeId = () => crypto.randomUUID();

interface Options {
  logoRegistry: AssetItem[];
  illustrationRegistry: AssetItem[];
  storageKey: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  positionsRef: React.RefObject<Record<string, Position>>;
  commit: () => void;
  clampX: (v: number) => number;
  clampY: (v: number) => number;
  aspectRatio: number;
  chalkColor: string;
  onBuildNewAsset?: (item: AssetItem) => Partial<PlacedAsset>;
  initialAssets?: PlacedAsset[];
}

export function usePlacedAssets({
  logoRegistry,
  illustrationRegistry,
  storageKey,
  containerRef,
  positionsRef,
  commit,
  clampX,
  clampY,
  aspectRatio,
  chalkColor,
  onBuildNewAsset,
  initialAssets,
}: Options) {
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>(initialAssets ?? []);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [customAssets, setCustomAssets] = useState<AssetItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(customAssets)); } catch { /* quota */ }
  }, [customAssets, storageKey]);

  const imgRatios = useRef<Map<string, number>>(new Map());

  const logoAssets = useMemo(
    () => [...logoRegistry, ...customAssets.filter(a => a.category === "logos")],
    [logoRegistry, customAssets]
  );
  const illustrationAssets = useMemo(
    () => [...illustrationRegistry, ...customAssets.filter(a => a.category !== "logos")],
    [illustrationRegistry, customAssets]
  );
  const allAssets = useMemo(() => [...logoAssets, ...illustrationAssets], [logoAssets, illustrationAssets]);

  const getAssetSrc = useCallback((id: string) => allAssets.find(a => a.id === id)?.src ?? "", [allAssets]);

  const handlePlace = useCallback((assetId: string) => {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;
    const existing = [
      ...Object.values(positionsRef.current),
      ...placedAssets.map(p => ({ x: p.x, y: p.y })),
    ];
    const rawPos = smartPlace(asset, existing, aspectRatio);
    const pos = { x: clampX(rawPos.x), y: clampY(rawPos.y) };
    const maxZ = placedAssets.reduce((m, p) => Math.max(m, p.zIndex), 0);
    const id = makeId();
    const isMask = isMaskAsset(asset.category);
    const extra = onBuildNewAsset?.(asset) ?? {};
    setPlacedAssets(prev => [
      ...prev,
      {
        id, assetId, x: pos.x, y: pos.y,
        scale: asset.defaultScale, rotation: 0, opacity: 1, flipX: false, zIndex: maxZ + 1,
        ...(isMask ? { scaleY: 1, flipY: false, tint: isDefaultWhite(chalkColor) ? undefined : chalkColor } : {}),
        ...extra,
      },
    ]);
    setSelectedAssetId(id);
  }, [allAssets, placedAssets, positionsRef, aspectRatio, clampX, clampY, chalkColor, onBuildNewAsset]);

  const handleDragPlace = useCallback((assetId: string, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    const x = clampX(((clientX - rect.left) / rect.width) * 100);
    const y = clampY(((clientY - rect.top) / rect.height) * 100);
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;
    commit();
    const maxZ = placedAssets.reduce((m, p) => Math.max(m, p.zIndex), 0);
    const id = makeId();
    const isMask = isMaskAsset(asset.category);
    const extra = onBuildNewAsset?.(asset) ?? {};
    setPlacedAssets(prev => [
      ...prev,
      {
        id, assetId, x, y,
        scale: asset.defaultScale, rotation: 0, opacity: 1, flipX: false, zIndex: maxZ + 1,
        ...(isMask ? { scaleY: 1, flipY: false, tint: isDefaultWhite(chalkColor) ? undefined : chalkColor } : {}),
        ...extra,
      },
    ]);
    setSelectedAssetId(id);
  }, [allAssets, placedAssets, containerRef, clampX, clampY, chalkColor, onBuildNewAsset, commit]);

  const handleUpload = useCallback((file: File, category: AssetCategory = "icons") => {
    const url = URL.createObjectURL(file);
    const id = `custom/${makeId()}`;
    const isSvg = /svg/i.test(file.type) || /\.svg$/i.test(file.name);
    const asset: AssetItem = { id, name: file.name.replace(/\.(svg|png|jpe?g)$/i, ""), category, src: url, defaultScale: 0.25, anchor: "center" };
    if (isSvg) { setCustomAssets(prev => [...prev, asset]); return; }
    asset.originalSrc = url;
    asset.chalk = { ...DEFAULT_CHALKIFY, enabled: true };
    setCustomAssets(prev => [...prev, asset]);
    chalkifyImage(url, DEFAULT_CHALKIFY)
      .then(dataUrl => setCustomAssets(prev => prev.map(a => a.id === id ? { ...a, src: dataUrl } : a)))
      .catch(() => {});
  }, []);

  const handleUploadStencil = useCallback((dataUrl: string, name: string, category: AssetCategory = "icons") => {
    setCustomAssets(prev => [
      ...prev,
      { id: `custom/${makeId()}`, name, category, src: dataUrl, defaultScale: 0.25, anchor: "center" } as AssetItem,
    ]);
  }, []);

  const updateAssetChalk = useCallback((assetId: string, patch: Partial<ChalkifyOptions & { enabled: boolean }>) => {
    setCustomAssets(prev => {
      const target = prev.find(a => a.id === assetId);
      if (!target?.originalSrc) return prev;
      const next = { ...DEFAULT_CHALKIFY, enabled: true, ...target.chalk, ...patch };
      if (!next.enabled) return prev.map(a => a.id === assetId ? { ...a, chalk: next, src: a.originalSrc! } : a);
      chalkifyImage(target.originalSrc, next)
        .then(dataUrl => setCustomAssets(cur => cur.map(a => a.id === assetId ? { ...a, src: dataUrl } : a)));
      return prev.map(a => a.id === assetId ? { ...a, chalk: next } : a);
    });
  }, []);

  const updateSelected = useCallback((patch: Partial<PlacedAsset>) => {
    if (!selectedAssetId) return;
    setPlacedAssets(prev => prev.map(a => a.id === selectedAssetId ? { ...a, ...patch } : a));
  }, [selectedAssetId]);

  const deleteSelected = useCallback(() => {
    if (!selectedAssetId) return;
    setPlacedAssets(prev => prev.filter(a => a.id !== selectedAssetId));
    setSelectedAssetId(null);
  }, [selectedAssetId]);

  const handleLayer = useCallback((dir: 1 | -1) => {
    if (!selectedAssetId) return;
    setPlacedAssets(prev => {
      const zs = prev.map(p => p.zIndex);
      const target = dir === 1 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
      return prev.map(a => a.id === selectedAssetId ? { ...a, zIndex: target } : a);
    });
  }, [selectedAssetId]);

  return {
    placedAssets, setPlacedAssets,
    selectedAssetId, setSelectedAssetId,
    selectedAsset: placedAssets.find(a => a.id === selectedAssetId) ?? null,
    customAssets, logoAssets, illustrationAssets, allAssets,
    imgRatios, getAssetSrc,
    handlePlace, handleDragPlace,
    handleUpload, handleUploadStencil,
    updateAssetChalk, updateSelected, deleteSelected, handleLayer,
  };
}
