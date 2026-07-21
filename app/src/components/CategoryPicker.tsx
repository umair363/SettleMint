"use client";

import type { Category } from "@settlemint/shared";
import styles from "./CategoryPicker.module.css";

interface CategoryPickerProps {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** Tint the selected state with each category's own color instead of mint. */
  colorized?: boolean;
}

export default function CategoryPicker({ categories, value, onChange, label, colorized }: CategoryPickerProps) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.grid} role="radiogroup" aria-label={label || "Category"}>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            className={`${styles.btn} ${value === c.id ? styles.btnSelected : ""}`}
            style={colorized ? ({ "--cat-color": c.color } as React.CSSProperties) : undefined}
            onClick={() => onChange(c.id)}
          >
            <span className={styles.emoji} aria-hidden="true">{c.emoji}</span>
            <span className={styles.label2}>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
