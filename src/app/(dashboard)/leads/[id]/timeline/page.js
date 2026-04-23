'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

const TYPE_META = {
  wecom: { label: '企微', color: '#07C160', icon: '💬' },
  phone: { label: '电话', color: '#2563eb', icon: '📞' },
  email: { label: '邮件', color: '#0ea5e9', icon: '✉️' },
  event: { label: '会务', color: '#7c3aed', icon: '🏢' },
  site_visit: { label: '考察', color: '#f59e0b', icon: '🔍' },
  form: { label: '表单', color: '#0f766e', icon: '📝' },
  referral: { label: '转介绍', color: '#ec4899', icon: '🤝' },
  approval: { label: '审批', color: '#b45309', icon: '📋' },
  ai_scoring: { label: 'AI评分', color: '#6366f1', icon: '🤖' },
  ai_action: { label: 'AI推荐', color: '#2563eb', icon: '💡' },
};

const SOURCE_META = {
  human: { label: '人工', bg: '#f0fdf4', color: '#166534' },
  ai: { label: 'AI', bg: '#eff6ff', color: '#2563eb' },
  customer: { label: '客户', bg: '#fef3c7', color: '#92400e' },
  system: { label: '系统', bg: '#f8fafc', color: '#64748b' },
};

function formatDate(value) {
  const d = new Date(value);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(items) {
  const groups = {};
  items.forEach((item) => {
    const dateKey = formatDate(item.timestamp);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  });
  return Object.entries(groups);
}

export default function LeadTimelinePage() {
  const params = useParams();
  const leadId = params.id;
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/customers/${leadId}/timeline`, { cache: 'no-store' });
        if (!response.ok) {
          setPayload(null);
          return;
        }
        const data = await response.json();
        setPayload(data);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [leadId]);

  const dateGroups = useMemo(() => {
    const items = payload?.items || [];
    return groupByDate(items);
  }, [payload]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p>正在加载触达时间线</p>
        </div>
      </div>
    );
  }

  if (!payload?.lead) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <span style={{ fontSize: 48 }}>📋</span>
          <p>未找到该线索</p>
          <Link href="/leads" className={styles.backLink}>← 返回线索列表</Link>
        </div>
      </div>
    );
  }

  const { lead, items } = payload;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/leads">线索</Link>
        <span>›</span>
        <Link href={`/leads/${leadId}`}>{lead.name}</Link>
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>触达时间线</span>
      </div>

      <section className={styles.headerCard}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar} style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            {lead.name.slice(0, 1)}
          </div>
          <div>
            <h1 className={styles.leadName}>{lead.name}</h1>
            <p className={styles.leadMeta}>{lead.company} · {lead.city} · 意向 {lead.intentScore}</p>
          </div>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statChip}>共 {items.length} 条记录</span>
          <span className={styles.statChip}>
            {items.filter((item) => item.source === 'ai').length} 条 AI 触达
          </span>
          <span className={styles.statChip}>
            {items.filter((item) => item.source === 'customer').length} 条客户互动
          </span>
        </div>
      </section>

      <section className={styles.timeline}>
        {dateGroups.map(([dateLabel, groupItems]) => (
          <div key={dateLabel} className={styles.dateGroup}>
            <div className={styles.dateLabel}>{dateLabel}</div>
            <div className={styles.dayItems}>
              {groupItems.map((item, idx) => {
                const typeMeta = TYPE_META[item.type] || { label: item.type, color: '#64748b', icon: '📌' };
                const sourceMeta = SOURCE_META[item.source] || SOURCE_META.system;

                return (
                  <div
                    key={item.id}
                    className={`${styles.timelineItem} animate-fadeInUp`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className={styles.itemIndicator}>
                      <div className={styles.itemDot} style={{ background: typeMeta.color, boxShadow: `0 0 0 3px ${typeMeta.color}22` }} />
                      {idx < groupItems.length - 1 ? <div className={styles.itemLine} /> : null}
                    </div>

                    <div className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLeft}>
                          <span className={styles.itemIcon}>{typeMeta.icon}</span>
                          <span className={styles.itemContent}>{item.content}</span>
                        </div>
                        <span className={styles.itemTime}>{formatTime(item.timestamp)}</span>
                      </div>

                      <p className={styles.itemDetail}>{item.detail}</p>

                      <div className={styles.itemFooter}>
                        <span className={styles.typeBadge} style={{ color: typeMeta.color }}>
                          {typeMeta.label}
                        </span>
                        <span className={styles.sourceBadge} style={{ color: sourceMeta.color, background: sourceMeta.bg }}>
                          {sourceMeta.label}
                        </span>
                        {item.agent ? <span className={styles.agentBadge}>{item.agent}</span> : null}
                        {item.approvalId ? (
                          <Link href="/approvals" className={styles.approvalLink}>
                            查看审批 →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <span style={{ fontSize: 40 }}>📋</span>
            <p>暂无触达记录</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
