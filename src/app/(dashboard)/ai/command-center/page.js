'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/common/EmptyState';
import styles from './page.module.css';

const INTENT_META = {
  lead_filter_and_invite: { label: '线索筛选与邀约', color: '#2563eb', icon: '🎯' },
  approval_query: { label: '审批查询', color: '#b45309', icon: '📋' },
  playbook_generate: { label: 'Playbook 生成', color: '#7c3aed', icon: '📊' },
  analytics_report: { label: '数据分析', color: '#0f766e', icon: '📈' },
  asset_delivery: { label: '资料外发', color: '#0ea5e9', icon: '📦' },
};

const STATUS_META = {
  completed: { label: '已完成', color: '#166534', bg: '#f0fdf4' },
  pending_approval: { label: '待审批', color: '#b45309', bg: '#fffbeb' },
  running: { label: '执行中', color: '#2563eb', bg: '#eff6ff' },
  failed: { label: '失败', color: '#b91c1c', bg: '#fef2f2' },
};

const OBJ_ROUTES = {
  lead: '/leads',
  approval: '/approvals',
  playbook: '/ai/playbooks',
};

function formatTime(value) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function CommandCenterPage() {
  const [aiCommands, setAiCommands] = useState([]);
  const [commandInput, setCommandInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [quickCommands, setQuickCommands] = useState([]);

  const loadCommands = useCallback(() => {
    fetch('/api/reports/aggregate', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setAiCommands(Array.isArray(payload.latestCommands) ? payload.latestCommands : []))
      .catch(() => setAiCommands([]));
  }, []);

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  useEffect(() => {
    fetch('/api/ai-command/catalog', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setQuickCommands(Array.isArray(payload.quickActions) ? payload.quickActions : []))
      .catch(() => setQuickCommands([]));
  }, []);

  const handleSubmit = async () => {
    if (!commandInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandInput,
          current_tab: 'ai',
          workspace_id: 'franchise_default',
          brand_id: 'brand_default',
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || '指令执行失败');
      }
      if (payload.command) {
        setLatestResult(payload.command);
        setAiCommands((current) => [payload.command, ...current.filter((item) => item.id !== payload.command.id)]);
        setExpandedId(payload.command.id);
      }
      setCommandInput('');
      loadCommands();
    } catch (error) {
      setLatestResult({
        id: `local_error_${Date.now()}`,
        input: commandInput,
        intent: 'error',
        status: 'failed',
        resultSummary: error.message,
        createdAt: new Date().toISOString(),
        linkedObjects: [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sortedCommands = useMemo(() => {
    return [...aiCommands].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [aiCommands]);

  const stats = useMemo(() => ({
    total: aiCommands.length,
    completed: aiCommands.filter((c) => c.status === 'completed').length,
    pending: aiCommands.filter((c) => c.status === 'pending_approval').length,
  }), [aiCommands]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>AI 任务中心</p>
          <h1 className={styles.heroTitle}>自然语言指令历史与执行结果追踪</h1>
          <p className={styles.heroDesc}>
            每条 AI 指令都会被解析为业务意图，关联到具体的线索、审批、Playbook 或 AgentRun，并记录执行结果。
          </p>
        </div>
        <Link href="/ai" className={styles.backLink}>← 返回 AI 招商</Link>
      </section>

      <section className={styles.kpiRow}>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>总指令</span>
          <strong style={{ color: '#2563eb' }}>{stats.total}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>已完成</span>
          <strong style={{ color: '#166534' }}>{stats.completed}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>待审批</span>
          <strong style={{ color: '#b45309' }}>{stats.pending}</strong>
        </article>
      </section>

      <section className={styles.composeCard}>
        <div className={styles.composeHead}>
          <div>
            <span className={styles.composeLabel}>发起 AI 指令</span>
            <h2 className={styles.composeTitle}>把自然语言直接编排成招商动作或多步 SOP</h2>
          </div>
          <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={submitting || !commandInput.trim()}>
            {submitting ? '执行中...' : '发送给 AI'}
          </button>
        </div>
        <textarea
          className={styles.composeInput}
          value={commandInput}
          onChange={(event) => setCommandInput(event.target.value)}
          placeholder="例如：把沉默超过 7 天的线索做 3 步唤醒 SOP，并优先覆盖华南区高预算人群"
        />
        <div className={styles.quickList}>
          {quickCommands.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.quickChip}
              onClick={() => setCommandInput(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {latestResult ? (
          <div className={styles.latestResult}>
            <span className={styles.resultLabel}>最近一次返回结果</span>
            <strong>{latestResult.input}</strong>
            <p>{latestResult.resultSummary}</p>
          </div>
        ) : null}
      </section>

      <section className={styles.commandList}>
        {sortedCommands.length === 0 ? (
          <EmptyState
            icon="🧠"
            title="还没有 AI 指令历史"
            description="可以先发送一条自然语言招商指令，系统会把结果卡、关联对象和执行摘要统一写入这里。"
          />
        ) : sortedCommands.map((cmd, idx) => {
          const intentMeta = INTENT_META[cmd.intent] || { label: cmd.intent, color: '#64748b', icon: '💡' };
          const statusMeta = STATUS_META[cmd.status] || STATUS_META.completed;
          const isExpanded = expandedId === cmd.id;

          return (
            <article
              key={cmd.id}
              className={`${styles.commandCard} ${isExpanded ? styles.expanded : ''} animate-fadeInUp`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <button className={styles.commandHeader} onClick={() => setExpandedId(isExpanded ? null : cmd.id)}>
                <div className={styles.commandLeft}>
                  <span className={styles.intentIcon}>{intentMeta.icon}</span>
                  <div className={styles.commandMeta}>
                    <span className={styles.commandInput}>{cmd.input}</span>
                    <div className={styles.commandTags}>
                      <span className={styles.intentTag} style={{ color: intentMeta.color }}>
                        {intentMeta.label}
                      </span>
                      <span className={styles.timeTag}>{formatTime(cmd.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.commandRight}>
                  <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
                    {statusMeta.label}
                  </span>
                  <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>▾</span>
                </div>
              </button>

              {isExpanded && (
                <div className={styles.commandBody}>
                  <div className={styles.resultBlock}>
                    <span className={styles.resultLabel}>执行结果</span>
                    <p className={styles.resultText}>{cmd.resultSummary}</p>
                  </div>

                  {cmd.linkedObjects?.length > 0 && (
                    <div className={styles.linkedSection}>
                      <span className={styles.resultLabel}>关联对象</span>
                      <div className={styles.linkedList}>
                        {cmd.linkedObjects.map((obj, i) => (
                          <Link
                            key={i}
                            href={obj.href || OBJ_ROUTES[obj.type] || '/ai'}
                            className={styles.linkedChip}
                          >
                            <span className={styles.linkedType}>{obj.type === 'lead' ? '线索' : obj.type === 'approval' ? '审批' : obj.type === 'playbook' ? '方案' : obj.type}</span>
                            <span>{obj.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.refRow}>
                    {cmd.execution?.targetCount ? <span className={styles.refChip}>目标线索: {cmd.execution.targetCount}</span> : null}
                    {cmd.execution?.tasksCreated ? <span className={styles.refChip}>生成任务: {cmd.execution.tasksCreated}</span> : null}
                    {cmd.execution?.pendingManual ? (
                      <Link href="/approvals" className={styles.refChipLink}>
                        待审批: {cmd.execution.pendingManual}
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
