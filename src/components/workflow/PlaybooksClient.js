'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/common/Toast';
import { isOptimizationTask, summarizeOptimizationTasks } from '@/lib/optimizationTaskMeta';
import WorkflowSectionNav from './WorkflowSectionNav';
import styles from '@/app/(dashboard)/workflow/phase2.module.css';

const PLAYBOOK_RELEASE_STATUS_LABELS = {
  published: '已发布',
  draft: '待发布',
};

export default function PlaybooksClient() {
  const [payload, setPayload] = useState({ items: [], recommendedId: null });
  const [optimizationTasks, setOptimizationTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamState, setStreamState] = useState('connecting');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [actionKey, setActionKey] = useState(null);
  const toast = useToast();
  const searchParams = useSearchParams();
  const focusedPlaybookId = searchParams.get('playbook');
  const focusedReleaseRef = searchParams.get('ref');
  const focusedPanel = searchParams.get('panel');

  const refreshPayload = async () => {
    const response = await fetch('/api/workflow/playbooks', { cache: 'no-store' });
    const data = await response.json();
    setPayload(data);
    setLastSyncAt(new Date());
  };

  useEffect(() => {
    let eventSource;

    const load = async () => {
      try {
        await refreshPayload();
      } catch (error) {
        console.error('Failed to load playbooks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();

    eventSource = new EventSource('/api/workflow/stream');
    eventSource.onopen = () => setStreamState('live');
    eventSource.onerror = () => setStreamState('reconnecting');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.playbooks) return;
        setLastSyncAt(new Date(data.serverTime || Date.now()));
        setPayload({
          items: data.playbooks,
          recommendedId: data.playbooks.find((item) => item.status === 'recommended')?.id || data.playbooks[0]?.id || null,
        });
      } catch (error) {
        console.error('Failed to parse playbook stream payload:', error);
      }
    };

    return () => eventSource?.close();
  }, []);

  useEffect(() => {
    fetch('/api/tasks', { cache: 'no-store' })
      .then((response) => response.json())
      .then((tasks) => {
        const next = (Array.isArray(tasks) ? tasks : []).filter(
          (task) => isOptimizationTask(task) && /(来源扩量|审批清理|招商方案|Playbook|content_publish|request_approval)/i.test(`${task.triggerReason || ''} ${task.title} ${task.taskType || ''}`)
        );
        setOptimizationTasks(next);
      })
      .catch(() => setOptimizationTasks([]));
  }, []);

  useEffect(() => {
    if (!focusedPlaybookId || isLoading) return;
    document.getElementById(`playbook-${focusedPlaybookId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedPlaybookId, isLoading]);

  useEffect(() => {
    if (!focusedPlaybookId || !focusedPanel || isLoading) return;
    document.getElementById(`playbook-${focusedPlaybookId}-${focusedPanel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedPlaybookId, focusedPanel, isLoading]);

  const streamLabel = useMemo(() => {
    if (streamState === 'live') return 'SSE 已连接';
    if (streamState === 'reconnecting') return 'SSE 重连中';
    return '正在连接 SSE';
  }, [streamState]);

  const stats = useMemo(() => {
    const published = payload.items.filter((item) => item.status === 'published' || item.status === 'recommended').length;
    const pendingApproval = payload.items.filter((item) => item.status === 'pending_approval').length;
    const totalLeads = payload.items.reduce((sum, item) => sum + (item.liveTargetLeads ?? item.targetLeads ?? 0), 0);
    return [
      { label: '方案总数', value: payload.items.length },
      { label: '待审批方案', value: pendingApproval },
      { label: '已发布方案', value: published },
      { label: '覆盖目标线索', value: totalLeads },
    ];
  }, [payload]);

  const optimizationSummary = useMemo(() => {
    const summary = summarizeOptimizationTasks(optimizationTasks);
    return summary.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});
  }, [optimizationTasks]);

  const handleAction = async (id, action) => {
    const key = `${id}:${action}`;
    setActionKey(key);
    try {
      const response = await fetch('/api/workflow/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) throw new Error('request failed');
      await refreshPayload();
      toast.success(
        action === 'launch'
          ? '已发起自动执行'
          : action === 'publish_version'
            ? '已发布版本'
            : '已提交审批'
      );
    } catch (error) {
      console.error('Failed to handle playbook action:', error);
      toast.error('招商方案操作失败');
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.compactStack}>
        <div className={styles.streamBar}>
          <span className={`${styles.streamDot} ${streamState === 'live' ? styles.streamDotLive : styles.streamDotMuted}`} />
          <span>{streamLabel}</span>
          <span className={styles.streamMeta}>
            {lastSyncAt ? `最近同步 ${lastSyncAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '等待首个事件'}
          </span>
        </div>

        <WorkflowSectionNav current="/workflow/playbooks" />

        <section className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {stats.map((item) => (
            <article key={item.label} className={styles.statCard}>
              <span className={styles.statValue}>{item.value}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </article>
          ))}
        </section>

        {isLoading ? (
          <div className={styles.emptyStateBlock}>正在加载招商方案...</div>
        ) : (
          payload.items.map((playbook) => {
            const isFocusedPlaybook = focusedPlaybookId === playbook.id;
            const releasePreview = (playbook.releasePacks || []).slice(0, 2);
            const versionPreview = (playbook.versions || []).slice(0, 3);
            const historyPreview = playbook.history?.[0];
            const optimizationContext = (
              optimizationSummary.approval_cleanup && (playbook.livePendingApprovals > 0 || playbook.status === 'pending_approval')
            )
              ? optimizationSummary.approval_cleanup
              : (
                optimizationSummary.source_growth && (
                  payload.recommendedId === playbook.id || playbook.status === 'published' || playbook.status === 'recommended'
                )
              )
                ? optimizationSummary.source_growth
                : null;

            return (
              <section
                key={playbook.id}
                id={`playbook-${playbook.id}`}
                className={`${styles.section} ${isFocusedPlaybook ? styles.focusSection : ''}`}
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {playbook.title}
                    {payload.recommendedId === playbook.id ? ' · 推荐方案' : ''}
                  </h2>
                  <span className={styles.sectionMeta}>{playbook.status} · {playbook.owner}</span>
                </div>

                <div className={styles.flatList}>
                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>方案定位</span>
                      <span className={styles.flatRowTitle}>{playbook.mode || playbook.strategy}</span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>预算 {playbook.budget}</span>
                      <span className={styles.flatTag}>ROI {playbook.predictedROI}</span>
                    </div>
                  </div>

                  {optimizationContext ? (
                    <div className={styles.flatRow}>
                      <div className={styles.flatRowMain}>
                        <span className={styles.flatRowLabel}>优化来源</span>
                        <span className={styles.flatRowTitle}>
                          {optimizationContext.icon} 已接入 {optimizationContext.label} · {optimizationContext.count} 条优化任务
                        </span>
                      </div>
                      <div className={styles.flatActionRow}>
                        <Link href={optimizationContext.href} className={styles.subtleBtn}>
                          查看来源入口
                        </Link>
                        <Link href="/tasks" className={styles.subtleBtn}>
                          查看执行任务
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>政策 / 会务 / 裂变</span>
                      <span className={styles.flatRowTitle}>
                        {(playbook.policyRecommendation || playbook.storeModelRecommendation)
                          ? `${playbook.storeModelRecommendation || '店型待确认'} · ${playbook.policyRecommendation || '政策待补充'}`
                          : playbook.strategy}
                        {' · '}
                        会务 {playbook.meetingStrategy || '待配置'} · 裂变 {playbook.fissionStrategy || '待配置'} · 目标线索 {playbook.liveTargetLeads ?? playbook.targetLeads}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>到会率 {playbook.predictedAttendanceRate || playbook.predictedSignRate}</span>
                      <span className={styles.flatTag}>签约率 {playbook.predictedContractRate || playbook.predictedSignRate}</span>
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>素材包 / 触达序列</span>
                      <span className={styles.flatRowTitle}>
                        {(playbook.assetBundle || playbook.assets?.map((item) => item.name) || []).slice(0, 4).join(' / ') || '素材包待生成'}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      {versionPreview.map((version) => (
                        <span key={`${playbook.id}-${version.versionTag || version}`} className={styles.flatTag}>
                          {version.versionTag || version}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    id={`playbook-${playbook.id}-release`}
                    className={`${styles.flatRow} ${isFocusedPlaybook && focusedPanel === 'release' ? styles.focusCard : ''}`}
                  >
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>发布包</span>
                      <span className={styles.flatRowTitle}>
                        {releasePreview.length
                          ? releasePreview.map((pack) => `${pack.versionTag} · ${pack.releaseRef}`).join(' / ')
                          : '暂无发布包'}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      {releasePreview.map((pack) => (
                        <span key={pack.id} className={styles.flatTag}>
                          {focusedReleaseRef === pack.releaseRef ? '当前定位' : (PLAYBOOK_RELEASE_STATUS_LABELS[pack.releaseStatus] || pack.releaseStatus)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>方案进度</span>
                      <span className={styles.flatRowTitle}>
                        {(playbook.readiness || playbook.milestones || []).slice(0, 3).map((item) => item.name || item).join(' / ') || '等待进入发布阶段'}
                      </span>
                    </div>
                    <div className={styles.flatActionRow}>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${playbook.id}:submit_approval`}
                        onClick={() => handleAction(playbook.id, 'submit_approval')}
                      >
                        {actionKey === `${playbook.id}:submit_approval` ? '提交中...' : '审批发布'}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={actionKey === `${playbook.id}:launch`}
                        onClick={() => handleAction(playbook.id, 'launch')}
                      >
                        {actionKey === `${playbook.id}:launch` ? '启动中...' : '发起自动执行'}
                      </button>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${playbook.id}:publish_version`}
                        onClick={() => handleAction(playbook.id, 'publish_version')}
                      >
                        {actionKey === `${playbook.id}:publish_version` ? '发布中...' : '发布版本'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
