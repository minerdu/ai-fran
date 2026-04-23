'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/common/Toast';
import { isOptimizationTask, summarizeOptimizationTasks } from '@/lib/optimizationTaskMeta';
import WorkflowSectionNav from './WorkflowSectionNav';
import styles from '@/app/(dashboard)/workflow/phase2.module.css';

const REFERRAL_REWARD_LABELS = {
  qualified: '已达标',
  pending_settlement: '待结算',
  settled: '已结算',
};

export default function ReferralsClient() {
  const [payload, setPayload] = useState({ items: [], active: 0, pendingApproval: 0 });
  const [optimizationTasks, setOptimizationTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamState, setStreamState] = useState('connecting');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [actionKey, setActionKey] = useState(null);
  const toast = useToast();
  const searchParams = useSearchParams();
  const focusedProgramId = searchParams.get('program');
  const focusedSettlementRef = searchParams.get('settlement');
  const focusedPanel = searchParams.get('panel');

  const refreshPayload = async () => {
    const response = await fetch('/api/workflow/referrals', { cache: 'no-store' });
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
        console.error('Failed to load workflow referrals:', error);
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
        if (!data.referrals) return;
        setLastSyncAt(new Date(data.serverTime || Date.now()));
        setPayload({
          items: data.referrals,
          active: data.referrals.filter((item) => item.status === 'active').length,
          pendingApproval: data.referrals.filter((item) => item.status === 'pending_approval').length,
        });
      } catch (error) {
        console.error('Failed to parse referral stream payload:', error);
      }
    };

    return () => eventSource?.close();
  }, []);

  useEffect(() => {
    fetch('/api/tasks', { cache: 'no-store' })
      .then((response) => response.json())
      .then((tasks) => {
        const next = (Array.isArray(tasks) ? tasks : []).filter(
          (task) => isOptimizationTask(task) && /(沉默激活|审批清理|asset_bundle|request_approval|内容包|Skill)/i.test(`${task.triggerReason || ''} ${task.title} ${task.taskType || ''}`)
        );
        setOptimizationTasks(next);
      })
      .catch(() => setOptimizationTasks([]));
  }, []);

  useEffect(() => {
    if (!focusedProgramId || isLoading) return;
    document.getElementById(`program-${focusedProgramId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedProgramId, isLoading]);

  useEffect(() => {
    if (!focusedProgramId || !focusedPanel || isLoading) return;
    document.getElementById(`program-${focusedProgramId}-${focusedPanel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedProgramId, focusedPanel, isLoading]);

  const streamLabel = useMemo(() => {
    if (streamState === 'live') return 'SSE 已连接';
    if (streamState === 'reconnecting') return 'SSE 重连中';
    return '正在连接 SSE';
  }, [streamState]);

  const stats = useMemo(() => {
    const totalReferred = payload.items.reduce((sum, item) => sum + item.progress.referred, 0);
    const totalQualified = payload.items.reduce((sum, item) => sum + item.progress.qualified, 0);
    return [
      { label: '生效中的裂变规则', value: payload.active },
      { label: '待审批规则', value: payload.pendingApproval },
      { label: '累计推荐数', value: totalReferred },
      { label: '合格线索', value: totalQualified },
    ];
  }, [payload]);

  const optimizationSummary = useMemo(() => {
    const summary = summarizeOptimizationTasks(optimizationTasks);
    return summary.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});
  }, [optimizationTasks]);

  const handleAction = async (id, action, leadId) => {
    const key = `${id}:${action}:${leadId || 'all'}`;
    setActionKey(key);
    try {
      const response = await fetch('/api/workflow/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, leadId }),
      });
      if (!response.ok) throw new Error('request failed');
      await refreshPayload();
      toast.success(
        action === 'publish'
          ? '已发布裂变规则'
          : action === 'generate_assets'
            ? '已生成裂变素材包'
          : action === 'settle_reward'
            ? '已登记奖励结算'
            : '已提交审批'
      );
    } catch (error) {
      console.error('Failed to handle referral action:', error);
      toast.error('裂变规则操作失败');
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

        <WorkflowSectionNav current="/workflow/referrals" />

        <section className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {stats.map((item) => (
            <article key={item.label} className={styles.statCard}>
              <span className={styles.statValue}>{item.value}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </article>
          ))}
        </section>

        {isLoading ? (
          <div className={styles.emptyStateBlock}>正在加载裂变中心...</div>
        ) : (
          payload.items.map((program) => {
            const isFocusedProgram = focusedProgramId === program.id;
            const settlementPreview = (program.settlementLedger || []).slice(0, 2);
            const eventPreview = (program.referralEvents || []).slice(0, 2);
            const historyPreview = program.history?.[0];
            const optimizationContext = (
              optimizationSummary.approval_cleanup && (program.liveApprovalTasks ?? 0) > 0
            )
              ? optimizationSummary.approval_cleanup
              : (
                optimizationSummary.silent_reactivation && ((program.liveReferralTasks ?? 0) > 0 || program.status === 'active')
              )
                ? optimizationSummary.silent_reactivation
                : null;

            return (
              <section
                key={program.id}
                id={`program-${program.id}`}
                className={`${styles.section} ${isFocusedProgram ? styles.focusSection : ''}`}
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{program.name}</h2>
                  <span className={styles.sectionMeta}>{program.status} · {program.owner}</span>
                </div>

                <div className={styles.flatList}>
                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>规则配置</span>
                      <span className={styles.flatRowTitle}>{program.template} · {program.region} · 触发 {program.trigger} · 奖励 {program.reward}</span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      <span className={styles.flatTag}>推荐 {program.progress.referred}</span>
                      <span className={styles.flatTag}>签约 {program.progress.signed}</span>
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
                      <span className={styles.flatRowLabel}>招募物料</span>
                      <span className={styles.flatRowTitle}>{(program.assets || []).join(' / ') || '待生成物料'} · 审批 {program.liveApprovalTasks ?? 0} 条 · 裂变任务 {program.liveReferralTasks ?? 0} 条</span>
                    </div>
                    <div className={styles.flatActionRow}>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${program.id}:generate_assets:all`}
                        onClick={() => handleAction(program.id, 'generate_assets')}
                      >
                        {actionKey === `${program.id}:generate_assets:all` ? '生成中...' : '生成物料'}
                      </button>
                      <span className={styles.flatTag}>已发布 {program.progress.published}</span>
                      <span className={styles.flatTag}>合格 {program.progress.qualified}</span>
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>推荐事件</span>
                      <span className={styles.flatRowTitle}>
                        {eventPreview.length
                          ? eventPreview.map((event) => `${event.leadName} · ${REFERRAL_REWARD_LABELS[event.rewardStatus] || event.rewardStatus}`).join(' / ')
                          : '暂无推荐事件'}
                      </span>
                    </div>
                    <div className={styles.flatActionRow}>
                      {eventPreview.filter((event) => event.leadId && event.rewardStatus !== 'settled').map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className={styles.subtleBtn}
                          disabled={actionKey === `${program.id}:settle_reward:${event.leadId}`}
                          onClick={() => handleAction(program.id, 'settle_reward', event.leadId)}
                        >
                          {actionKey === `${program.id}:settle_reward:${event.leadId}` ? '结算中...' : `结算 ${event.leadName}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    id={`program-${program.id}-ledger`}
                    className={`${styles.flatRow} ${isFocusedProgram && focusedPanel === 'ledger' ? styles.focusCard : ''}`}
                  >
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>结算台账</span>
                      <span className={styles.flatRowTitle}>
                        {settlementPreview.length
                          ? settlementPreview.map((ledger) => `${ledger.leadName} · ${ledger.settlementRef || '待生成编号'}`).join(' / ')
                          : '暂无结算记录'}
                      </span>
                    </div>
                    <div className={styles.flatRowMeta}>
                      {settlementPreview.map((ledger) => (
                        <span key={ledger.id} className={styles.flatTag}>
                          {focusedSettlementRef === ledger.settlementRef ? '当前定位' : (REFERRAL_REWARD_LABELS[ledger.status] || ledger.status)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.flatRow}>
                    <div className={styles.flatRowMain}>
                      <span className={styles.flatRowLabel}>执行历史</span>
                      <span className={styles.flatRowTitle}>{historyPreview ? historyPreview.reason : '暂无动作记录'} · 签约 {program.liveSignedLeads ?? 0} 人</span>
                    </div>
                    <div className={styles.flatActionRow}>
                      <button
                        type="button"
                        className={styles.subtleBtn}
                        disabled={actionKey === `${program.id}:submit_approval:all`}
                        onClick={() => handleAction(program.id, 'submit_approval')}
                      >
                        {actionKey === `${program.id}:submit_approval:all` ? '提交中...' : '提交审批'}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={actionKey === `${program.id}:publish:all`}
                        onClick={() => handleAction(program.id, 'publish')}
                      >
                        {actionKey === `${program.id}:publish:all` ? '发布中...' : '发布规则'}
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
