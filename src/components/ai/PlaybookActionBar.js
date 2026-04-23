'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from '@/app/(dashboard)/ai/playbooks/[id]/page.module.css';

export default function PlaybookActionBar({ playbookId, status }) {
  const router = useRouter();
  const [actionKey, setActionKey] = useState(null);

  const triggerAction = async (action) => {
    setActionKey(action);
    try {
      const response = await fetch('/api/workflow/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playbookId, action }),
      });
      if (!response.ok) throw new Error('request failed');
      router.refresh();
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className={styles.actionBar}>
      {status === 'pending_approval' ? (
        <button type="button" className={styles.warningBtn} onClick={() => triggerAction('approve_launch')}>
          {actionKey === 'approve_launch' ? '处理中...' : '一键审批发布'}
        </button>
      ) : null}
      <button type="button" className={styles.primaryBtn} onClick={() => triggerAction('launch')}>
        {actionKey === 'launch' ? '启动中...' : '发起自动执行'}
      </button>
      <button type="button" className={styles.secondaryBtn} onClick={() => triggerAction('publish_version')}>
        {actionKey === 'publish_version' ? '发布中...' : '发布版本'}
      </button>
    </div>
  );
}
