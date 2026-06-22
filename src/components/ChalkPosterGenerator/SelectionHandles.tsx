import type { PlacedAsset } from "../../types/poster";

interface SelectionHandlesProps {
  asset: PlacedAsset;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Sichtbare Box des Assets in Anzeige-Pixeln (inkl. scaleX/scaleY). */
  widthPx: number;
  heightPx: number;
  /** Vor dem Ziehen aufrufen → Undo-Snapshot. */
  onStart: () => void;
  onChange: (patch: Partial<PlacedAsset>) => void;
}

const HANDLE = 14; // px

/**
 * On-Canvas-Griffe für das ausgewählte Asset:
 *  - Dreh-Knopf (oben)
 *  - Ecke unten rechts → gleichmäßige Größe (`scale`)
 *  - Kante rechts → horizontal stretchen (`scaleX`)
 *  - Kante unten → vertikal stretchen (`scaleY`)
 *
 * Die Stretch-Kanten projizieren den Mauszeiger auf die lokalen Achsen des
 * (rotierten) Elements, funktionieren also unabhängig von der Rotation.
 */
export function SelectionHandles({
  asset,
  containerRef,
  widthPx,
  heightPx,
  onStart,
  onChange,
}: SelectionHandlesProps) {
  const w = Math.max(8, widthPx);
  const h = Math.max(8, heightPx);

  const centerScreen = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return {
      cx: rect.left + (asset.x / 100) * rect.width,
      cy: rect.top + (asset.y / 100) * rect.height,
    };
  };

  /** Pointer-Vektor relativ zum Mittelpunkt auf die lokalen Achsen projizieren. */
  const project = (ev: PointerEvent, c: { cx: number; cy: number }) => {
    const vx = ev.clientX - c.cx;
    const vy = ev.clientY - c.cy;
    const th = (asset.rotation * Math.PI) / 180;
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    return {
      localX: Math.abs(vx * cos + vy * sin),
      localY: Math.abs(-vx * sin + vy * cos),
      dist: Math.hypot(vx, vy),
    };
  };

  const drag = (
    e: React.PointerEvent,
    onMove: (p: ReturnType<typeof project>) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
    const c = centerScreen();
    const move = (ev: PointerEvent) => onMove(project(ev, c));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const round3 = (v: number) => Math.round(v * 1000) / 1000;

  // Gleichmäßige Größe über die Ecke (radialer Abstand)
  const startResize = (e: React.PointerEvent) => {
    const start = project(e.nativeEvent, centerScreen());
    const startDist = Math.max(1, start.dist);
    const startScale = asset.scale;
    drag(e, (p) =>
      onChange({ scale: round3(clamp(startScale * (p.dist / startDist), 0.05, 2.5)) })
    );
  };

  // Horizontal stretchen (rechte Kante) → scaleX
  const startStretchX = (e: React.PointerEvent) => {
    const startX = asset.scaleX ?? 1;
    drag(e, (p) =>
      onChange({ scaleX: round3(clamp(startX * ((2 * p.localX) / w), 0.1, 6)) })
    );
  };

  // Vertikal stretchen (untere Kante) → scaleY
  const startStretchY = (e: React.PointerEvent) => {
    const startY = asset.scaleY ?? 1;
    drag(e, (p) =>
      onChange({ scaleY: round3(clamp(startY * ((2 * p.localY) / h), 0.1, 6)) })
    );
  };

  // Rotation braucht den vollen Vektor (mit Vorzeichen), daher eigener Drag.
  const beginRotate = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
    const c = centerScreen();
    const move = (ev: PointerEvent) => {
      const ang =
        (Math.atan2(ev.clientY - c.cy, ev.clientX - c.cx) * 180) / Math.PI + 90;
      onChange({ rotation: Math.round((ang + 360) % 360) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
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
        width: w,
        height: h,
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
        onPointerDown={beginRotate}
        style={{
          ...knob,
          left: "50%",
          top: -26 - HANDLE / 2,
          borderRadius: "50%",
          transform: "translateX(-50%)",
          cursor: "grab",
        }}
      />
      {/* Horizontal stretchen (rechte Kante) */}
      <div
        title="Breite ziehen"
        onPointerDown={startStretchX}
        style={{
          ...knob,
          right: -HANDLE / 2,
          top: "50%",
          marginTop: -HANDLE / 2,
          borderRadius: 3,
          cursor: "ew-resize",
        }}
      />
      {/* Vertikal stretchen (untere Kante) */}
      <div
        title="Höhe ziehen"
        onPointerDown={startStretchY}
        style={{
          ...knob,
          bottom: -HANDLE / 2,
          left: "50%",
          marginLeft: -HANDLE / 2,
          borderRadius: 3,
          cursor: "ns-resize",
        }}
      />
      {/* Gleichmäßige Größe (untere rechte Ecke) */}
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
