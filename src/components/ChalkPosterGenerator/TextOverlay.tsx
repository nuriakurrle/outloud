import type { Position } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

interface TextOverlayProps {
  id: string;
  text: string;
  font: string;
  size: number; // logische px (vor Skalierung)
  weight?: string;
  color: string;
  position: Position; // Prozent
  scale: number;
  dragging: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
}

export function TextOverlay({
  id,
  text,
  font,
  size,
  weight,
  color,
  position,
  scale,
  dragging,
  onPointerDown,
}: TextOverlayProps) {
  return (
    <div
      className={`${styles.textEl} ${dragging ? styles.dragging : ""}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        fontFamily: `"${font}", sans-serif`,
        fontSize: `${size * scale}px`,
        fontWeight: weight ?? "400",
        color,
      }}
      onPointerDown={(e) => onPointerDown(id, e)}
    >
      {text}
    </div>
  );
}
