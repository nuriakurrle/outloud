import { useDesignerContext } from "./context";
import type { DesignerCanvasProps } from "./types";
import { TextOverlay } from "../ChalkPosterGenerator/TextOverlay";
import { SelectionHandles } from "../ChalkPosterGenerator/SelectionHandles";
import { DrawingToolbar } from "../ChalkPosterGenerator/DrawingToolbar";
import { useT } from "../../i18n";
import defaultStyles from "../../styles/chalkPoster.module.css";

const isMaskAsset = (cat: string) => cat === "strokes" || cat === "shapes";

export function DesignerCanvas({
  renderBackground,
  textItems,
  displayW,
  displayH: _displayH,
  scale,
  styles = defaultStyles,
}: DesignerCanvasProps) {
  const { t } = useT();
  const {
    placedAssets, selectedAsset, allAssets, imgRatios, getAssetSrc,
    snapLines, dragging, selectedStrokeId, selectedTextId,
    containerRef, commit, updateSelected, deleteSelected, deleteSelectedStroke, deleteText,
    mode, brushName, setBrushName, brushWidth, setBrushWidth,
    brushOpacity, setBrushOpacity, chalkColor, setChalkColor, setMode,
    cursorPos, liveStrokePath: _liveStrokePath,
    canUndo, canRedo, undo, redo,
    handleAssetPointerDown, handlePointerDown,
    handleDrawStart, handleDrawMove, handleDrawEnd, handleDrawLeave,
    editingTextId, handleTextDoubleClick, handleTextEditCommit,
  } = useDesignerContext();

  // ── Overlays rendered inside the background wrapper ───────────
  const overlays = (
    <>
      {/* Snap lines */}
      {snapLines.length > 0 && (
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 80, overflow: "visible" }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {snapLines.map((l, i) =>
            l.x !== undefined
              ? <line key={i} x1={l.x} y1={0} x2={l.x} y2={100} style={{ stroke: "var(--snap-guide)" }} strokeWidth={0.4} strokeDasharray="2 1.5" />
              : <line key={i} x1={0} y1={l.y} x2={100} y2={l.y!} style={{ stroke: "var(--snap-guide)" }} strokeWidth={0.4} strokeDasharray="2 1.5" />
          )}
        </svg>
      )}

      {/* Placed assets */}
      {[...placedAssets].sort((a, b) => a.zIndex - b.zIndex).map(asset => {
        const item = allAssets.find(a => a.id === asset.assetId);
        if (item && isMaskAsset(item.category)) {
          const nw = item.naturalWidth ?? 1;
          const nh = item.naturalHeight ?? 1;
          const widthPx = asset.scale * displayW;
          const heightPx = widthPx * (nh / nw);
          const stretchX = asset.scaleX ?? 1;
          const stretchY = asset.scaleY ?? 1;
          const mask = `url("${item.src}")`;
          return (
            <div
              key={asset.id}
              data-design-id={asset.id}
              onPointerDown={e => handleAssetPointerDown(asset.id, e)}
              style={{
                position: "absolute", left: `${asset.x}%`, top: `${asset.y}%`,
                width: `${widthPx}px`, height: `${heightPx}px`,
                transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${(asset.flipX ? -1 : 1) * stretchX}, ${(asset.flipY ? -1 : 1) * stretchY})`,
                transformOrigin: "center", opacity: asset.opacity, zIndex: asset.zIndex,
                background: asset.tint || "var(--mask-tint)",
                WebkitMaskImage: mask, maskImage: mask,
                WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                cursor: dragging === asset.id ? "grabbing" : "grab",
                outline: "none", outlineOffset: "4px", pointerEvents: "auto", userSelect: "none",
              }}
            />
          );
        }
        return (
          <img
            key={asset.id}
            data-design-id={asset.id}
            src={getAssetSrc(asset.assetId)}
            alt=""
            draggable={false}
            onLoad={e => {
              const im = e.currentTarget;
              if (im.naturalWidth > 0) imgRatios.current.set(asset.assetId, im.naturalHeight / im.naturalWidth);
            }}
            onPointerDown={e => handleAssetPointerDown(asset.id, e)}
            style={{
              position: "absolute", left: `${asset.x}%`, top: `${asset.y}%`,
              width: `${asset.scale * displayW}px`, height: "auto",
              transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${(asset.flipX ? -1 : 1) * (asset.scaleX ?? 1)}, ${asset.scaleY ?? 1})`,
              transformOrigin: "center", opacity: asset.opacity, zIndex: asset.zIndex,
              cursor: dragging === asset.id ? "grabbing" : "grab",
              outline: "none", outlineOffset: "4px", pointerEvents: "auto", userSelect: "none",
            }}
          />
        );
      })}

      {/* Selection handles for selected asset */}
      {selectedAsset && (() => {
        const it = allAssets.find(x => x.id === selectedAsset.assetId);
        const baseRatio = it && isMaskAsset(it.category) && it.naturalWidth
          ? it.naturalHeight! / it.naturalWidth
          : imgRatios.current.get(selectedAsset.assetId) ?? (it?.naturalWidth && it?.naturalHeight ? it.naturalHeight / it.naturalWidth : 1);
        const baseW = selectedAsset.scale * displayW;
        return (
          <SelectionHandles
            asset={selectedAsset}
            containerRef={containerRef}
            widthPx={baseW * (selectedAsset.scaleX ?? 1)}
            heightPx={baseW * baseRatio * (selectedAsset.scaleY ?? 1)}
            onStart={commit}
            onChange={updateSelected}
          />
        );
      })()}

      {/* Trash button */}
      {(selectedAsset || selectedStrokeId || selectedTextId) && (
        <button
          data-no-chalk
          onClick={() => {
            if (selectedAsset) { commit(); deleteSelected(); }
            else if (selectedStrokeId) deleteSelectedStroke();
            else if (selectedTextId) deleteText();
          }}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 200,
            background: "var(--surface-panel)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)", color: "var(--btn-danger-text)", width: 28, height: 28,
            cursor: "pointer", fontSize: 14, display: "flex",
            alignItems: "center", justifyContent: "center", pointerEvents: "auto",
          }}
          title={t.deleteLabel}
        >
          🗑
        </button>
      )}

      {/* Text overlays */}
      {textItems.map(item => (
        <TextOverlay
          key={item.key}
          id={item.key}
          text={item.text}
          font={item.font}
          size={item.size}
          weight={item.weight}
          color={item.color}
          align={item.align}
          outline={item.outline}
          position={item.position}
          scale={scale}
          dragging={dragging === item.key}
          selected={selectedTextId === item.key}
          isEditing={editingTextId === item.key}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleTextDoubleClick}
          onEditCommit={handleTextEditCommit}
        />
      ))}

      {/* Draw capture */}
      {mode === "draw" && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 61, pointerEvents: "auto", cursor: "none", touchAction: "none" }}
          onPointerDown={handleDrawStart}
          onPointerMove={handleDrawMove}
          onPointerUp={handleDrawEnd}
          onPointerLeave={handleDrawLeave}
        />
      )}
    </>
  );

  return (
    <>
      {renderBackground(overlays)}

      {/* Chalk cursor */}
      {mode === "draw" && cursorPos && (
        <div
          className={styles.drawCursor}
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: brushWidth * 20 * scale,
            height: brushWidth * 20 * scale,
            borderColor: `${chalkColor}88`,
            borderStyle: "solid",
          }}
        />
      )}

      <DrawingToolbar
        mode={mode} setMode={setMode}
        chalkColor={chalkColor} setChalkColor={setChalkColor}
        brushName={brushName} setBrushName={setBrushName}
        brushWidth={brushWidth} setBrushWidth={setBrushWidth}
        brushOpacity={brushOpacity} setBrushOpacity={setBrushOpacity}
        onUndo={undo} canUndo={canUndo}
        onRedo={redo} canRedo={canRedo}
      />

      <p className={styles.previewHint}>
        {mode === "draw" ? t.hintDraw : t.hintMove}
      </p>
    </>
  );
}
