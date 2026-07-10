import type { PlacedAsset } from "../../types/poster";

interface SelectionHandlesProps {
  asset: PlacedAsset;
  containerRef: React.RefObject<HTMLDivElement | null>;
  widthPx: number;
  heightPx: number;
  onStart: () => void;
  onChange: (patch: Partial<PlacedAsset>) => void;
}

const H = 10; // handle size px

export function SelectionHandles({ asset, containerRef, widthPx, heightPx, onStart, onChange }: SelectionHandlesProps) {
  const w = Math.max(8, widthPx);
  const h = Math.max(8, heightPx);
  const half = H / 2;

  const centerScreen = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return { cx: rect.left + (asset.x / 100) * rect.width, cy: rect.top + (asset.y / 100) * rect.height };
  };

  const project = (ev: PointerEvent, c: { cx: number; cy: number }) => {
    const vx = ev.clientX - c.cx;
    const vy = ev.clientY - c.cy;
    const th = (asset.rotation * Math.PI) / 180;
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    return { localX: Math.abs(vx * cos + vy * sin), localY: Math.abs(-vx * sin + vy * cos), dist: Math.hypot(vx, vy) };
  };

  const drag = (e: React.PointerEvent, onMove: (p: ReturnType<typeof project>) => void) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
    const c = centerScreen();
    const move = (ev: PointerEvent) => onMove(project(ev, c));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const round3 = (v: number) => Math.round(v * 1000) / 1000;

  const startResize = (e: React.PointerEvent) => {
    const start = project(e.nativeEvent, centerScreen());
    const startDist = Math.max(1, start.dist);
    const startScale = asset.scale;
    drag(e, p => onChange({ scale: round3(clamp(startScale * (p.dist / startDist), 0.05, 2.5)) }));
  };

  const startStretchX = (e: React.PointerEvent) => {
    const startX = asset.scaleX ?? 1;
    drag(e, p => onChange({ scaleX: round3(clamp(startX * ((2 * p.localX) / w), 0.1, 6)) }));
  };

  const startStretchY = (e: React.PointerEvent) => {
    const startY = asset.scaleY ?? 1;
    drag(e, p => onChange({ scaleY: round3(clamp(startY * ((2 * p.localY) / h), 0.1, 6)) }));
  };

  const beginRotate = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
    const c = centerScreen();
    const move = (ev: PointerEvent) => {
      const ang = (Math.atan2(ev.clientY - c.cy, ev.clientX - c.cx) * 180) / Math.PI + 90;
      onChange({ rotation: Math.round((ang + 360) % 360) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const knob = (cursor: string, onPointerDown: (e: React.PointerEvent) => void, pos: React.CSSProperties) => (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute", width: H, height: H,
        background: "#1e1e1e", border: "2px solid rgba(255,255,255,0.85)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)", pointerEvents: "auto", cursor, ...pos,
      }}
    />
  );

  return (
    <div style={{
      position: "absolute", left: `${asset.x}%`, top: `${asset.y}%`,
      width: w, height: h,
      transform: `translate(-50%, -50%) rotate(${asset.rotation}deg)`,
      transformOrigin: "center", zIndex: 9999, pointerEvents: "none",
    }}>
      {/* Selection border */}
      <div style={{ position: "absolute", inset: 0, border: "1.5px dashed rgba(255,255,255,0.7)", pointerEvents: "none" }} />

      {/* Rotation stem + knob */}
      <div style={{ position: "absolute", left: "50%", top: -26, width: 1.5, height: 26, background: "rgba(255,255,255,0.6)", transform: "translateX(-50%)", pointerEvents: "none" }} />
      <div onPointerDown={beginRotate} style={{ position: "absolute", width: H, height: H, left: "50%", top: -26 - half, borderRadius: "50%", background: "#1e1e1e", border: "2px solid rgba(255,255,255,0.85)", boxShadow: "0 1px 4px rgba(0,0,0,0.5)", pointerEvents: "auto", cursor: "grab", transform: "translateX(-50%)" }} />

      {/* 4 corners — proportional resize */}
      {knob("nw-resize", startResize, { left: -half, top: -half })}
      {knob("ne-resize", startResize, { right: -half, top: -half })}
      {knob("sw-resize", startResize, { left: -half, bottom: -half })}
      {knob("se-resize", startResize, { right: -half, bottom: -half })}

      {/* 4 edges — single-axis stretch */}
      {knob("n-resize",  startStretchY, { left: "50%", top: -half,    marginLeft: -half })}
      {knob("s-resize",  startStretchY, { left: "50%", bottom: -half, marginLeft: -half })}
      {knob("e-resize",  startStretchX, { right: -half, top: "50%",   marginTop: -half })}
      {knob("w-resize",  startStretchX, { left: -half,  top: "50%",   marginTop: -half })}
    </div>
  );
}
