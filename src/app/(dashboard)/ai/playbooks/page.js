'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useStore from '@/lib/store';
import styles from './page.module.css';

const STATUS_META = {
  draft: { label: '草稿', color: '#64748b', bg: '#f8fafc' },
  pending_approval: { label: '审批中', color: '#b45309', bg: '#fffbeb' },
  approved: { label: '已发布', color: '#166534', bg: '#f0fdf4' },
  executing: { label: '执行中', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: '已完成', color: '#0f766e', bg: '#ecfdf5' },
};

const ASSET_ICONS = {
  handbook: '📖',
  poster: '🎨',
  xiaohongshu: '📱',
  video_script: '🎬',
  faq: '❓',
  case_study: '📊',
  referral_kit: '🎁',
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'pending_approval', label: '审批中' },
  { key: 'approved', label: '已发布' },
  { key: 'executing', label: '执行中' },
];

export default function PlaybooksPage() {
  const playbooks = useStore((s) => s.playbooks);
  const [activeFilter, setActiveFilter] = useState('all');
  const [optimizationTasks, setOptimizationTasks] = useState([]);

  useEffect(() => {
    fetch('/api/tasks')
      .then((res) => res.json())
      .then((tasks) => {
        const next = (Array.isArray(tasks) ? tasks : []).filter((task) =>
          /来源扩量计划|AI 优化建议/.test(`${task.triggerReason || ''} ${task.title}`)
        );
        setOptimizationTasks(next);
      })
      .catch(() => setOptimizationTasks([]));
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return playbooks;
    return playbooks.filter((p) => p.status === activeFilter);
  }, [playbooks, activeFilter]);

  const counts = useMemo(() => {
    const c = { all: playbooks.length };
    playbooks.forEach((p) => {
      c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }, [playbooks]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Playbook 方案中心</p>
          <h1 className={styles.heroTitle}>AI 生成的招商方案对比、审批发布与执行跟踪</h1>
          <p className={styles.heroDesc}>
            每次方案生成包含 3 套策略变体（进取/稳健/保守），系统会预测签约率与 ROI，审批发布后自动进入执行链路。
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/ai" className={styles.backLink}>← 返回 AI 招商</Link>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>方案总数</span>
          <strong className={styles.kpiValue} style={{ color: '#2563eb' }}>{playbooks.length}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>审批中</span>
          <strong className={styles.kpiValue} style={{ color: '#b45309' }}>{counts.pending_approval || 0}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>草稿</span>
          <strong className={styles.kpiValue} style={{ color: '#64748b' }}>{counts.draft || 0}</strong>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>执行中</span>
          <strong className={styles.kpiValue} style={{ color: '#0f766e' }}>{counts.executing || 0}</strong>
        </article>
      </section>

      {optimizationTasks.length > 0 && (
        <section className={styles.optimizationBanner}>
          <div>
            <div className={styles.optimizationTitle}>优化建议已生成 Playbook 相关任务</div>
            <div className={styles.optimizationDesc}>
              当前有 {optimizationTasks.length} 条由优化建议触发的方案/扩量任务，已进入执行链路。
            </div>
          </div>
          <div className={styles.optimizationTaskList}>
            {optimizationTasks.slice(0, 3).map((task) => (
              <div key={task.id} className={styles.optimizationTaskChip}>
                <span>{task.title}</span>
                <span>{task.approvalStatus === 'pending' ? '待审批' : task.executeStatus}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.filterBar}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`${styles.filterChip} ${activeFilter === f.key ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
            <span className={styles.filterCount}>{counts[f.key] || 0}</span>
          </button>
        ))}
      </section>

      <section className={styles.playbookList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span style={{ fontSize: 40 }}>📋</span>
            <p>当前筛选下没有方案</p>
          </div>
        ) : (
          filtered.map((pb, idx) => {
            const statusMeta = STATUS_META[pb.status] || STATUS_META.draft;
            return (
              <Link
                href={`/ai/playbooks/${pb.id}`}
                key={pb.id}
                className={`${styles.playbookCard} animate-fadeInUp`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{pb.title}</h3>
                    {optimizationTasks.some((task) => /来源扩量计划/.test(task.triggerReason || '')) && idx === 0 ? (
                      <span className={styles.fromOptimization}>来自优化建议</span>
                    ) : null}
                  </div>
                  <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
                    {statusMeta.label}
                  </span>
                </div>

                <p className={styles.cardStrategy}>{pb.strategy}</p>

                <div className={styles.cardMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>预测签约率</span>
                    <strong className={styles.metricValue}>{pb.predictedSignRate}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>预测 ROI</span>
                    <strong className={styles.metricValue}>{pb.predictedROI}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>目标线索</span>
                    <strong className={styles.metricValue}>{pb.targetLeads}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>预算</span>
                    <strong className={styles.metricValue}>{pb.budget}</strong>
                  </div>
                </div>

                {pb.milestones && (
                  <div className={styles.milestoneBar}>
                    {pb.milestones.map((m, i) => (
                      <div key={i} className={`${styles.milestoneStep} ${styles[`ms_${m.status}`]}`}>
                        <div className={styles.milestoneDot} />
                        <span className={styles.milestoneName}>{m.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {pb.assets && (
                  <div className={styles.assetRow}>
                    {pb.assets.slice(0, 4).map((a, i) => (
                      <span key={i} className={styles.assetChip} title={a.name}>
                        {ASSET_ICONS[a.type] || '📄'} {a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name}
                      </span>
                    ))}
                    {pb.assets.length > 4 && (
                      <span className={styles.assetMore}>+{pb.assets.length - 4}</span>
                    )}
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <span>{pb.targetRegion} · {pb.skillVersion}</span>
                  <span className={styles.cardArrow}>→</span>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
