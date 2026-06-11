import type { Position } from "../../types/poster";
import styles from "../../styles/chalkPoster.module.css";

interface DividerOverlayProps {
  position: Position; // nur y wird genutzt
  dragging: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
}

/**
 * Unsichtbarer Greif-Streifen über dem auf dem Canvas gezeichneten Trenner.
 * Beim Ziehen wird nur die Y-Position aktualisiert.
 */
export function DividerOverlay({
  position,
  dragging,
  onPointerDown,
}: DividerOverlayProps) {
  return (
    <div
      className={`${styles.dividerEl} ${dragging ? styles.dragging : ""}`}
      style={{ top: `${position.y}%` }}
      onPointerDown={(e) => onPointerDown("divider", e)}
    />
  );
}
