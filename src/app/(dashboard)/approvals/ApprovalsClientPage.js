'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/common/EmptyState';
import FilterChips from '@/components/common/FilterChips';
import { apiFetch } from '@/lib/basePath';
import styles from './page.module.css';

const TYPE_META = {
  policy: { label: '招商政策', color: '#2563eb', bg: '#eff6ff', icon: '📜' },
  budget: { label: '财务预算', color: '#0f766e', bg: '#ecfdf5', icon: '💰' },
  referral: { label: '裂变', color: '#7c3aed', bg: '#f5f3ff', icon: '🔗' },
  outreach: { label: '高频触达', color: '#dc2626', bg: '#fff1f2', icon: '📡' },
  external_delivery: { label: '外发', color: '#0ea5e9', bg: '#ecfeff', icon: '📤' },
  skill_activation: { label: 'Skill 激活', color: '#d97706', bg: '#fffbeb', icon: '⚡' },
  meeting: { label: '招商会议', color: '#8b5cf6', bg: '#f5f3ff', icon: '🎪' },
  task: { label: '招商任务', color: '#14b8a6', bg: '#f0fdfa', icon: '📋' },
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

const FILTERS = [
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: 'all', label: '全部' },
];

function formatDateTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCountdown(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return '已到期';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h 内到期`;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} 天内到期`;
}

function isProcessedToday(item) {
  if (!item.decidedAt) return false;
  const date = new Date(item.decidedAt);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

async function parseJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`${fallbackMessage}：服务返回了异常页面`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data;
}

export default function ApprovalsClientPage({
  initialItems = [],
  initialOptimizationTasks = [],
}) {
  const [items, setItems] = useState(initialItems);
  const [optimizationTasks, setOptimizationTasks] = useState(initialOptimizationTasks);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedAlternative, setSelectedAlternative] = useState('');
  const [thresholdDraft, setThresholdDraft] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const safeItems = useMemo(() => items || [], [items]);

  const loadApprovals = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsInitialLoading(true);
    }

    try {
      const [approvalsResponse, tasksResponse] = await Promise.all([
        apiFetch('/api/approvals', { cache: 'no-store' }),
        apiFetch('/api/tasks', { cache: 'no-store' }),
      ]);

      const [approvalsData, tasks] = await Promise.all([
        parseJsonResponse(approvalsResponse, '加载审批列表失败'),
        parseJsonResponse(tasksResponse, '加载待审批任务失败'),
      ]);

      const nextItems = Array.isArray(approvalsData) ? approvalsData : [];
      const nextOptimizationTasks = (Array.isArray(tasks) ? tasks : []).filter((task) =>
        task.approvalStatus === 'pending' &&
        /AI 优化建议|优化建议执行/.test(`${task.triggerReason || ''} ${task.title}`)
      );

      setItems(nextItems);
      setOptimizationTasks(nextOptimizationTasks);
    } catch {
      if (!safeItems.length) {
        setItems([]);
        setOptimizationTasks([]);
      }
    } finally {
      setIsInitialLoading(false);
    }
  }, [safeItems.length]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadApprovals({ silent: true });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(() => loadApprovals({ silent: true }), 30000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [loadApprovals]);

  const handleOptimizationTask = async (taskId, action) => {
    const response = await apiFetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, action }),
    });
    if (response.ok) {
      setOptimizationTasks((current) => current.filter((task) => task.id !== taskId));
    }
  };

  const counts = useMemo(() => ({
    pending: safeItems.filter((item) => item.status === 'pending').length,
    approved: safeItems.filter((item) => item.status === 'approved').length,
    rejected: safeItems.filter((item) => item.status === 'rejected').length,
    all: safeItems.length,
  }), [safeItems]);

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'pending':
        return safeItems.filter((item) => item.status === 'pending');
      case 'approved':
        return safeItems.filter((item) => item.status === 'approved');
      case 'rejected':
        return safeItems.filter((item) => item.status === 'rejected');
      default:
        return safeItems;
    }
  }, [activeFilter, safeItems]);

  const handleDecision = async (id, nextStatus, alternative = '') => {
    const response = await apiFetch('/api/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        action: nextStatus === 'approved' ? 'approve' : 'reject',
        selectedAlternative: alternative,
        reason: decisionReason,
      }),
    });
    if (!response.ok) return;
    const data = await parseJsonResponse(response, '处理审批失败');
    setItems(Array.isArray(data.items) ? data.items : []);
    setExpandedId(null);
    setSelectedAlternative('');
    setThresholdDraft('');
    setDecisionReason('');
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleEditDecision = async (id, action) => {
    const response = await apiFetch('/api/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        action,
        selectedAlternative,
        thresholdValue: thresholdDraft,
        reason: decisionReason,
      }),
    });
    if (!response.ok) return;
    const data = await parseJsonResponse(response, '处理审批失败');
    setItems(Array.isArray(data.items) ? data.items : []);
    setExpandedId(null);
    setSelectedAlternative('');
    setThresholdDraft('');
    setDecisionReason('');
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleBatchDecision = async (nextStatus) => {
    const response = await apiFetch('/api/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: Array.from(selectedIds),
        action: nextStatus === 'approved' ? 'approve' : 'reject',
      }),
    });
    if (!response.ok) return;
    const data = await parseJsonResponse(response, '批量处理审批失败');
    setItems(Array.isArray(data.items) ? data.items : []);
    setSelectedIds(new Set());
  };

  const pendingFilteredIds = useMemo(() =>
    filteredItems.filter((item) => item.status === 'pending').map((item) => item.id),
  [filteredItems]);

  const allPendingSelected = pendingFilteredIds.length > 0 &&
    pendingFilteredIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFilteredIds));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const summaryCards = useMemo(() => ([
    { label: '待审批', value: counts.pending, accent: '#f59e0b' },
    { label: '已通过', value: counts.approved, accent: '#22c55e' },
    { label: '已驳回', value: counts.rejected, accent: '#ef4444' },
    { label: '今日处理', value: safeItems.filter(isProcessedToday).length, accent: '#2563eb' },
  ]), [counts, safeItems]);

  return (
    <div className={styles.approvalsPage}>
      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} className={styles.summaryCard}>
            <strong className={styles.summaryValue} style={{ color: card.accent }}>
              {isInitialLoading ? '···' : card.value}
            </strong>
            <span className={styles.summaryLabel}>{card.label}</span>
          </article>
        ))}
      </section>

      <section className={styles.filterBar}>
        <FilterChips
          items={FILTERS.map((filter) => ({
            ...filter,
            count: counts[filter.key] || 0,
          }))}
          activeKey={activeFilter}
          onChange={setActiveFilter}
        />
      </section>

      {pendingFilteredIds.length > 0 && (
        <section className={styles.batchBar}>
          <div className={styles.batchHead}>
            <button type="button" className={styles.selectAllBtn} onClick={toggleSelectAll}>
              {allPendingSelected ? '取消全选' : '全选'}
            </button>
            <label className={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={toggleSelectAll}
                className={styles.checkbox}
              />
              <span>待审批 {pendingFilteredIds.length} 项</span>
            </label>
          </div>
          <div className={styles.batchActions}>
            <span className={styles.batchCount}>已选 {selectedIds.size} 项</span>
            <button
              type="button"
              className={styles.batchApproveBtn}
              onClick={() => handleBatchDecision('approved')}
              disabled={selectedIds.size === 0}
            >
              批量通过
            </button>
            <button
              type="button"
              className={styles.batchRejectBtn}
              onClick={() => handleBatchDecision('rejected')}
              disabled={selectedIds.size === 0}
            >
              批量驳回
            </button>
          </div>
        </section>
      )}

      <section className={styles.cardList}>
        {isInitialLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <div className={styles.loadingTitle}>审批数据加载中</div>
            <div className={styles.loadingDesc}>正在同步待审批动作与历史处理结果</div>
          </div>
        ) : (
          <>
            {optimizationTasks.length > 0 && (
              <div className={styles.optimizationBlock}>
                <div className={styles.optimizationHead}>
                  <h3 className={styles.optimizationTitle}>优化建议生成的待审批任务</h3>
                  <span className={styles.optimizationMeta}>{optimizationTasks.length} 项</span>
                </div>
                {optimizationTasks.map((task) => (
                  <article key={task.id} className={styles.optimizationTaskCard}>
                    <div className={styles.optimizationTaskInfo}>
                      <span className={styles.optimizationBadge}>Optimization</span>
                      <strong>{task.title}</strong>
                      <p>{task.content}</p>
                      <span className={styles.optimizationReason}>{task.triggerReason}</span>
                    </div>
                    <div className={styles.optimizationTaskActions}>
                      <button type="button" className={styles.approveBtn} onClick={() => handleOptimizationTask(task.id, 'approve')}>
                        ✅ 通过
                      </button>
                      <button type="button" className={styles.rejectBtn} onClick={() => handleOptimizationTask(task.id, 'reject')}>
                        ✕ 驳回
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {filteredItems.length === 0 ? (
              <EmptyState
                icon="📋"
                title="当前筛选下没有审批项"
                description="可以切换状态筛选，或者先去 AI 招商和工作流里触发新的审批动作。"
              />
            ) : (
              filteredItems.map((approval, index) => {
                const typeMeta = TYPE_META[approval.type] || TYPE_META.policy;
                const statusMeta = STATUS_META[approval.status] || STATUS_META.pending;
                const riskMeta = RISK_META[approval.riskLevel] || RISK_META.medium;
                const isExpanded = expandedId === approval.id;
                const isSelected = selectedIds.has(approval.id);
                const expiryLabel = approval.status === 'pending' ? formatCountdown(approval.expiresAt) : null;
                const typeTags = [
                  typeMeta.label,
                  approval.objectType === 'event' ? '招商会议'
                    : approval.objectType === 'playbook' ? '招商方案'
                      : approval.objectType === 'lead' ? '招商任务'
                        : approval.objectType === 'referral_program' ? '裂变规则'
                          : approval.objectType === 'skill' ? 'Skill 激活'
                            : approval.objectType || '审批对象',
                  approval.sourceAgent,
                ].filter(Boolean);

                return (
                  <article
                    key={approval.id}
                    className={`${styles.approvalCard} ${isSelected ? styles.approvalCardSelected : ''} animate-fadeInUp`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className={styles.cardHeader} onClick={() => {
                      setExpandedId(isExpanded ? null : approval.id);
                      setSelectedAlternative(approval.selectedAlternative || '');
                      setThresholdDraft(approval.thresholdValue || '');
                      setDecisionReason(approval.decisionReason || '');
                    }}>
                      <div className={styles.cardLeft}>
                        {approval.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(approval.id); }}
                            className={styles.checkbox}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div
                          className={styles.cardAvatar}
                          style={{ background: `linear-gradient(135deg, ${typeMeta.color}, #0f172a)` }}
                        >
                          {typeMeta.icon || (approval.objectName || '审批').slice(0, 2)}
                        </div>
                        <div className={styles.cardInfo}>
                          <h3 className={styles.cardTitle}>{approval.title}</h3>
                          <div className={styles.tagRow}>
                            {typeTags.map((tag) => (
                              <span
                                key={`${approval.id}-${tag}`}
                                className={styles.typeBadge}
                                style={{ color: typeMeta.color, background: typeMeta.bg }}
                              >
                                {tag}
                              </span>
                            ))}
                            <span className={styles.metaPill} style={{ color: riskMeta.color, background: riskMeta.bg }}>
                              {riskMeta.label}
                            </span>
                            {expiryLabel ? (
                              <span className={styles.metaPill} style={{ color: '#b45309', background: '#fffbeb' }}>
                                {expiryLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className={styles.recBubble}>
                      <span className={styles.recIcon}>🤖</span>
                      <span className={styles.recText}>{approval.recommendation || approval.description}</span>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.footerTime}>⏱ {formatDateTime(approval.createdAt)}</span>
                      <span className={styles.footerTarget}>
                        👤 {approval.objectName || approval.objectType || '审批对象'}
                      </span>
                    </div>

                    {approval.status === 'pending' && (
                      <div className={styles.actionRow}>
                        <button
                          type="button"
                          className={styles.approveBtn}
                          onClick={(e) => { e.stopPropagation(); handleDecision(approval.id, 'approved'); }}
                        >
                          ✅ 通过
                        </button>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={(e) => { e.stopPropagation(); setExpandedId(approval.id); }}
                        >
                          ✏️ 编辑后通过
                        </button>
                        <button
                          type="button"
                          className={styles.rejectBtn}
                          onClick={(e) => { e.stopPropagation(); handleDecision(approval.id, 'rejected'); }}
                        >
                          ✕ 驳回
                        </button>
                      </div>
                    )}

                    {isExpanded && (
                      <div className={styles.expandedDetail}>
                        <div className={styles.detailGrid}>
                          <div className={styles.infoBlock}>
                            <span className={styles.infoLabel}>来源 Agent</span>
                            <strong>{approval.sourceAgent}</strong>
                          </div>
                          <div className={styles.infoBlock}>
                            <span className={styles.infoLabel}>影响范围</span>
                            <span>{approval.impact}</span>
                          </div>
                        </div>
                        {(approval.alternatives || []).length > 0 && (
                          <div className={styles.altSection}>
                            <span className={styles.altLabel}>替代方案：</span>
                            <div className={styles.altList}>
                              {approval.alternatives.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className={`${styles.altBtn} ${selectedAlternative === option ? styles.altBtnActive : ''}`}
                                  onClick={() => setSelectedAlternative(option)}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                            {selectedAlternative && approval.status === 'pending' && (
                              <button
                                className={styles.approveBtn}
                                style={{ marginTop: 8 }}
                                onClick={() => handleEditDecision(approval.id, 'select_alternative')}
                              >
                                采用替代方案并通过
                              </button>
                            )}
                          </div>
                        )}
                        {approval.status === 'pending' && (
                          <div className={styles.thresholdSection}>
                            <span className={styles.altLabel}>调整阈值：</span>
                            <input
                              type="text"
                              value={thresholdDraft}
                              onChange={(event) => setThresholdDraft(event.target.value)}
                              placeholder="例如：频次降为 2 次 / 预算上限改为 3 万"
                              className={styles.thresholdInput}
                            />
                            <textarea
                              value={decisionReason}
                              onChange={(event) => setDecisionReason(event.target.value)}
                              placeholder="填写审批说明，可选"
                              className={styles.reasonInput}
                            />
                            <div className={styles.editActions}>
                              <button
                                type="button"
                                className={styles.editBtn}
                                onClick={() => handleEditDecision(approval.id, 'change_threshold')}
                                disabled={!thresholdDraft.trim()}
                              >
                                调整阈值后通过
                              </button>
                              <button
                                type="button"
                                className={styles.approveBtn}
                                onClick={() => handleDecision(approval.id, 'approved')}
                              >
                                保持原方案通过
                              </button>
                            </div>
                          </div>
                        )}
                        <div className={styles.detailLinkRow}>
                          <Link
                            href={`/approvals/${approval.id}`}
                            className={styles.detailLink}
                          >
                            查看审批详情
                          </Link>
                        </div>
                      </div>
                    )}

                    {approval.status !== 'pending' && approval.decidedAt && (
                      <div className={styles.historyBar}>
                        <span>处理时间：{formatDateTime(approval.decidedAt)}</span>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </>
        )}
      </section>
    </div>
  );
}
