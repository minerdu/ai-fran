'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/common/Toast';
import RunParentChildTree from './RunParentChildTree';
import WorkflowSectionNav from './WorkflowSectionNav';
import styles from '@/app/(dashboard)/workflow/phase2.module.css';

export default function WorkflowRunsClient() {
  const [payload, setPayload] = useState({ items: [], active: 0, pausedForApproval: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [streamState, setStreamState] = useState('connecting');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [actionKey, setActionKey] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let eventSource;

    const load = async () => {
      try {
        const response = await fetch('/api/workflow/runs', { cache: 'no-store' });
        const data = await response.json();
        setPayload(data);
        setLastSyncAt(new Date());
      } catch (error) {
        console.error('Failed to load workflow runs:', error);
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
        setLastSyncAt(new Date(data.serverTime || Date.now()));
        if (!data.runs || !data.stats) return;
        setPayload((prev) => ({
          ...prev,
          items: prev.items.length
            ? prev.items.map((item) => data.runs.find((run) => run.id === item.id) || item)
            : data.runs,
          active: data.stats.activeRuns,
          pausedForApproval: data.stats.pausedForApproval,
        }));
      } catch (error) {
        console.error('Failed to parse workflow run stream payload:', error);
      }
    };

    return () => eventSource?.close();
  }, []);

  const streamLabel = useMemo(() => {
    if (streamState === 'live') return 'SSE 已连接';
    if (streamState === 'reconnecting') return 'SSE 重连中';
    return '正在连接 SSE';
  }, [streamState]);

  const stats = useMemo(() => {
    const retryable = payload.items.filter((run) => run.status !== 'completed').length;
    const approvals = payload.items.filter((run) => run.linkedApproval).length;
    const optimizationRuns = payload.items.filter((run) => run.linkedOptimization).length;
    return [
      { label: '进行中的 Run', value: payload.active },
      { label: '审批阻塞中的 Run', value: payload.pausedForApproval },
      { label: '当前轨迹条目', value: payload.items.length },
      { label: '优化建议驱动', value: optimizationRuns || retryable + approvals },
    ];
  }, [payload]);

  const handleAction = async (id, action) => {
    const key = `${id}:${action}`;
    setActionKey(key);
    try {
      const response = await fetch('/api/workflow/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) throw new Error('request failed');
      toast.success(
        action === 'retry'
          ? '已触发重试'
          : action === 'cancel'
            ? '已取消当前 Run'
            : '已继续执行'
      );
    } catch (error) {
      console.error('Failed to handle run action:', error);
      toast.error('Run 操作失败');
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

        <WorkflowSectionNav current="/workflow/runs" />

        <section className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {stats.map((item) => (
            <article key={item.label} className={styles.statCard}>
              <span className={styles.statValue}>{item.value}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </article>
          ))}
        </section>

        {isLoading ? (
          <div className={styles.emptyStateBlock}>正在加载执行中心...</div>
        ) : (
          payload.items.map((run) => {
            const historyPreview = run.history?.[0];
            const timelinePreview = (run.timeline || []).slice(0, 3);
            return (
              <section key={run.id} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{run.agentType}</h2>
                  <span className={styles.sectionMeta}>{run.owner} · {run.status}</span>
                </div>

                <div className={styles.flatList}>
                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>运行范围</span>
                      <span className={styles.flatRowTitle}>{run.scope}</span>
                      <span className={styles.flatRowDesc}>{run.outputSummary}</span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>当前步骤 {run.currentStep}</span>
                      <span className={styles.flatTag}>Run {run.id}</span>
                      {run.linkedOptimization ? <span className={styles.flatTag}>{run.linkedOptimization.label}</span> : null}
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>运行轨迹</span>
                      <span className={styles.flatRowTitle}>
                        {timelinePreview.length
                          ? timelinePreview.map((item) => item.label).join(' → ')
                          : '暂无轨迹'}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>{run.recommendedAction}</span>
                    </div>
                  </div>

                  {run.runTree ? (
                    <div className={styles.flatRow}>
                      <div className={styles.flatRowMain}>
                        <span className={styles.flatRowLabel}>父子 Run 树</span>
                        <span className={styles.flatRowTitle}>{run.treeSummary || '当前主链路已展开子分支'}</span>
                        <RunParentChildTree tree={run.runTree} />
                      </div>
                      <div className={styles.flatActionRow}>
                        <Link href={`/workflow/runs/${run.id}`} className={styles.subtleBtn}>
                          查看完整 Run 树
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {run.linkedOptimization ? (
                    <div className={styles.flatRow}>
                      <div className={styles.flatRowMain}>
                        <span className={styles.flatRowLabel}>优化建议来源</span>
                        <span className={styles.flatRowTitle}>
                          {run.linkedOptimization.icon} {run.linkedOptimization.label} · {run.linkedOptimization.count} 条任务
                        </span>
                      </div>
                      <div className={styles.flatActionRow}>
                        <Link href={run.linkedOptimization.href} className={styles.subtleBtn}>
                          查看来源入口
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>审批关联</span>
                      <span className={styles.flatRowTitle}>
                        {run.linkedApproval ? `${run.linkedApproval.title} · 风险 ${run.linkedApproval.riskLevel}` : '当前无审批阻塞'}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      {run.linkedApproval ? <span className={styles.flatTag}>需人工确认</span> : <span className={styles.flatTag}>可直通</span>}
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>运行历史</span>
                      <span className={styles.flatRowTitle}>{historyPreview ? historyPreview.reason : '暂无动作记录'}</span>
                    </div>
                    <div className={styles.flatActionRow}>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${run.id}:retry`}
                        onClick={() => handleAction(run.id, 'retry')}
                      >
                        {actionKey === `${run.id}:retry` ? '重试中...' : '重试节点'}
                      </button>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${run.id}:cancel`}
                        onClick={() => handleAction(run.id, 'cancel')}
                      >
                        {actionKey === `${run.id}:cancel` ? '取消中...' : '取消 Run'}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={actionKey === `${run.id}:continue`}
                        onClick={() => handleAction(run.id, 'continue')}
                      >
                        {actionKey === `${run.id}:continue` ? '执行中...' : '继续执行'}
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
