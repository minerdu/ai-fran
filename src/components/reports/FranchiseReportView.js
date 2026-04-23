'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/basePath';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';

import styles from './FranchiseReportView.module.css';

const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconTrendingUp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconFilter = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconCompass = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
const IconPieChart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
const IconTarget = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconZap = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconAlertCircle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconWrench = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconBot = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>;
const IconUser = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconRefreshCcw = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>;
const IconCheckCircle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconShield = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

export default function FranchiseReportView({
  backHref = '/me',
  backLabel = '返回',
  title = '招商报告中心',
  eyebrow = 'AI 招商',
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('day');
  const [activeTab, setActiveTab] = useState('report');

  const loadData = useCallback(() => {
    setError('');
    apiFetch(`/api/reports/aggregate?date=${selectedDate}&viewMode=${viewMode}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`报告接口返回 ${res.status}`);
        }
        const payload = await res.json();
        setData(payload);
      })
      .catch((fetchError) => {
        console.error(fetchError);
        setError('招商报告加载失败，请刷新后重试。');
      });
  }, [selectedDate, viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  const handleSuggestionAction = async (id, action) => {
    await apiFetch('/api/optimization-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    loadData();
  };

  if (!data) {
    return <div className={styles.page}>{error || '加载中...'}</div>;
  }

  const { report, reportEntries, statusStrip, attribution, stageAttribution, anomalies, optimizationSuggestions } = data;

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroTop} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href={backHref} className={styles.backLink} style={{ margin: 0 }}>
              ← 返回
            </Link>
            <h1 className={styles.heroTitle} style={{ margin: 0 }}>AI招商报告</h1>
          </div>
          <div className={styles.dateRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.heroControls}>
          <div className={styles.tabRow}>
            {['day', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles.tabBtn} ${viewMode === mode ? styles.tabBtnActive : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'day' ? '按日视图' : mode === 'week' ? '按周视图' : '按月视图'}
              </button>
            ))}
          </div>
        </div>
      </section>



      <section className={styles.tabCardsContainer}>
        <div 
          className={`${styles.tabCard} ${activeTab === 'report' ? styles.tabCardActive : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <div className={styles.tabCardTitle}>招商报告</div>
          <div className={styles.tabCardDesc}>汇总日报、漏斗趋势、重点线索及建议</div>
        </div>
        <div 
          className={`${styles.tabCard} ${activeTab === 'agent' ? styles.tabCardActive : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          <div className={styles.tabCardTitle}>AI自主招商Agent状态</div>
          <div className={styles.tabCardDesc}>全链路招商旅程状态与引擎监控</div>
        </div>
      </section>

      {activeTab === 'report' && (
        <>
          <section className={styles.statsGrid}>
        {[
          { label: '线索总数', value: report.totalLeads, tone: styles.blue },
          { label: '今日新增', value: report.newLeads, tone: styles.green },
          { label: '高意向', value: report.highIntentLeads, tone: styles.purple },
          { label: '线索互动', value: report.totalMessages, tone: styles.orange },
          { label: 'AI 跟进', value: report.aiReplies, tone: styles.amber },
          { label: '待审批', value: report.pendingApprovals, tone: styles.red },
          { label: '签约 Pipeline', value: report.signingPipeline, tone: styles.blue },
          { label: '转化率', value: report.conversionRate, tone: styles.green },
        ].map((item) => (
          <article key={item.label} className={styles.statCard}>
            <span className={styles.statLabel}>{item.label}</span>
            <strong className={`${styles.statValue} ${item.tone}`}>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className={`${styles.card} ${styles.cardThemeOverview}`}>
        <h2 className={styles.cardTitle}><IconSparkles/> AI 招商摘要</h2>
        <p className={styles.summaryText}>{report.aiSummary}</p>
      </section>

      <section className={styles.doubleGrid}>
        <article className={`${styles.card} ${styles.cardThemeOverview}`}>
          <h2 className={styles.cardTitle}><IconTrendingUp/> 会话趋势</h2>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={report.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area type="monotone" dataKey="messages" stroke="#2563eb" fill="rgba(37, 99, 235, 0.15)" strokeWidth={3} />
                <Area type="monotone" dataKey="aiReplies" stroke="#22c55e" fill="rgba(34, 197, 94, 0.12)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardThemeOverview}`}>
          <h2 className={styles.cardTitle}><IconFilter/> 招商漏斗</h2>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.funnelData} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569' }} width={62} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className={styles.doubleGrid}>
        <article className={`${styles.card} ${styles.cardThemeAttribution}`}>
          <h2 className={styles.cardTitle}><IconCompass/> 来源归因</h2>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="qualified" name="已建档" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                <Bar dataKey="visits" name="已考察" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                <Bar dataKey="signed" name="已签约" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.miniList}>
            {attribution.map((item) => (
              <div key={item.source} className={styles.miniRow}>
                <span>{item.source}</span>
                <span>{item.roi}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardThemeAttribution}`}>
          <h2 className={styles.cardTitle}><IconPieChart/> 阶段归因</h2>
          <div className={styles.stageList}>
            {stageAttribution.map((item) => (
              <div key={item.stage} className={styles.stageItem}>
                <div className={styles.stageHead}>
                  <div>
                    <div className={styles.itemTitle}>{item.stage}</div>
                    <div className={styles.stageMeta}>{item.owner}</div>
                  </div>
                  <span className={styles.lossTag}>流失 {item.dropoffRate}</span>
                </div>
                <div className={styles.stageNums}>
                  <span>进入 {item.inflow}</span>
                  <span>流出 {item.outflow}</span>
                </div>
                <p className={styles.itemDesc}>{item.cause}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={`${styles.card} ${styles.cardThemeInsights}`}>
        <h2 className={styles.cardTitle}><IconTarget/> 重点跟进线索</h2>
        <div className={styles.listCol}>
          {report.keyLeads.map((lead) => (
            <div key={lead.name} className={styles.listItem}>
              <div>
                <div className={styles.itemTitle}>{lead.name}</div>
                <div className={styles.itemDesc}>{lead.reason}</div>
              </div>
              <span className={styles.actionTag}>{lead.action}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.card} ${styles.cardThemeInsights}`}>
        <h2 className={styles.cardTitle}><IconSearch/> 高频关键词</h2>
        <div className={styles.keywordCloud}>
          {report.highFreqKeywords.map((item, index) => (
            <span
              key={item}
              className={styles.keyword}
              style={{
                fontSize: `${Math.max(14, 22 - index * 2)}px`,
                opacity: Math.max(0.62, 1 - index * 0.08),
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className={`${styles.card} ${styles.cardThemeInsights}`}>
        <h2 className={styles.cardTitle}><IconZap/> AI 推荐动作</h2>
        <div className={styles.listCol}>
          {report.aiSuggestions.map((item) => (
            <div key={item.title} className={styles.listItem}>
              <div>
                <div className={styles.itemTitle}>{item.title}</div>
                <div className={styles.itemDesc}>{item.desc}</div>
              </div>
              <span className={styles.linkAction}>{item.link}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.card} ${styles.cardThemeOptimization}`}>
        <h2 className={styles.cardTitle}><IconAlertCircle/> 异常解释</h2>
          <div className={styles.listCol}>
            {anomalies.map((item) => (
              <div key={item.id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{item.title}</div>
                  <div className={styles.itemDesc}>{item.detail}</div>
                </div>
                <span className={`${styles.severityTag} ${item.severity === 'high' ? styles.highSeverity : item.severity === 'medium' ? styles.mediumSeverity : styles.lowSeverity}`}>
                  {item.severity === 'high' ? '高' : item.severity === 'medium' ? '中' : '低'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.card} ${styles.cardThemeOptimization}`}>
          <h2 className={styles.cardTitle}><IconWrench/> 下一轮优化建议</h2>
          <div className={styles.optimizationList}>
            {optimizationSuggestions.map((item) => (
              <div key={item.id} className={styles.optimizationCard}>
                <div className={styles.optimizationHead}>
                  <span className={styles.priorityTag}>{item.priority}</span>
                  <span className={styles.ownerTag}>{item.owner}</span>
                </div>
                <div className={styles.itemTitle}>{item.title}</div>
                <div className={styles.optimizationImpact}>{item.expectedImpact}</div>
                <p className={styles.itemDesc}>{item.reason}</p>
                <div className={styles.optimizationAction}>{item.nextAction}</div>
                <div className={styles.optimizationFooter}>
                  <span className={`${styles.statusTag} ${item.status === 'launch' ? styles.statusLaunch : item.status === 'accept' ? styles.statusAccept : item.status === 'dismiss' ? styles.statusDismiss : styles.statusSuggested}`}>
                    {item.statusLabel}
                  </span>
                  <div className={styles.optimizationButtons}>
                    <button type="button" className={styles.inlineActionBtn} onClick={() => handleSuggestionAction(item.id, 'accept')}>采纳</button>
                    <button type="button" className={styles.inlineActionBtn} onClick={() => handleSuggestionAction(item.id, 'dismiss')}>忽略</button>
                    <button type="button" className={`${styles.inlineActionBtn} ${styles.inlineActionPrimary}`} onClick={() => handleSuggestionAction(item.id, 'launch')}>标记已执行</button>
                  </div>
                </div>
                {item.launchTaskTitle && (
                  <div className={styles.executionHint}>
                    <span>已生成任务：{item.launchTaskTitle}</span>
                    {item.launchHref && <Link href={item.launchHref}>查看入口 →</Link>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </>
      )}

      {activeTab === 'agent' && (
        <>
          <section className={`${styles.card} ${styles.cardThemeOverview}`}>
            <h2 className={styles.cardTitle}><IconBot/> AI招商自主Agent运行状态</h2>
            {data.autonomousAgents.length === 0 ? (
              <div className={styles.summaryText}>当前无运行中的自主 Agent</div>
            ) : (
              <div className={styles.listCol}>
                {data.autonomousAgents.map((agent) => (
                  <div key={agent.id} className={styles.listItem}>
                    <div>
                      <div className={styles.itemTitle}>{agent.title}</div>
                      <div className={styles.itemDesc}>{agent.scope}</div>
                    </div>
                    <span className={`${styles.statusTag} ${agent.tone === 'success' ? styles.statusAccept : agent.tone === 'warning' ? styles.statusDismiss : styles.statusSuggested}`}>
                      {agent.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.cardThemeOverview}`}>
            <h2 className={styles.cardTitle}><IconUser/> 人工指令自主Agent状态</h2>
            {data.manualAgents.length === 0 ? (
              <div className={styles.summaryText}>当前无运行中的人工指令 Agent</div>
            ) : (
              <div className={styles.listCol}>
                {data.manualAgents.map((agent) => (
                  <div key={agent.id} className={styles.listItem}>
                    <div>
                      <div className={styles.itemTitle}>{agent.title}</div>
                      <div className={styles.itemDesc}>{agent.scope}</div>
                    </div>
                    <span className={`${styles.statusTag} ${agent.tone === 'success' ? styles.statusAccept : agent.tone === 'warning' ? styles.statusDismiss : styles.statusSuggested}`}>
                      {agent.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.cardThemeOptimization}`}>
            <h2 className={styles.cardTitle}><IconRefreshCcw/> 9个招商旅程状态</h2>
            <div className={styles.doubleGrid}>
              {data.engine.journeys.map((journey) => (
                <div key={journey.id} className={styles.stageItem}>
                  <div className={styles.stageHead}>
                    <div className={styles.itemTitle}>{journey.label}</div>
                    <span className={`${styles.statusTag} ${journey.status === 'success' ? styles.statusAccept : journey.status === 'warning' ? styles.statusDismiss : styles.statusSuggested}`}>
                      {journey.status === 'warning' ? '存在断点' : journey.status === 'success' ? '运行中' : '空闲'}
                    </span>
                  </div>
                  <div className={styles.itemDesc}>{journey.summary}</div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.doubleGrid}>
            <article className={`${styles.card} ${styles.cardThemeOptimization}`}>
              <h2 className={styles.cardTitle}><IconCheckCircle/> 关键检查点</h2>
              <div className={styles.listCol}>
                {data.engine.checkpoints.map((cp) => (
                  <div key={cp.label} className={styles.listItem}>
                    <div>
                      <div className={styles.itemTitle}>{cp.label}</div>
                      <div className={styles.itemDesc}>{cp.detail}</div>
                    </div>
                    <span className={styles.ownerTag}>{cp.value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className={`${styles.card} ${styles.cardThemeOptimization}`}>
              <h2 className={styles.cardTitle}><IconShield/> 规则影响</h2>
              <div className={styles.listCol}>
                {data.engine.ruleImpacts.map((rule) => (
                  <div key={rule.title} className={styles.listItem}>
                    <div>
                      <div className={styles.itemTitle}>{rule.title}</div>
                      <div className={styles.itemDesc}>{rule.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
