import Link from 'next/link';
import { notFound } from 'next/navigation';
import AssetBundleBoard from '@/components/ai/AssetBundleBoard';
import PlaybookActionBar from '@/components/ai/PlaybookActionBar';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import styles from './page.module.css';

const STATUS_META = {
  draft: { label: '草稿', color: '#64748b', bg: '#f8fafc' },
  pending_approval: { label: '审批中', color: '#b45309', bg: '#fffbeb' },
  published: { label: '已发布', color: '#166534', bg: '#f0fdf4' },
  recommended: { label: '推荐方案', color: '#2563eb', bg: '#eff6ff' },
  approved: { label: '已通过', color: '#166534', bg: '#f0fdf4' },
  executing: { label: '执行中', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: '已完成', color: '#0f766e', bg: '#ecfdf5' },
};

export const dynamic = 'force-dynamic';

export default async function PlaybookDetailPage({ params }) {
  const snapshot = await buildWorkflowSnapshot();
  const playbook = snapshot.playbooks.find((item) => item.id === params.id);

  if (!playbook) notFound();

  const otherVariants = snapshot.playbooks.filter((item) => item.id !== params.id).slice(0, 3);
  const statusMeta = STATUS_META[playbook.status] || STATUS_META.draft;
  const assets = playbook.assetBundle || [];
  const releases = (playbook.releasePacks || []).slice(0, 3);
  const versions = (playbook.versions || []).slice(0, 4);
  const milestones = (playbook.readiness || []).map((item, index) => ({
    name: item.name || item,
    date: item.updatedAt || item.createdAt || `阶段 ${index + 1}`,
    status: item.status || (index === 0 ? 'in_progress' : 'done'),
  }));

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/ai">AI 招商</Link>
        <span>›</span>
        <Link href="/ai/playbooks">方案中心</Link>
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>方案详情</span>
      </div>

      <section className={styles.headerCard}>
        <div className={styles.headerTop}>
          <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
            {statusMeta.label}
          </span>
          <span className={styles.metaInfo}>{playbook.owner} · 目标线索 {playbook.liveTargetLeads ?? playbook.targetLeads}</span>
        </div>
        <h1 className={styles.title}>{playbook.title}</h1>
        <p className={styles.description}>{playbook.positioningSummary || playbook.description}</p>
        <p className={styles.strategy}>策略：{playbook.mode || playbook.strategy}</p>

        <PlaybookActionBar playbookId={playbook.id} status={playbook.status} />
        <div className={styles.actionBar}>
          <Link href={`/workflow/playbooks?playbook=${playbook.id}&panel=release`} className={styles.primaryBtn}>查看工作流发布包</Link>
          <Link href={playbook.status === 'pending_approval' ? '/approvals' : '/tasks'} className={playbook.status === 'pending_approval' ? styles.warningBtn : styles.secondaryBtn}>
            {playbook.status === 'pending_approval' ? '查看审批状态' : '查看执行任务'}
          </Link>
          <Link href="/workflow/playbooks" className={styles.secondaryBtn}>打开方案执行页</Link>
        </div>
      </section>

      {playbook.optimizationContext ? (
        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <span className={styles.sourceLabel}>优化来源</span>
            <p className={styles.sourceText}>
              {playbook.optimizationContext.icon} 当前方案已接入 {playbook.optimizationContext.label}，当前模块已有 {playbook.optimizationContext.count} 条优化任务在推动审批或发布。
            </p>
            <div className={styles.sourceActions}>
              <Link href={playbook.optimizationContext.href} className={styles.sourceChip}>查看来源入口</Link>
              <Link href="/tasks" className={styles.sourceChip}>查看执行任务</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>📈</span>
          <div>
            <span className={styles.metricLabel}>预测签约率</span>
            <strong className={styles.metricValue}>{playbook.predictedContractRate || playbook.predictedSignRate}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>💰</span>
          <div>
            <span className={styles.metricLabel}>预测 ROI</span>
            <strong className={styles.metricValue}>{playbook.predictedROI}</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>🎯</span>
          <div>
            <span className={styles.metricLabel}>目标线索</span>
            <strong className={styles.metricValue}>{playbook.liveTargetLeads ?? playbook.targetLeads} 条</strong>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>💵</span>
          <div>
            <span className={styles.metricLabel}>预算</span>
            <strong className={styles.metricValue}>{playbook.budget}</strong>
          </div>
        </article>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>策略配置</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>政策建议</span>
            <span className={styles.infoValue}>{playbook.policyRecommendation || '待补充'}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>会务策略</span>
            <span className={styles.infoValue}>{playbook.meetingStrategy || '待补充'}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>裂变策略</span>
            <span className={styles.infoValue}>{playbook.fissionStrategy || '待补充'}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>实时状态</span>
            <span className={styles.infoValue}>待审批 {playbook.livePendingApprovals ?? 0} 条 · 发布版本 {playbook.versions?.length || 0} 个</span>
          </div>
        </div>
      </section>

      {milestones.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>执行里程碑</h2>
          <div className={styles.milestoneList}>
            {milestones.map((item, index) => (
              <div key={`${item.name}-${index}`} className={`${styles.milestoneItem} ${styles[`ms_${item.status}`] || ''}`}>
                <div className={styles.milestoneIndicator}>
                  <div className={styles.milestoneDot} />
                  {index < milestones.length - 1 ? <div className={styles.milestoneLine} /> : null}
                </div>
                <div className={styles.milestoneContent}>
                  <span className={styles.milestoneName}>{item.name}</span>
                  <span className={styles.milestoneDate}>{typeof item.date === 'string' ? item.date : '进行中'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {assets.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>素材包</h2>
          <AssetBundleBoard
            assets={assets}
            manifestItems={releases.flatMap((release) => release.packageItems || release.manifestSummary || [])}
          />
        </section>
      ) : null}

      {releases.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>发布包</h2>
          <div className={styles.approvalList}>
            {releases.map((release) => (
              <Link href={`/workflow/playbooks?playbook=${playbook.id}&ref=${encodeURIComponent(release.releaseRef)}&panel=release`} key={release.id} className={styles.approvalCard}>
                <div>
                  <h4>{release.versionTag} · {release.releaseRef}</h4>
                  <p>{(release.manifestSummary || []).slice(0, 2).join(' · ') || '等待发布内容'}</p>
                </div>
                <span className={styles.approvalArrow}>→</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {versions.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>版本记录</h2>
          <div className={styles.variantList}>
            {versions.map((version, index) => (
              <div key={`${version.versionTag}-${index}`} className={styles.variantCard}>
                <div className={styles.variantHeader}>
                  <h4>{version.versionTag}</h4>
                  <span className={styles.statusBadge} style={{ color: '#2563eb', background: '#eff6ff' }}>
                    {version.releaseRef || '待发布'}
                  </span>
                </div>
                <p className={styles.variantStrategy}>
                  预测签约率 {version.predictedContractRate || '待补充'} · ROI {version.predictedROI || '待补充'}
                </p>
                <div className={styles.variantMetrics}>
                  <span>{version.packageItems?.length || 0} 项物料</span>
                  <span>{version.createdAt ? '已生成' : '待生成'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {otherVariants.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>其他方案变体</h2>
          <div className={styles.variantList}>
            {otherVariants.map((variant) => {
              const variantStatus = STATUS_META[variant.status] || STATUS_META.draft;
              return (
                <Link href={`/ai/playbooks/${variant.id}`} key={variant.id} className={styles.variantCard}>
                  <div className={styles.variantHeader}>
                    <h4>{variant.title}</h4>
                    <span className={styles.statusBadge} style={{ color: variantStatus.color, background: variantStatus.bg }}>
                      {variantStatus.label}
                    </span>
                  </div>
                  <p className={styles.variantStrategy}>{variant.mode || variant.strategy}</p>
                  <div className={styles.variantMetrics}>
                    <span>签约率 {variant.predictedContractRate || variant.predictedSignRate}</span>
                    <span>ROI {variant.predictedROI}</span>
                    <span>预算 {variant.budget}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
