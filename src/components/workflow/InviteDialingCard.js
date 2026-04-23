'use client';

import styles from './InviteDialingCard.module.css';

const STEP_STATUS_LABELS = {
  done: '已完成',
  active: '执行中',
  queued: '排队中',
  planned: '待触发',
  dialing: '拨号中',
};

export default function InviteDialingCard({ event }) {
  const dialingStep = (event.sequence || []).find((step) => step.status === 'dialing' || /拨号/.test(step.label));
  const preview = event.liveDialingPreview || [];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>Invite Dialing</span>
          <h3 className={styles.title}>电话拨号 / 二次确认</h3>
        </div>
        <span className={styles.count}>{event.liveDialingTasks || dialingStep?.count || 0} 条</span>
      </div>

      <div className={styles.metrics}>
        <span className={styles.metric}>当前节点 {dialingStep?.label || '待编排'}</span>
        <span className={styles.metric}>状态 {STEP_STATUS_LABELS[dialingStep?.status] || '待执行'}</span>
        <span className={styles.metric}>确认人数 {event.confirmed}</span>
      </div>

      <div className={styles.previewList}>
        {preview.length ? preview.map((item) => (
          <div key={item.id} className={styles.previewItem}>
            <span className={styles.previewTitle}>{item.leadName}</span>
            <span className={styles.previewMeta}>{item.title}</span>
            <span className={styles.previewStatus}>{item.statusLabel}</span>
          </div>
        )) : (
          <div className={styles.empty}>当前还没有拨号任务，系统将按会务节奏自动补齐。</div>
        )}
      </div>
    </div>
  );
}
