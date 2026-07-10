import { useLayoutEffect, useState } from "react";
import type { Align } from "../../types/poster";

interface Props {
  textId: string;
  align: Align;
  positionX: number; // triggers re-measure on drag
  width: number;     // current width in % — triggers re-measure on resize
  containerRef: React.RefObject<HTMLDivElement | null>;
  onStart: () => void;
  onChange: (width: number, x?: number) => void;
}

const H = 10;

export function TextResizeHandles({ textId, align, positionX, width, containerRef, onStart, onChange }: Props) {
  const [box, setBox] = useState<{ left: number; top: number; right: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-design-id="${textId}"]`);
    const cr = containerRef.current?.getBoundingClientRect();
    if (!el || !cr) return;
    const r = el.getBoundingClientRect();
    setBox({ left: r.left - cr.left, top: r.top - cr.top, right: r.right - cr.left, height: r.height });
  }, [textId, positionX, width, containerRef]);

  if (!box) return null;

  const midY = box.top + box.height / 2;

  const startResize = (side: "left" | "right") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
    const cr = containerRef.current!.getBoundingClientRect();
    const startX = e.clientX;
    const { left: bLeft, right: bRight } = box;

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const cw = cr.width;
      if (side === "right") {
        const newW = Math.max(5, ((bRight + delta - bLeft) / cw) * 100);
        const newX = align === "right" ? ((bLeft + (bRight + delta - bLeft)) / cw) * 100 : undefined;
        onChange(newW, newX);
      } else {
        const newLeftPx = bLeft + delta;
        const newW = Math.max(5, ((bRight - newLeftPx) / cw) * 100);
        const newX = align === "left"   ? (newLeftPx / cw) * 100
                   : align === "center" ? ((newLeftPx + (bRight - newLeftPx) / 2) / cw) * 100
                   : undefined;
        onChange(newW, newX);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handle = (x: number, side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    left: x - H / 2,
    top: midY - H / 2,
    width: H,
    height: H,
    background: "var(--color-bg, #fff)",
    border: "1.5px solid var(--color-fg, #000)",
    borderRadius: 2,
    cursor: "ew-resize",
    zIndex: 300,
    pointerEvents: "auto",
    touchAction: "none",
    boxShadow: side === "left" ? "inset 2px 0 0 rgba(0,0,0,0.3)" : "inset -2px 0 0 rgba(0,0,0,0.3)",
  });

  return (
    <>
      <div style={handle(box.left, "left")} onPointerDown={startResize("left")} />
      <div style={handle(box.right, "right")} onPointerDown={startResize("right")} />
    </>
  );
}
