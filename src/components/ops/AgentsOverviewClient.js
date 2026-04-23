'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ReportEntryCard, StatusIndicatorStrip } from './OpsCards';
import PersonaSettings from '@/components/settings/PersonaSettings';
import AiModelSettings from '@/components/settings/AiModelSettings';
import MomentsAgentConfigCard from '@/components/settings/MomentsAgentConfigCard';
import RedLineConfigCard from '@/components/settings/RedLineConfigCard';
import styles from './OpsOverview.module.css';

function toneClassName(tone) {
  if (tone === 'success') return styles.statusSuccess;
  if (tone === 'warning') return styles.statusWarning;
  return styles.statusNeutral;
}

export default function AgentsOverviewClient() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/reports/aggregate')
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .catch((error) => console.error(error));
  }, []);

  if (!data) {
    return <div className={styles.page}>加载中...</div>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>我的 &gt; AI 智能招商</p>
            <h1 className={styles.heroTitle}>AI 智能体中心</h1>
            <p className={styles.heroDesc}>
              汇总自主引擎 Agent、人工指令 Agent 和 AI 报告入口，便于从“我的”统一查看运行中的智能体与产出结果。
            </p>
          </div>
          <Link href="/me" className={styles.backLink}>← 返回我的</Link>
        </div>
      </section>

      <StatusIndicatorStrip items={data.statusStrip} />

      <section className={styles.entryGrid}>
        {data.reportEntries.map((entry) => (
          <ReportEntryCard key={entry.id} entry={entry} />
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>自主引擎 Agent</h2>
          <span className={styles.sectionMeta}>{data.autonomousAgents.length} 个运行中 / 待处理 Agent</span>
        </div>
        <div className={styles.cardList}>
          {data.autonomousAgents.map((agent) => (
            <article key={agent.id} className={styles.agentCard}>
              <div className={styles.agentHeader}>
                <div>
                  <h3 className={styles.agentTitle}>{agent.title}</h3>
                  <p className={styles.agentMeta}>{agent.owner} · {agent.stageLabel}</p>
                </div>
                <span className={`${styles.agentStatus} ${toneClassName(agent.tone)}`}>{agent.statusLabel}</span>
              </div>
              <p className={styles.agentScope}>{agent.scope}</p>
              <div className={styles.agentFoot}>
                <span>当前步骤：{agent.currentStep}</span>
                <span>启动于：{agent.startedAt}</span>
              </div>
              <div className={styles.agentAction}>下一步：{agent.recommendedAction}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>人工指令 Agent</h2>
          <span className={styles.sectionMeta}>{data.manualAgents.length} 个按用户指令运行的 Agent</span>
        </div>
        <div className={styles.cardList}>
          {data.manualAgents.map((agent) => (
            <article key={agent.id} className={styles.agentCard}>
              <div className={styles.agentHeader}>
                <div>
                  <h3 className={styles.agentTitle}>{agent.title}</h3>
                  <p className={styles.agentMeta}>{agent.owner} · {agent.stageLabel}</p>
                </div>
                <span className={`${styles.agentStatus} ${toneClassName(agent.tone)}`}>{agent.statusLabel}</span>
              </div>
              <p className={styles.agentScope}>{agent.scope}</p>
              <div className={styles.agentFoot}>
                <span>触发方式：{agent.triggerLabel}</span>
                <span>启动于：{agent.startedAt}</span>
              </div>
              <div className={styles.agentAction}>下一步：{agent.recommendedAction}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>AI 智能体配置</h2>
          <span className={styles.sectionMeta}>按计划收口到 /me/agents</span>
        </div>
        <div className={styles.cardList}>
          <div className={styles.embedCard}>
            <PersonaSettings onBack={() => {}} />
          </div>
          <div className={styles.embedCard}>
            <MomentsAgentConfigCard />
          </div>
          <div className={styles.embedCard}>
            <RedLineConfigCard />
          </div>
          <div className={styles.embedCard}>
            <AiModelSettings onBack={() => {}} />
          </div>
        </div>
      </section>
    </div>
  );
}
