import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import styles from './page.module.css';

const STATUS_META = {
  upcoming: { label: '即将开始', color: '#7c3aed', bg: '#f5f3ff' },
  active: { label: '执行中', color: '#2563eb', bg: '#eff6ff' },
  ongoing: { label: '执行中', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: '已结束', color: '#166534', bg: '#f0fdf4' },
  cancelled: { label: '已取消', color: '#64748b', bg: '#f8fafc' },
};

const TYPE_META = {
  seminar: { label: '招商说明会', icon: '🎤' },
  site_visit: { label: '总部考察日', icon: '🏢' },
  roadshow: { label: '巡回路演', icon: '🚗' },
};

const SEQ_STATUS_META = {
  done: 'seq_done',
  active: 'seq_active',
  dialing: 'seq_active',
  queued: '',
  planned: '',
};

function formatDateTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }) {
  const snapshot = await buildWorkflowSnapshot();
  const event = snapshot.events.find((item) => item.id === params.eventId);

  if (!event) notFound();

  const statusMeta = STATUS_META[event.status] || STATUS_META.upcoming;
  const typeMeta = TYPE_META[event.type] || { label: event.type || '会议类型', icon: '📋' };
  const attendanceRate = event.liveAttendanceRate || (event.registered > 0 ? `${Math.round((event.confirmed / event.registered) * 100)}%` : '0%');
  const rosterPreview = (event.roster || []).slice(0, 6);
  const batchPreview = (event.executionBatches || []).slice(0, 3);
  const historyPreview = (event.history || []).slice(0, 4);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/workflow">工作流</Link>
        <span>›</span>
        <Link href="/workflow/events">会议中心</Link>
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>活动详情</span>
      </div>

      <section className={styles.headerCard}>
        <div className={styles.headerTop}>
          <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
            {statusMeta.label}
          </span>
          <span className={styles.metaInfo}>{typeMeta.icon} {typeMeta.label}</span>
        </div>
        <h1 className={styles.title}>{event.title}</h1>
        <div className={styles.infoRow}>
          <span><span className={styles.infoIcon}>📍</span> {event.city} · {event.venue}</span>
          <span><span className={styles.infoIcon}>📅</span> {event.date} {event.time}</span>
          <span><span className={styles.infoIcon}>👥</span> 容量 {event.capacity} 人</span>
        </div>
        <div className={styles.actionBar}>
          <Link href={`/workflow/events?event=${event.id}&panel=roster`} className={styles.primaryBtn}>签到管理</Link>
          <Link href={`/workflow/events?event=${event.id}&panel=batch`} className={styles.secondaryBtn}>执行批次</Link>
          <Link href="/tasks" className={styles.secondaryBtn}>会后跟进</Link>
        </div>
      </section>

      {event.optimizationContext ? (
        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <span className={styles.sourceLabel}>优化来源</span>
            <p className={styles.sourceText}>
              {event.optimizationContext.icon} 当前会务链路已接入 {event.optimizationContext.label}，当前模块已有 {event.optimizationContext.count} 条优化任务进入执行队列。
            </p>
            <div className={styles.sourceActions}>
              <Link href={event.optimizationContext.href} className={styles.sourceChip}>查看来源入口</Link>
              <Link href="/tasks" className={styles.sourceChip}>查看执行任务</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>📩</span>
          <div>
            <span className={styles.metricLabel}>已报名</span>
            <strong className={styles.metricValue} style={{ color: '#2563eb' }}>{event.registered}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>✅</span>
          <div>
            <span className={styles.metricLabel}>已签到</span>
            <strong className={styles.metricValue} style={{ color: '#0f766e' }}>{event.liveCheckedIn ?? event.confirmed}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>📊</span>
          <div>
            <span className={styles.metricLabel}>到会率</span>
            <strong className={styles.metricValue} style={{ color: '#7c3aed' }}>{attendanceRate}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>🎯</span>
          <div>
            <span className={styles.metricLabel}>会后任务</span>
            <strong className={styles.metricValue} style={{ color: '#f59e0b' }}>{event.liveFollowupTasks ?? 0}</strong>
          </div>
        </article>
      </section>

      {(event.sequence || []).length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>邀约序列 · 第{event.inviteWave}波</h2>
          <div className={styles.sequenceList}>
            {event.sequence.map((step, index) => (
              <div key={`${step.label}-${index}`} className={`${styles.sequenceItem} ${styles[SEQ_STATUS_META[step.status]] || ''}`}>
                <div className={styles.sequenceIndicator}>
                  <div className={styles.sequenceDot} />
                  {index < event.sequence.length - 1 ? <div className={styles.sequenceLine} /> : null}
                </div>
                <div className={styles.sequenceContent}>
                  <span className={styles.seqLabel}>{step.label}</span>
                  <span className={styles.seqCount}>{step.count ? `${step.count} 人` : '等待执行'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {rosterPreview.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>签到名单</h2>
          <div className={styles.leadList}>
            {rosterPreview.map((lead) => (
              <Link href={`/leads/${lead.leadId}`} key={lead.leadId} className={styles.leadCard}>
                <div className={styles.leadAvatar} style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                  {lead.leadName.slice(-2)}
                </div>
                <div>
                  <div className={styles.leadName}>{lead.leadName}</div>
                  <div className={styles.leadMeta}>
                    {lead.sourceLabel} · {lead.status === 'attended' ? '已签到' : lead.status === 'absent' ? '未到场' : '待签到'}
                  </div>
                </div>
                <span className={styles.leadArrow}>→</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {batchPreview.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>执行批次</h2>
          <div className={styles.infoGrid}>
            {batchPreview.map((batch) => (
              <div key={batch.id} className={styles.infoBlock}>
                <span className={styles.infoLabel}>{batch.batchRef}</span>
                <span className={styles.infoValue}>{batch.title}</span>
                <span className={styles.infoSub}>
                  已签到 {batch.checkedInCount} 人 · 待签到 {batch.pendingCount} 人 · 联动任务 {batch.followupTaskCount} 条
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {historyPreview.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>执行历史</h2>
          <div className={styles.historyList}>
            {historyPreview.map((item, index) => (
              <div key={`${item.action}-${index}`} className={styles.historyItem}>
                <strong>{item.leadName ? `${item.leadName} · ` : ''}{item.reason || item.action}</strong>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {event.nextAction ? (
        <section className={styles.section}>
          <div className={styles.nextActionCard}>
            <span className={styles.nextActionLabel}>📌 下一步动作</span>
            <p className={styles.nextActionText}>{event.nextAction}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
