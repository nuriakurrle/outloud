import { useEffect, useRef } from "react";
import type { Position } from "../../types/poster";
import type { Align } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

interface TextOverlayProps {
  id: string;
  text: string;
  font: string;
  size: number;
  weight?: string;
  color: string;
  position: Position;
  align?: Align;
  scale: number;
  width?: number; // explicit width in % — freezes auto-reflow
  opacity?: number;
  dragging: boolean;
  selected?: boolean;
  outline?: boolean;
  isEditing?: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onDoubleClick?: (id: string) => void;
  onEditCommit?: (id: string, text: string) => void;
}

const TRANSFORM: Record<Align, string> = {
  center: "translate(-50%, -50%)",
  left: "translate(0, -50%)",
  right: "translate(-100%, -50%)",
};

export function TextOverlay({
  id, text, font, size, weight, color, position,
  align = "center", scale, width, opacity, dragging, selected = false,
  outline = false, isEditing = false,
  onPointerDown, onDoubleClick, onEditCommit,
}: TextOverlayProps) {
  const editRef = useRef<HTMLDivElement>(null);

  // Focus and place caret at end when entering edit mode
  useEffect(() => {
    if (!isEditing || !editRef.current) return;
    const el = editRef.current;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing]);

  const strokeW = Math.max(0.8, size * scale * 0.045);
  const outlineStyle = outline ? {
    color: "transparent",
    WebkitTextFillColor: "transparent",
    WebkitTextStrokeWidth: `${strokeW}px`,
    WebkitTextStrokeColor: color,
    textShadow: "none",
  } : {};

  const sharedStyle: React.CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: TRANSFORM[align],
    textAlign: align,
    fontFamily: `"${font}", sans-serif`,
    fontSize: `${size * scale}px`,
    fontWeight: weight ?? "400",
    color,
    outline: selected || isEditing ? "1.5px dashed rgba(255,255,255,0.7)" : "none",
    outlineOffset: 4,
    pointerEvents: "auto",
    zIndex: 50,
    width: "max-content", // sonst schrumpft die abs. Position (left: x%) die verfügbare Breite → Umbruch mitten im Wort

    ...(width !== undefined ? { width: `${width}%`, maxWidth: "none" } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...outlineStyle,
  };

  if (isEditing) {
    return (
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        className={styles.textEl}
        style={{ ...sharedStyle, cursor: "text", userSelect: "text" }}
        data-design-id={id}
        onBlur={e => onEditCommit?.(id, e.currentTarget.innerText)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onEditCommit?.(id, (e.currentTarget as HTMLDivElement).innerText);
          }
          if (e.key === "Escape") {
            // Discard: restore original text, then commit (no-op since we restore)
            if (editRef.current) editRef.current.innerText = text;
            onEditCommit?.(id, text);
          }
        }}
        onDoubleClick={e => e.stopPropagation()}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      className={`${styles.textEl} ${dragging ? styles.dragging : ""}`}
      style={{ ...sharedStyle, cursor: dragging ? "grabbing" : "grab" }}
      data-design-id={id}
      onPointerDown={e => onPointerDown(id, e)}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(id); }}
    >
      {text}
    </div>
  );
}
