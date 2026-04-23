import Link from 'next/link';
import { notFound } from 'next/navigation';
import AntiFraudRuleCard from '@/components/workflow/AntiFraudRuleCard';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import styles from './page.module.css';

const STATUS_META = {
  active: { label: '运行中', color: '#166534', bg: '#f0fdf4' },
  pending_approval: { label: '待审批', color: '#b45309', bg: '#fffbeb' },
  draft: { label: '草稿', color: '#64748b', bg: '#f8fafc' },
  paused: { label: '已暂停', color: '#dc2626', bg: '#fef2f2' },
};

const REWARD_STATUS_LABELS = {
  qualified: '已达标',
  pending_settlement: '待结算',
  settled: '已结算',
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

export default async function ReferralDetailPage({ params }) {
  const snapshot = await buildWorkflowSnapshot();
  const program = snapshot.referrals.find((item) => item.id === params.programId);

  if (!program) notFound();

  const statusMeta = STATUS_META[program.status] || STATUS_META.draft;
  const { progress } = program;
  const maxProgress = Math.max(progress.published, progress.referred, progress.qualified, progress.signed, 1);
  const progressStages = [
    { label: '发布', value: progress.published, color: '#64748b' },
    { label: '推荐', value: progress.referred, color: '#2563eb' },
    { label: '合格', value: progress.qualified, color: '#f59e0b' },
    { label: '签约', value: progress.signed, color: '#22c55e' },
  ];
  const settlementPreview = (program.settlementLedger || []).slice(0, 4);
  const referralPreview = (program.referralEvents || []).slice(0, 4);
  const historyPreview = (program.history || []).slice(0, 4);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/workflow">工作流</Link>
        <span>›</span>
        <Link href="/workflow/referrals">裂变中心</Link>
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>裂变详情</span>
      </div>

      <section className={styles.headerCard}>
        <div className={styles.headerTop}>
          <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
            {statusMeta.label}
          </span>
          <span className={styles.metaInfo}>{program.template}</span>
        </div>
        <h1 className={styles.title}>{program.name}</h1>
        <p className={styles.description}>{program.trigger}</p>
        <div className={styles.actionBar}>
          <Link href={`/workflow/referrals?program=${program.id}&panel=ledger`} className={styles.primaryBtn}>
            查看结算台账
          </Link>
          <Link href={program.status === 'pending_approval' ? '/approvals' : '/tasks'} className={styles.secondaryBtn}>
            {program.status === 'pending_approval' ? '查看审批状态' : '查看执行任务'}
          </Link>
          <Link href="/me" className={styles.secondaryBtn}>关联素材 / Skill</Link>
        </div>
      </section>

      {program.optimizationContext ? (
        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <span className={styles.sourceLabel}>优化来源</span>
            <p className={styles.sourceText}>
              {program.optimizationContext.icon} 当前裂变规则已接入 {program.optimizationContext.label}，当前模块已有 {program.optimizationContext.count} 条优化任务在推动素材补齐或激活动作。
            </p>
            <div className={styles.sourceActions}>
              <Link href={program.optimizationContext.href} className={styles.sourceChip}>查看来源入口</Link>
              <Link href="/tasks" className={styles.sourceChip}>查看执行任务</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>🎁</span>
          <div>
            <span className={styles.metricLabel}>奖励方案</span>
            <strong className={styles.metricValue} style={{ color: '#ec4899', fontSize: 16 }}>{program.reward}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>🌍</span>
          <div>
            <span className={styles.metricLabel}>覆盖区域</span>
            <strong className={styles.metricValue} style={{ color: '#7c3aed', fontSize: 16 }}>{program.region}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>📩</span>
          <div>
            <span className={styles.metricLabel}>已推荐</span>
            <strong className={styles.metricValue} style={{ color: '#2563eb' }}>{progress.referred}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>✅</span>
          <div>
            <span className={styles.metricLabel}>已签约</span>
            <strong className={styles.metricValue} style={{ color: '#22c55e' }}>{progress.signed}</strong>
          </div>
        </article>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>转化漏斗</h2>
        <div className={styles.progressBar}>
          {progressStages.map((stage) => (
            <div key={stage.label} className={styles.progressItem}>
              <span className={styles.progressLabel}>{stage.label}</span>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.max((stage.value / maxProgress) * 100, 4)}%`,
                    background: stage.color,
                  }}
                />
              </div>
              <span className={styles.progressCount}>{stage.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>规则详情</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>模板类型</span>
            <span className={styles.infoValue}>{program.template}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>覆盖区域</span>
            <span className={styles.infoValue}>{program.region}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>负责人</span>
            <span className={styles.infoValue}>{program.owner}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>实时状态</span>
            <span className={styles.infoValue}>待审批 {program.liveApprovalTasks ?? 0} 条 · 裂变任务 {program.liveReferralTasks ?? 0} 条</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <AntiFraudRuleCard rules={program.antiFraudRules || []} thresholdText={program.fraudThreshold} />
      </section>

      {referralPreview.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>推荐事件</h2>
          <div className={styles.infoGrid}>
            {referralPreview.map((event) => (
              <div key={event.id} className={styles.infoBlock}>
                <span className={styles.infoLabel}>{event.sourceLabel}</span>
                <span className={styles.infoValue}>{event.leadName}</span>
                <span className={styles.infoSub}>{REWARD_STATUS_LABELS[event.rewardStatus] || event.rewardStatus}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {settlementPreview.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>结算台账</h2>
          <div className={styles.infoGrid}>
            {settlementPreview.map((ledger) => (
              <div key={ledger.id} className={styles.infoBlock}>
                <span className={styles.infoLabel}>{ledger.settlementRef || '待生成编号'}</span>
                <span className={styles.infoValue}>{ledger.leadName}</span>
                <span className={styles.infoSub}>{ledger.rewardLabel} · {ledger.payoutStage || '等待进入结算流程'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(program.assetJobs || []).length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>素材生成批次</h2>
          <div className={styles.infoGrid}>
            {program.assetJobs.slice(0, 4).map((job) => (
              <div key={job.id} className={styles.infoBlock}>
                <span className={styles.infoLabel}>{job.artifactRef || job.jobType}</span>
                <span className={styles.infoValue}>{job.status === 'success' ? '已生成素材包' : job.status}</span>
                <span className={styles.infoSub}>{(job.assets || []).join(' / ') || '待生成物料清单'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(program.assets || []).length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>素材包</h2>
          <div className={styles.assetList}>
            {program.assets.map((asset, index) => (
              <div key={`${asset}-${index}`} className={`${styles.assetChip} animate-fadeInUp`} style={{ animationDelay: `${index * 60}ms` }}>
                <span className={styles.assetIcon}>📄</span>
                {asset}
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
                <strong>{item.reason || item.action}</strong>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
