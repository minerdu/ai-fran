'use client';

import Link from 'next/link';
import styles from './WecomGroupCard.module.css';

function formatRecent(value) {
  if (!value) return '待同步';
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getRegionColor(region) {
  switch (region) {
    case '华南': return 'linear-gradient(135deg, #07C160, #048C45)'; // Green
    case '华东': return 'linear-gradient(135deg, #1677FF, #0050B3)'; // Blue
    case '西南': return 'linear-gradient(135deg, #FA8C16, #D46B08)'; // Orange
    case '华北': return 'linear-gradient(135deg, #722ED1, #531DAB)'; // Purple
    case '华中': return 'linear-gradient(135deg, #F5222D, #CF1322)'; // Red
    default: return 'linear-gradient(135deg, #07C160, #048C45)';
  }
}

export default function WecomGroupCard({ group, onClick }) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.avatar} style={{ background: getRegionColor(group.city), color: '#fff' }}>群</div>
        <div className={styles.info}>
          <strong className={styles.name}>{group.name}</strong>
          <span className={styles.meta}>{group.city} · {group.memberCount || '45'} 人</span>
        </div>
        {group.unreadCount > 0 ? <span className={styles.badge}>{group.unreadCount}</span> : null}
      </div>
      <p className={styles.summary}>{group.aiSummary}</p>
      <div className={styles.footer}>
        <span className={styles.recent}>最近消息 {formatRecent(group.lastMessageAt)}</span>
        <span className={styles.link} style={{ color: getRegionColor(group.city).includes('#1677FF') ? '#1677FF' : getRegionColor(group.city).includes('#FA8C16') ? '#FA8C16' : '#07C160' }}>进入群沟通 →</span>
      </div>
    </button>
  );
}
