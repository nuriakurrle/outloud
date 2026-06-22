import { useState } from "react";
import {
  FORMATS,
  FORMAT_CATEGORIES,
  type OutputFormat,
} from "../../lib/formats";
import styles from "../../styles/chalkPoster.module.css";

interface FormatSelectorProps {
  formatId: string;
  onSelect: (format: OutputFormat) => void;
}

export function FormatSelector({ formatId, onSelect }: FormatSelectorProps) {
  const current = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0];
  const [category, setCategory] = useState<OutputFormat["category"]>(
    current.category
  );
  const visible = FORMATS.filter((f) => f.category === category);

  return (
    <div className={styles.formatSelector}>
      <div className={styles.formatCats}>
        {FORMAT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`${styles.formatCat} ${
              category === c.id ? styles.formatCatActive : ""
            }`}
            onClick={() => setCategory(c.id)}
          >
            <span className={styles.formatCatIcon}>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.formatList}>
        {visible.map((f) => (
          <button
            key={f.id}
            className={`${styles.formatItem} ${
              formatId === f.id ? styles.formatItemActive : ""
            }`}
            onClick={() => onSelect(f)}
          >
            <span className={styles.formatItemLabel}>{f.label}</span>
            <span className={styles.formatItemDim}>
              {f.width}×{f.height}
              {f.animated ? " · 🎬" : ""}
            </span>
            {formatId === f.id && <span className={styles.formatCheck}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
