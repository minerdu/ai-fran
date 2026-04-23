'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EngineStatusCard, ReportEntryCard, StatusIndicatorStrip } from './OpsCards';
import styles from './OpsOverview.module.css';

function toneClassName(tone) {
  if (tone === 'success') return styles.statusSuccess;
  if (tone === 'warning') return styles.statusWarning;
  return styles.statusNeutral;
}

export default function EngineOverviewClient() {
  const [data, setData] = useState(null);
  const [engineLive, setEngineLive] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetch('/api/reports/aggregate')
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .catch((error) => console.error(error));

    // Also fetch live engine status
    fetch('/api/cron/autonomous-engine')
      .then((res) => res.json())
      .then((live) => setEngineLive(live))
      .catch(() => {});
  }, []);

  const handleManualRun = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/cron/autonomous-engine');
      const result = await res.json();
      setEngineLive(result);
    } catch (e) { console.error(e); }
    setIsRunning(false);
  };

  if (!data) {
    return <div className={styles.page}>加载中...</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>我的 &gt; AI 智能招商</p>
            <h1 className={styles.heroTitle}>AI 自主招商引擎监控</h1>
            <p className={styles.heroDesc}>
              监控 9 个招商旅程环节、当前规则对自动化边界的影响，以及与报告中心联动的关键输出。
            </p>
          </div>
          <Link href="/me" className={styles.backLink}>← 返回我的</Link>
        </div>
      </section>

      <StatusIndicatorStrip items={data.statusStrip} />

      {/* Live Autonomous Engine Status */}
      <section className={styles.section} style={{ marginTop: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>9 旅程自主引擎 · 实时状态</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
              {engineLive?.status === 'success'
                ? `✅ 已创建 ${engineLive.tasksCreated} 个任务 · 覆盖 ${engineLive.coverageRate} 旅程`
                : engineLive?.status === 'idle'
                  ? '💤 无活跃线索需要处理'
                  : '⏳ 等待引擎首次运行'}
            </div>
            {engineLive?.scanned > 0 && (
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                扫描 {engineLive.scanned} 条线索 · 跳过 {engineLive.skipped || 0} · 错误 {engineLive.errors || 0}
              </div>
            )}
          </div>
          <button
            onClick={handleManualRun}
            disabled={isRunning}
            style={{
              padding: '8px 20px',
              background: isRunning ? '#475569' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isRunning ? '⏳ 运行中...' : '▶ 手动触发'}
          </button>
        </div>
      </section>

      <EngineStatusCard engine={data.engine} />

      <section className={styles.entryGrid}>
        {data.reportEntries.map((entry) => (
          <ReportEntryCard key={entry.id} entry={entry} />
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>9 个招商旅程</h2>
          <span className={styles.sectionMeta}>从线索接待到沉默激活</span>
        </div>
        <div className={styles.journeyGrid}>
          {data.engine.journeys.map((journey) => (
            <article key={journey.id} className={styles.journeyCard}>
              <div className={styles.journeyHead}>
                <h3 className={styles.journeyTitle}>{journey.label}</h3>
                <span className={`${styles.journeyState} ${toneClassName(journey.status)}`}>
                  {journey.status === 'warning' ? '待处理' : journey.status === 'success' ? '运行中' : '待启动'}
                </span>
              </div>
              <div className={styles.journeyNums}>
                <strong>{journey.activeCount}</strong>
                <span>运行组</span>
              </div>
              <p className={styles.journeySummary}>{journey.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>关键检查点</h2>
        </div>
        <div className={styles.cardList}>
          {data.engine.checkpoints.map((item) => (
            <article key={item.label} className={styles.metricCard}>
              <div className={styles.metricValue}>{item.value}</div>
              <div className={styles.metricTitle}>{item.label}</div>
              <p className={styles.metricDesc}>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>规则影响</h2>
          <span className={styles.sectionMeta}>改规则会如何影响 Agent 与报告</span>
        </div>
        <div className={styles.cardList}>
          {data.engine.ruleImpacts.map((item) => (
            <article key={item.title} className={styles.ruleCard}>
              <div className={styles.ruleTitleRow}>
                <h3 className={styles.ruleTitle}>{item.title}</h3>
                <span className={`${styles.ruleTag} ${toneClassName(item.tone)}`}>
                  {item.tone === 'warning' ? '高影响' : '联动中'}
                </span>
              </div>
              <p className={styles.ruleDesc}>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
