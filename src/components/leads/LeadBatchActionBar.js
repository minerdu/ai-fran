'use client';

import styles from './LeadBatchActionBar.module.css';

export default function LeadBatchActionBar({ count, onInvite, onAssignManual, onMarkException }) {
  return (
    <div className={styles.batchActionBar}>
      <span className={styles.batchCount}>已选 <strong>{count}</strong> 项线索</span>
      <div className={styles.batchActions}>
        <button type="button" className={styles.batchBtnSecondary} onClick={onAssignManual}>
          转人工
        </button>
        <button type="button" className={styles.batchBtnSecondary} onClick={onMarkException}>
          标记例外
        </button>
        <button type="button" className={styles.batchBtnPrimary} onClick={onInvite}>
          批量邀约
        </button>
      </div>
    </div>
  );
}
