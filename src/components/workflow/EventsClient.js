'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/common/Toast';
import { isOptimizationTask, summarizeOptimizationTasks } from '@/lib/optimizationTaskMeta';
import InviteDialingCard from './InviteDialingCard';
import PostFollowupTaskCard from './PostFollowupTaskCard';
import WorkflowSectionNav from './WorkflowSectionNav';
import styles from '@/app/(dashboard)/workflow/phase2.module.css';

const EVENT_ROSTER_STATUS_LABELS = {
  confirmed: '待签到',
  attended: '已签到',
  absent: '未到场',
};

export default function EventsClient() {
  const [payload, setPayload] = useState({ items: [], upcoming: 0 });
  const [optimizationTasks, setOptimizationTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamState, setStreamState] = useState('connecting');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [actionKey, setActionKey] = useState(null);
  const toast = useToast();
  const searchParams = useSearchParams();
  const focusedEventId = searchParams.get('event');
  const focusedBatchRef = searchParams.get('batch');
  const focusedPanel = searchParams.get('panel');

  const refreshPayload = async () => {
    const response = await fetch('/api/workflow/events', { cache: 'no-store' });
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
        console.error('Failed to load workflow events:', error);
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
        if (!data.events) return;
        setLastSyncAt(new Date(data.serverTime || Date.now()));
        setPayload({
          items: data.events,
          upcoming: data.events.filter((item) => item.status === 'upcoming').length,
        });
      } catch (error) {
        console.error('Failed to parse event stream payload:', error);
      }
    };

    return () => eventSource?.close();
  }, []);

  useEffect(() => {
    fetch('/api/tasks', { cache: 'no-store' })
      .then((response) => response.json())
      .then((tasks) => {
        const next = (Array.isArray(tasks) ? tasks : []).filter(
          (task) => isOptimizationTask(task) && /(漏斗修复|审批清理|follow_up|request_approval|会后|催签)/i.test(`${task.triggerReason || ''} ${task.title} ${task.taskType || ''}`)
        );
        setOptimizationTasks(next);
      })
      .catch(() => setOptimizationTasks([]));
  }, []);

  useEffect(() => {
    if (!focusedEventId || isLoading) return;
    document.getElementById(`event-${focusedEventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedEventId, isLoading]);

  useEffect(() => {
    if (!focusedEventId || !focusedPanel || isLoading) return;
    document.getElementById(`event-${focusedEventId}-${focusedPanel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedEventId, focusedPanel, isLoading]);

  const streamLabel = useMemo(() => {
    if (streamState === 'live') return 'SSE 已连接';
    if (streamState === 'reconnecting') return 'SSE 重连中';
    return '正在连接 SSE';
  }, [streamState]);

  const stats = useMemo(() => {
    const totalRegistered = payload.items.reduce((sum, item) => sum + item.registered, 0);
    const totalConfirmed = payload.items.reduce((sum, item) => sum + item.confirmed, 0);
    const totalTasks = payload.items.reduce((sum, item) => sum + (item.liveFollowupTasks || 0), 0);
    return [
      { label: '待执行会务', value: payload.upcoming },
      { label: '累计报名人数', value: totalRegistered },
      { label: '累计确认人数', value: totalConfirmed },
      { label: '会后跟进任务', value: totalTasks },
    ];
  }, [payload]);

  const optimizationSummary = useMemo(() => {
    const summary = summarizeOptimizationTasks(optimizationTasks);
    return summary.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});
  }, [optimizationTasks]);

  const handleAction = async (id, action, leadId, status) => {
    const key = `${id}:${action}:${leadId || 'all'}:${status || 'na'}`;
    setActionKey(key);
    try {
      const response = await fetch('/api/workflow/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, leadId, status }),
      });
      if (!response.ok) throw new Error('request failed');
      await refreshPayload();
      toast.success(
        action === 'launch_sequence'
          ? '已启动自动邀约序列'
          : action === 'post_followup'
            ? '已触发会后催签'
            : action === 'override_status'
              ? '已覆盖邀约状态'
            : '已登记签到'
      );
    } catch (error) {
      console.error('Failed to handle event action:', error);
      toast.error('会务动作执行失败');
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

        <WorkflowSectionNav current="/workflow/events" />

        <section className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {stats.map((item) => (
            <article key={item.label} className={styles.statCard}>
              <span className={styles.statValue}>{item.value}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </article>
          ))}
        </section>

        {isLoading ? (
          <div className={styles.emptyStateBlock}>正在加载会议中心...</div>
        ) : (
          payload.items.map((event) => {
            const isFocusedEvent = focusedEventId === event.id;
            const nextRoster = (event.roster || []).slice(0, 3);
            const nextBatches = (event.executionBatches || []).slice(0, 2);
            const historyPreview = event.history?.[0];
            const optimizationContext = (
              optimizationSummary.approval_cleanup && (event.liveApprovalBlockers ?? 0) > 0
            )
              ? optimizationSummary.approval_cleanup
              : (
                optimizationSummary.funnel_repair && ((event.liveFollowupTasks ?? 0) > 0 || event.status === 'upcoming' || event.status === 'active')
              )
                ? optimizationSummary.funnel_repair
                : null;

            return (
              <section
                key={event.id}
                id={`event-${event.id}`}
                className={`${styles.section} ${isFocusedEvent ? styles.focusSection : ''}`}
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{event.title}</h2>
                  <span className={styles.sectionMeta}>{event.status} · {event.owner}</span>
                </div>

                <div className={styles.flatList}>
                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>会议概览</span>
                      <span className={styles.flatRowTitle}>{event.city} · {event.venue} · {event.date} {event.time} · 波次 {event.inviteWave}</span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>报名 {event.registered}/{event.capacity}</span>
                      <span className={styles.flatTag}>确认 {event.confirmed}</span>
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
                      <span className={styles.flatRowLabel}>自动序列</span>
                      <span className={styles.flatRowTitle}>{(event.sequence || []).map((step) => step.label).join(' → ') || '待编排'} · 到会率 {event.attendanceTargetRate} · 接受率 {event.inviteAcceptRate}</span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>到会率目标 {event.attendanceTargetRate}</span>
                      <span className={styles.flatTag}>接受率 {event.inviteAcceptRate}</span>
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>拨号推进</span>
                      <InviteDialingCard event={event} />
                    </div>
                    <div className={styles.flatActionRow}>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${event.id}:override_status:all:dialing`}
                        onClick={() => handleAction(event.id, 'override_status', null, 'dialing')}
                      >
                        {actionKey === `${event.id}:override_status:all:dialing` ? '处理中...' : '标记拨号中'}
                      </button>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${event.id}:override_status:all:completed`}
                        onClick={() => handleAction(event.id, 'override_status', null, 'completed')}
                      >
                        {actionKey === `${event.id}:override_status:all:completed` ? '处理中...' : '标记已完成'}
                      </button>
                    </div>
                  </div>

                  <div
                    id={`event-${event.id}-roster`}
                    className={`${styles.flatRow} ${isFocusedEvent && focusedPanel === 'roster' ? styles.focusCard : ''}`}
                  >
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>签到名单</span>
                      <span className={styles.flatRowTitle}>
                        {nextRoster.length
                          ? nextRoster.map((lead) => `${lead.leadName} · ${EVENT_ROSTER_STATUS_LABELS[lead.status] || lead.status}`).join(' / ')
                          : '暂无签到名单'}
                      </span>
                    </div>
                    <div className={styles.flatActionRow}>
                      {nextRoster.filter((lead) => !lead.checkedIn).slice(0, 2).map((lead) => (
                        <button
                          key={lead.leadId}
                          type="button"
                          className={styles.subtleBtn}
                          disabled={actionKey === `${event.id}:check_in:${lead.leadId}:na`}
                          onClick={() => handleAction(event.id, 'check_in', lead.leadId)}
                        >
                          {actionKey === `${event.id}:check_in:${lead.leadId}:na` ? '登记中...' : `签到 ${lead.leadName}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    id={`event-${event.id}-batch`}
                    className={`${styles.flatRow} ${isFocusedEvent && focusedPanel === 'batch' ? styles.focusCard : ''}`}
                  >
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>执行批次</span>
                      <span className={styles.flatRowTitle}>
                        {nextBatches.length
                          ? nextBatches.map((batch) => `${batch.title} · ${batch.batchRef}`).join(' / ')
                          : '暂无执行批次'}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      {nextBatches.map((batch) => (
                        <span key={batch.id} className={styles.flatTag}>
                          {focusedBatchRef === batch.batchRef ? '当前定位' : batch.checkpoint}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>会后催签</span>
                      <PostFollowupTaskCard event={event} />
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>执行历史</span>
                      <span className={styles.flatRowTitle}>
                        {historyPreview
                          ? `${historyPreview.leadName ? `${historyPreview.leadName} · ` : ''}${historyPreview.reason}`
                          : '暂无动作记录'}
                        {' · '}会后催签 {event.liveFollowupTasks ?? 0} 条 · 审批阻塞 {event.liveApprovalBlockers ?? 0} 条
                      </span>
                    </div>
                    <div className={styles.flatActionRow}>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${event.id}:launch_sequence:all:na`}
                        onClick={() => handleAction(event.id, 'launch_sequence')}
                      >
                        {actionKey === `${event.id}:launch_sequence:all:na` ? '启动中...' : '发起签到提醒'}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={actionKey === `${event.id}:post_followup:all:na`}
                        onClick={() => handleAction(event.id, 'post_followup')}
                      >
                        {actionKey === `${event.id}:post_followup:all:na` ? '触发中...' : '启动会后催签'}
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
