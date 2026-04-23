'use client';

import Link from 'next/link';
import styles from './PostFollowupTaskCard.module.css';

function formatTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PostFollowupTaskCard({ event, compact = false }) {
  const preview = event.livePostFollowupPreview || [];

  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>会后催签</span>
          <h3 className={styles.title}>{event.title}</h3>
        </div>
        <span className={styles.count}>{event.livePostFollowupTasks || 0} 条</span>
      </div>

      <div className={styles.summary}>
        已签到 {event.liveCheckedIn || 0} 人，待催签任务 {event.livePostFollowupTasks || 0} 条，审批阻塞 {event.liveApprovalBlockers || 0} 条。
      </div>

      <div className={styles.list}>
        {preview.length ? preview.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>{item.leadName}</span>
              <span className={styles.itemMeta}>{item.title}</span>
            </div>
            <div className={styles.itemSide}>
              <span className={styles.itemStatus}>{item.statusLabel}</span>
              <span className={styles.itemTime}>{formatTime(item.time)}</span>
            </div>
          </div>
        )) : (
          <div className={styles.empty}>当前没有会后催签任务，完成签到后会自动补齐跟进动作。</div>
        )}
      </div>

      <div className={styles.actions}>
        <Link href={`/workflow/events/${event.id}`} className={styles.link}>
          查看会务详情
        </Link>
        <Link href="/tasks" className={styles.link}>
          查看执行任务
        </Link>
      </div>
    </div>
  );
}
