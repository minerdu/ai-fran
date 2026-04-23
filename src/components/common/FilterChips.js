'use client';

import styles from './FilterChips.module.css';

export default function FilterChips({
  items = [],
  activeKey,
  onChange,
  className = '',
}) {
  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      {items.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            onClick={() => onChange?.(item.key)}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span className={styles.count}>{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
