'use client';

import styles from './EmptyState.module.css';

export default function EmptyState({
  icon = '📭',
  title = '暂无数据',
  description = '当前条件下没有可展示的内容。',
  action = null,
  compact = false,
}) {
  return (
    <div className={`${styles.emptyState} ${compact ? styles.compact : ''}`}>
      <span className={styles.icon}>{icon}</span>
      <strong className={styles.title}>{title}</strong>
      <p className={styles.description}>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
