import Link from 'next/link';
import { notFound } from 'next/navigation';
import RunParentChildTree from '@/components/workflow/RunParentChildTree';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import styles from './page.module.css';

const RUN_STATUS_META = {
  paused_for_approval: { label: '审批中', color: '#b45309', bg: '#fffbeb' },
  running: { label: '运行中', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: '已完成', color: '#166534', bg: '#f0fdf4' },
  failed: { label: '失败', color: '#b91c1c', bg: '#fef2f2' },
  cancelled: { label: '已取消', color: '#b91c1c', bg: '#fef2f2' },
  draft: { label: '准备中', color: '#64748b', bg: '#f8fafc' },
};

function formatTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const dynamic = 'force-dynamic';

export default async function RunDetailPage({ params }) {
  const snapshot = await buildWorkflowSnapshot();
  const run = snapshot.runs.find((item) => item.id === params.runId);

  if (!run) notFound();

  const statusMeta = RUN_STATUS_META[run.status] || RUN_STATUS_META.running;
  const isPaused = run.status === 'paused_for_approval';
  const isCompleted = run.status === 'completed';
  const historyPreview = (run.history || []).slice(0, 4);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/workflow">工作流</Link>
        <span>›</span>
        <Link href="/workflow/runs">运行轨迹</Link>
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>Run 详情</span>
      </div>

      <section className={styles.headerCard}>
        <div className={styles.headerTop}>
          <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
            {statusMeta.label}
          </span>
          <span className={styles.metaInfo}>Run ID: {run.id}</span>
        </div>
        <h1 className={styles.title}>🤖 {run.agentType}</h1>
        <p className={styles.subtitle}>{run.scope}</p>

        <div className={styles.agentBadge}>
          <span className={styles.agentIcon}>⚙️</span>
          {run.owner}
        </div>

        <div className={styles.actionBar}>
          {isPaused ? (
            <Link href="/approvals" className={styles.warningBtn}>处理审批断点</Link>
          ) : null}
          {run.linkedOptimization ? (
            <Link href={run.linkedOptimization.href} className={styles.secondaryBtn}>查看优化来源</Link>
          ) : null}
          <Link href="/tasks" className={styles.primaryBtn}>{isCompleted ? '查看执行结果' : '查看执行任务'}</Link>
          <Link href="/workflow/runs" className={styles.secondaryBtn}>返回运行轨迹</Link>
        </div>
      </section>

      {run.linkedOptimization ? (
        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <span className={styles.sourceLabel}>优化来源</span>
            <p className={styles.sourceText}>
              {run.linkedOptimization.icon} 当前 Run 由 {run.linkedOptimization.label} 推动，已关联 {run.linkedOptimization.count} 条优化任务。
            </p>
            <div className={styles.sourceActions}>
              <Link href={run.linkedOptimization.href} className={styles.sourceChip}>查看来源入口</Link>
              <Link href="/tasks" className={styles.sourceChip}>查看执行任务</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>运行信息</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Agent 类型</span>
            <span className={styles.infoValue}>{run.agentType}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>启动时间</span>
            <span className={styles.infoValue}>{formatTime(run.startedAt)}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>当前步骤</span>
            <span className={styles.infoValue}>{run.currentStep}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>关联审批</span>
            <span className={styles.infoValue}>{run.linkedApproval?.title || '无'}</span>
            {run.linkedApproval ? (
              <Link href="/approvals" className={styles.infoNote} style={{ color: '#b45309' }}>
                查看审批 →
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>步骤时间线</h2>
        <div className={styles.stepsList}>
          {(run.timeline || []).map((step, index) => {
            const isApproval = step.state === 'active' && isPaused;
            const stepClass = isApproval
              ? styles.step_approval
              : step.state === 'done'
                ? styles.step_done
                : step.state === 'active'
                  ? styles.step_active
                  : '';

            return (
              <div key={`${step.label}-${index}`} className={`${styles.stepItem} ${stepClass}`}>
                <div className={styles.stepIndicator}>
                  <div className={styles.stepDot} />
                  {index < run.timeline.length - 1 ? <div className={styles.stepLine} /> : null}
                </div>
                <div className={styles.stepContent}>
                  <div className={styles.stepLabel}>
                    {isApproval ? '⚠️ ' : ''}{step.label}
                  </div>
                  <div className={styles.stepTime}>{formatTime(step.time)}</div>
                  {isApproval && run.linkedApproval ? (
                    <Link href="/approvals" className={styles.stepApprovalLink}>
                      处理审批断点 →
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {run.runTree ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>父子 Run 树</h2>
          <div className={styles.treeCard}>
            <p className={styles.treeSummary}>{run.treeSummary || '当前运行链路已拆分为多个执行分支。'}</p>
            <RunParentChildTree tree={run.runTree} />
          </div>
        </section>
      ) : null}

      {run.outputSummary ? (
        <section className={styles.section}>
          <div className={styles.outputCard}>
            <span className={styles.outputLabel}>📊 执行输出</span>
            <p className={styles.outputText}>{run.outputSummary}</p>
          </div>
        </section>
      ) : null}

      {historyPreview.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>运行历史</h2>
          <div className={styles.historyList}>
            {historyPreview.map((item, index) => (
              <div key={`${item.action}-${index}`} className={styles.historyItem}>
                <strong>{item.reason || item.action}</strong>
                <span>{formatTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {run.recommendedAction ? (
        <section className={styles.section}>
          <div className={styles.actionCard}>
            <span className={styles.actionLabel}>💡 推荐动作</span>
            <p className={styles.actionText}>{run.recommendedAction}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
