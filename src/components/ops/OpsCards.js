'use client';

import Link from 'next/link';
import styles from './OpsCards.module.css';

function toneClass(tone) {
  switch (tone) {
    case 'success':
      return styles.toneSuccess;
    case 'warning':
      return styles.toneWarning;
    case 'blue':
      return styles.toneBlue;
    case 'green':
      return styles.toneGreen;
    case 'orange':
      return styles.toneOrange;
    case 'purple':
      return styles.tonePurple;
    default:
      return styles.toneNeutral;
  }
}

export function StatusIndicatorStrip({ items = [] }) {
  return (
    <section className={styles.stripGrid}>
      {items.map((item) => (
        <article key={item.id} className={styles.stripItem}>
          <span className={styles.stripLabel}>{item.label}</span>
          <strong className={`${styles.stripValue} ${toneClass(item.tone)}`}>{item.value}</strong>
          <span className={styles.stripDetail}>{item.detail}</span>
        </article>
      ))}
    </section>
  );
}

export function ReportEntryCard({ entry }) {
  const content = (
    <article className={styles.entryCard}>
      <div className={styles.entryHead}>
        <h3 className={styles.entryTitle}>{entry.title}</h3>
        <span className={`${styles.entryValue} ${toneClass(entry.tone)}`}>{entry.value}</span>
      </div>
      <p className={styles.entryDesc}>{entry.description}</p>
      <span className={styles.entryLink}>进入查看 →</span>
    </article>
  );

  return entry.href ? (
    <Link href={entry.href} className={styles.entryLinkWrap}>
      {content}
    </Link>
  ) : content;
}

export function EngineStatusCard({ engine }) {
  return (
    <section className={styles.engineCard}>
      <div className={styles.engineTop}>
        <div>
          <p className={styles.engineEyebrow}>自主招商引擎</p>
          <h2 className={styles.engineTitle}>{engine.title}</h2>
          <p className={styles.engineDesc}>{engine.description}</p>
        </div>
        <div className={styles.engineBadgeWrap}>
          <span className={`${styles.engineBadge} ${toneClass(engine.status)}`}>
            {engine.status === 'warning' ? '需关注' : '稳定运行'}
          </span>
        </div>
      </div>

      <div className={styles.engineMetrics}>
        <div className={styles.engineMetric}>
          <span className={styles.metricLabel}>旅程覆盖</span>
          <strong className={styles.metricValue}>{engine.coverage}</strong>
        </div>
        <div className={styles.engineMetric}>
          <span className={styles.metricLabel}>自动化率</span>
          <strong className={styles.metricValue}>{engine.automationRate}</strong>
        </div>
        <div className={styles.engineMetric}>
          <span className={styles.metricLabel}>运行中</span>
          <strong className={styles.metricValue}>{engine.runningCount}</strong>
        </div>
        <div className={styles.engineMetric}>
          <span className={styles.metricLabel}>待审批</span>
          <strong className={styles.metricValue}>{engine.pendingApprovals}</strong>
        </div>
      </div>

      <div className={styles.engineMetaRow}>
        <span>暂停 {engine.pausedCount} 个</span>
        <span>完成 {engine.completedCount} 个</span>
        <span>最近生成 {engine.lastGeneratedAt}</span>
      </div>
    </section>
  );
}
