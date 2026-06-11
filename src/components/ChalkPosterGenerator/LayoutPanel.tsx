import type { PosterLayout } from "./layouts";
import styles from "../../styles/chalkPoster.module.css";

interface LayoutPanelProps {
  layouts: PosterLayout[];
  onApply: (layout: PosterLayout) => void;
  hasLogos: boolean;
}

/** Winziges schematisches Vorschaubild eines Layouts. */
function LayoutThumb({ layout }: { layout: PosterLayout }) {
  const order: (keyof PosterLayout["positions"])[] = [
    "header",
    "sub",
    "body",
    "detail",
  ];
  return (
    <svg viewBox="0 0 60 80" className={styles.layoutThumbSvg}>
      {order.map((key, i) => {
        const p = layout.positions[key];
        const w = key === "header" ? 36 : key === "detail" ? 22 : 30;
        return (
          <rect
            key={key}
            x={(p.x / 100) * 60 - w / 2}
            y={(p.y / 100) * 80 - (key === "header" ? 3 : 2)}
            width={w}
            height={key === "header" ? 6 : 4}
            rx={1}
            fill={key === "header" ? "#e0e0e0" : "#888"}
            opacity={1 - i * 0.12}
          />
        );
      })}
      <line
        x1={6}
        x2={54}
        y1={(layout.positions.divider.y / 100) * 80}
        y2={(layout.positions.divider.y / 100) * 80}
        stroke="#666"
        strokeWidth={0.7}
        strokeDasharray="2 2"
      />
      {layout.logoSlots.map((s, i) => (
        <circle
          key={i}
          cx={(s.x / 100) * 60}
          cy={(s.y / 100) * 80}
          r={Math.max(2.5, s.scale * 22)}
          fill="none"
          stroke="#7fb0ff"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

export function LayoutPanel({ layouts, onApply, hasLogos }: LayoutPanelProps) {
  return (
    <>
      <div className={styles.layoutGrid}>
        {layouts.map((l) => (
          <button
            key={l.id}
            className={styles.layoutThumb}
            title={l.hint}
            onClick={() => onApply(l)}
          >
            <LayoutThumb layout={l} />
            <span className={styles.layoutThumbLabel}>{l.name}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>
        {hasLogos
          ? "Layout wählen · Texte & Logos werden angeordnet"
          : "Layout ordnet die Texte an · Logos im Logo-Bereich hinzufügen"}
      </p>
    </>
  );
}
