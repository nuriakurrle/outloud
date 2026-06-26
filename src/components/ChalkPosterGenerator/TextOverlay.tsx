import type { Position } from "../../types/poster";
import type { Align } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

interface TextOverlayProps {
  id: string;
  text: string;
  font: string;
  size: number; // logische px (vor Skalierung)
  weight?: string;
  color: string;
  position: Position; // Prozent
  align?: Align;
  scale: number;
  dragging: boolean;
  selected?: boolean;
  outline?: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
}

// Verankerung: bei left/right ist position.x die linke/rechte Kante,
// bei center die Mitte — passend zum Canvas-Export (ctx.textAlign).
const TRANSFORM: Record<Align, string> = {
  center: "translate(-50%, -50%)",
  left: "translate(0, -50%)",
  right: "translate(-100%, -50%)",
};

export function TextOverlay({
  id,
  text,
  font,
  size,
  weight,
  color,
  position,
  align = "center",
  scale,
  dragging,
  selected = false,
  outline = false,
  onPointerDown,
}: TextOverlayProps) {
  // Umriss-Stil: hohle Buchstaben mit Kontur in der Schriftfarbe.
  const strokeW = Math.max(0.8, size * scale * 0.045);
  const outlineStyle = outline
    ? {
        color: "transparent",
        WebkitTextFillColor: "transparent",
        WebkitTextStrokeWidth: `${strokeW}px`,
        WebkitTextStrokeColor: color,
        textShadow: "none",
      }
    : {};
  return (
    <div
      className={`${styles.textEl} ${dragging ? styles.dragging : ""}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: TRANSFORM[align],
        textAlign: align,
        fontFamily: `"${font}", sans-serif`,
        fontSize: `${size * scale}px`,
        fontWeight: weight ?? "400",
        color,
        // Hover-Affordance: signalisiert, dass Text direkt verschiebbar ist
        cursor: dragging ? "grabbing" : "grab",
        outline: selected ? "1.5px dashed rgba(255,255,255,0.7)" : "none",
        outlineOffset: 4,
        pointerEvents: "auto",
        ...outlineStyle,
      }}
      onPointerDown={(e) => onPointerDown(id, e)}
    >
      {text}
    </div>
  );
}
