import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMobileApprovalDetailPayload } from '@/lib/mobileBff';
import { listGovernanceAuditLogs } from '@/lib/governanceStore';
import styles from './page.module.css';

const TYPE_META = {
  policy: { label: '招商政策', color: '#2563eb', bg: '#eff6ff' },
  budget: { label: '财务预算', color: '#0f766e', bg: '#ecfdf5' },
  referral: { label: '裂变规则', color: '#7c3aed', bg: '#f5f3ff' },
  outreach: { label: '高频触达', color: '#dc2626', bg: '#fff1f2' },
  external_delivery: { label: '资料外发', color: '#0ea5e9', bg: '#ecfeff' },
  skill_activation: { label: 'Skill 激活', color: '#d97706', bg: '#fffbeb' },
  meeting: { label: '招商会议', color: '#8b5cf6', bg: '#f5f3ff' },
  task: { label: '招商任务', color: '#14b8a6', bg: '#f0fdfa' },
};

const STATUS_META = {
  pending: { label: '待审批', color: '#b45309', bg: '#fffbeb' },
  approved: { label: '已通过', color: '#166534', bg: '#f0fdf4' },
  rejected: { label: '已驳回', color: '#b91c1c', bg: '#fef2f2' },
  superseded: { label: '已取代', color: '#475569', bg: '#f8fafc' },
};

const RISK_META = {
  low: { label: '低风险', color: '#15803d', bg: '#f0fdf4' },
  medium: { label: '中风险', color: '#b45309', bg: '#fffbeb' },
  high: { label: '高风险', color: '#b91c1c', bg: '#fef2f2' },
};

function formatDateTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getObjectHref(item) {
  if (!item?.id) return null;
  if (item.targetRegion || item.strategy) return `/ai/playbooks/${item.id}`;
  if (item.venue || item.inviteWave) return `/workflow/events/${item.id}`;
  if (item.rewardModel || item.payout || item.rewardValue) return `/workflow/referrals/${item.id}`;
  return null;
}

function formatAction(action) {
  if (action === 'approve') return '审批通过';
  if (action === 'reject') return '审批驳回';
  if (action === 'ai_command') return 'AI 指令触发';
  if (action === 'continue_run') return '恢复执行';
  if (action === 'cancel_run') return '取消执行';
  return action;
}

export default async function ApprovalDetailPage({ params }) {
  const payload = await buildMobileApprovalDetailPayload(params.id);
  if (!payload) notFound();

  const audits = await listGovernanceAuditLogs({
    entityType: 'approval',
    entityId: params.id,
    limit: 20,
  });

  const { approval, sourceRun, impactSummary, sourceSkillVersion, primaryObject } = payload;
  const typeMeta = TYPE_META[approval.type] || TYPE_META.policy;
  const statusMeta = STATUS_META[approval.status] || STATUS_META.pending;
  const riskMeta = RISK_META[approval.riskLevel] || RISK_META.medium;
  const linkedObjects = Array.isArray(impactSummary?.linkedObjects) ? impactSummary.linkedObjects : [];
  const primaryObjectHref = primaryObject ? getObjectHref(primaryObject) : null;

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroTop}>
          <Link href="/approvals" className={styles.backLink}>‹ 返回审批中心</Link>
          <div className={styles.badgeRow}>
            <span className={styles.badge} style={{ color: typeMeta.color, background: typeMeta.bg }}>
              {typeMeta.label}
            </span>
            <span className={styles.badge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
              {statusMeta.label}
            </span>
            <span className={styles.badge} style={{ color: riskMeta.color, background: riskMeta.bg }}>
              {riskMeta.label}
            </span>
          </div>
        </div>

        <div className={styles.heroMain}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{approval.title}</h1>
            <p className={styles.description}>{approval.description}</p>
          </div>
          <div className={styles.recommendation}>
            <span className={styles.recommendationLabel}>AI 审批建议</span>
            <p>{approval.recommendation || approval.description}</p>
          </div>
        </div>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>来源 Agent</span>
            <strong>{approval.sourceAgent || '--'}</strong>
            <span className={styles.metricSub}>Skill 版本：{sourceSkillVersion || '--'}</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>审批对象</span>
            <strong>{approval.objectName || approval.objectType || '--'}</strong>
            <span className={styles.metricSub}>类型：{impactSummary?.objectType || '--'}</span>
            {primaryObjectHref ? (
              <Link href={primaryObjectHref} className={styles.inlineLink}>
                查看关联对象
              </Link>
            ) : null}
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>到期时间</span>
            <strong>{formatDateTime(approval.expiresAt)}</strong>
            <span className={styles.metricSub}>创建于 {formatDateTime(approval.createdAt)}</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>处理结果</span>
            <strong>{approval.decisionMode ? formatAction(approval.decisionMode) : '待处理'}</strong>
            <span className={styles.metricSub}>
              {approval.decidedAt ? `处理于 ${formatDateTime(approval.decidedAt)}` : '尚未处理'}
            </span>
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>审批影响与调整</h2>
        </div>
        <div className={styles.impactGrid}>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>影响说明</span>
            <p>{impactSummary?.impact || approval.impact || '暂无影响说明'}</p>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>替代方案</span>
            {(approval.alternatives || []).length > 0 ? (
              <div className={styles.chipRow}>
                {approval.alternatives.map((item) => (
                  <span key={item} className={styles.chip}>{item}</span>
                ))}
              </div>
            ) : (
              <p>当前没有替代方案。</p>
            )}
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>已选替代方案</span>
            <p>{approval.selectedAlternative || '未选择替代方案'}</p>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoLabel}>阈值调整</span>
            <p>{approval.thresholdValue || '未调整阈值'}</p>
          </article>
        </div>
        {approval.decisionReason ? (
          <div className={styles.reasonBlock}>
            <span className={styles.infoLabel}>审批说明</span>
            <p>{approval.decisionReason}</p>
          </div>
        ) : null}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>关联执行对象</h2>
        </div>
        <div className={styles.linkedGrid}>
          <article className={styles.linkedCard}>
            <span className={styles.infoLabel}>来源 Run</span>
            {sourceRun ? (
              <>
                <strong>{sourceRun.agentType}</strong>
                <span className={styles.metricSub}>{sourceRun.currentStep || sourceRun.status}</span>
                <Link href={`/workflow/runs/${sourceRun.id}`} className={styles.inlineLink}>
                  查看执行详情
                </Link>
              </>
            ) : (
              <p>当前审批未绑定运行中的工作流。</p>
            )}
          </article>
          <article className={styles.linkedCard}>
            <span className={styles.infoLabel}>关联业务对象</span>
            {linkedObjects.length > 0 ? (
              <div className={styles.objectList}>
                {linkedObjects.map((item) => {
                  const href = getObjectHref(item);
                  return href ? (
                    <Link key={item.id} href={href} className={styles.objectLink}>
                      {item.title || item.name || item.id}
                    </Link>
                  ) : (
                    <span key={item.id} className={styles.chip}>{item.title || item.name || item.id}</span>
                  );
                })}
              </div>
            ) : (
              <p>当前审批只有摘要对象，没有额外联动对象。</p>
            )}
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>审批审计记录</h2>
        </div>
        {audits.length > 0 ? (
          <div className={styles.auditList}>
            {audits.map((audit) => (
              <article key={audit.id} className={styles.auditItem}>
                <div className={styles.auditTop}>
                  <strong>{formatAction(audit.action)}</strong>
                  <span>{formatDateTime(audit.createdAt)}</span>
                </div>
                <div className={styles.auditMeta}>
                  <span>操作人：{audit.operator || 'system'}</span>
                  {audit.metadata?.runRecoveryAction ? (
                    <span>Run 处理：{audit.metadata.runRecoveryAction}</span>
                  ) : null}
                </div>
                <p className={styles.auditReason}>{audit.reason || '无说明'}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>当前审批还没有写入审计记录。</div>
        )}
      </section>
    </div>
  );
}
