import type { PlacedAsset } from "../../types/poster";

interface SelectionHandlesProps {
  asset: PlacedAsset;
  containerRef: React.RefObject<HTMLDivElement | null>;
  displayW: number;
  displayH: number;
  /** Sichtbares Höhen-/Breitenverhältnis des Assets (inkl. scaleY bei Masken). */
  heightRatio: number;
  /** Vor dem Ziehen aufrufen → Undo-Snapshot. */
  onStart: () => void;
  onChange: (patch: Partial<PlacedAsset>) => void;
}

const HANDLE = 14; // px

/**
 * On-Canvas-Griffe für das ausgewählte Asset: ein Dreh-Knopf (oben) und ein
 * Skalier-Griff (untere rechte Ecke). Die Interaktion rechnet rein über
 * Abstand/Winkel zum Mittelpunkt — dadurch funktioniert sie unabhängig von der
 * exakten Bounding-Box und der aktuellen Rotation.
 */
export function SelectionHandles({
  asset,
  containerRef,
  displayW,
  heightRatio,
  onStart,
  onChange,
}: SelectionHandlesProps) {
  const widthPx = asset.scale * displayW;
  const heightPx = Math.max(8, widthPx * heightRatio);

  /** Bildschirm-Mittelpunkt des Assets (px) zum Start eines Drags. */
  const centerScreen = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return {
      cx: rect.left + (asset.x / 100) * rect.width,
      cy: rect.top + (asset.y / 100) * rect.height,
    };
  };

  const drag = (
    e: React.PointerEvent,
    onMove: (ev: PointerEvent, c: { cx: number; cy: number }) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
    const c = centerScreen();
    const move = (ev: PointerEvent) => onMove(ev, c);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    const c = centerScreen();
    const startDist = Math.max(
      1,
      Math.hypot(e.clientX - c.cx, e.clientY - c.cy)
    );
    const startScale = asset.scale;
    drag(e, (ev, cc) => {
      const dist = Math.hypot(ev.clientX - cc.cx, ev.clientY - cc.cy);
      const next = Math.max(0.05, Math.min(2.5, startScale * (dist / startDist)));
      onChange({ scale: Math.round(next * 1000) / 1000 });
    });
  };

  const startRotate = (e: React.PointerEvent) => {
    drag(e, (ev, cc) => {
      const ang =
        (Math.atan2(ev.clientY - cc.cy, ev.clientX - cc.cx) * 180) / Math.PI + 90;
      onChange({ rotation: Math.round((ang + 360) % 360) });
    });
  };

  const knob: React.CSSProperties = {
    position: "absolute",
    width: HANDLE,
    height: HANDLE,
    background: "#1e1e1e",
    border: "2px solid rgba(255,255,255,0.85)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
    pointerEvents: "auto",
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${asset.x}%`,
        top: `${asset.y}%`,
        width: widthPx,
        height: heightPx,
        transform: `translate(-50%, -50%) rotate(${asset.rotation}deg)`,
        transformOrigin: "center",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* Auswahl-Rahmen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1.5px dashed rgba(255,255,255,0.7)",
          pointerEvents: "none",
        }}
      />
      {/* Dreh-Stiel + Knopf (oben mittig) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -26,
          width: 1.5,
          height: 26,
          background: "rgba(255,255,255,0.6)",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />
      <div
        title="Drehen"
        onPointerDown={startRotate}
        style={{
          ...knob,
          left: "50%",
          top: -26 - HANDLE / 2,
          borderRadius: "50%",
          transform: "translateX(-50%)",
          cursor: "grab",
        }}
      />
      {/* Skalier-Griff (untere rechte Ecke) */}
      <div
        title="Größe ändern"
        onPointerDown={startResize}
        style={{
          ...knob,
          right: -HANDLE / 2,
          bottom: -HANDLE / 2,
          borderRadius: 3,
          cursor: "nwse-resize",
        }}
      />
    </div>
  );
}
