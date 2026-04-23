'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

const RUN_STATUS_META = {
  paused_for_approval: { label: '审批中', color: '#b45309', bg: '#fffbeb' },
  running: { label: '运行中', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: '已完成', color: '#166534', bg: '#f0fdf4' },
  failed: { label: '失败', color: '#b91c1c', bg: '#fef2f2' },
};

const FRANCHISE_STAGES = [
  { key: 'lead_capture', label: '线索接待', icon: '❄️', color: '#1890ff' },
  { key: 'qualification', label: '资格评估', icon: '🧾', color: '#0ea5e9' },
  { key: 'nurturing', label: '线索培育', icon: '💬', color: '#52c41a' },
  { key: 'policy_match', label: '政策匹配', icon: '🧮', color: '#8b5cf6' },
  { key: 'visit_invite', label: '总部考察', icon: '🎯', color: '#fa8c16' },
  { key: 'event_followup', label: '会务跟进', icon: '🏢', color: '#14b8a6' },
  { key: 'negotiation', label: '报价谈判', icon: '📑', color: '#ef4444' },
  { key: 'sign_push', label: '签约推进', icon: '📝', color: '#f5222d' },
  { key: 'silent_wake', label: '沉默激活', icon: '🔔', color: '#a0d911' },
];

export default function AiPage() {
  const router = useRouter();
  const [data, setData] = useState(null);

  const loadData = useCallback(() => {
    fetch('/api/reports/aggregate')
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuggestionAction = async (id, action) => {
    await fetch('/api/optimization-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    loadData();
  };

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: '招商方案', value: data.workflowSummary.readyPlaybooks, accent: '#2563eb' },
      { label: '招商任务', value: data.workflowSummary.activeRuns, accent: '#0f766e' },
      { label: '招商报告', value: data.report.aiSuggestions.length, accent: '#ca8a04' },
      { label: '审批中心', value: data.workflowSummary.pendingApprovals, accent: '#9333ea' },
    ];
  }, [data]);

  const recommendedPrompts = useMemo(() => {
    if (!data) return [];
    return data.optimizationSuggestions.map((item) => `${item.title}：${item.nextAction}`);
  }, [data]);

  if (!data) {
    return <div className={styles.aiPage}>加载中...</div>;
  }

  return (
    <div className={styles.aiPage}>
      {/* 1. Top 3 Parallel Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div 
          onClick={() => router.push('/me?tab=skill')}
          style={{ background: '#fff', borderRadius: '12px', padding: '20px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}
        >
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>🧠</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>招商标杆 Skill 库</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>一键调用行业顶尖品牌的招商逻辑，前往我的设置进行管理。</p>
        </div>
        
        <div 
          onClick={() => router.push('/me?tab=materials')}
          style={{ background: '#fff', borderRadius: '12px', padding: '20px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}
        >
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📄</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>招商方案</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>全链路物料与方案自动生成，前往招商文档设置。</p>
        </div>

        <div 
          onClick={() => router.push('/settings/report')}
          style={{ background: '#fff', borderRadius: '12px', padding: '20px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}
        >
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>招商报告</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>实时查看全盘招商漏斗与转化数据，前往招商报告中心。</p>
        </div>
      </div>

      {/* 2. Waterfall Layout for Meetings and Fission */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        
        {/* Meetings */}
        <section className={styles.waterfallSection} style={{ margin: 0 }}>
          <div className={styles.sectionHeaderLine}>
            <span className={styles.sectionIcon}>🎪</span>
            <h2 className={styles.waterfallTitle}>会议与邀约状态</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={styles.eventCard}>
              <div className={styles.eventDate}>
                <span className={styles.eventMonth}>5月</span>
                <span className={styles.eventDay}>15</span>
              </div>
              <div className={styles.eventInfo}>
                <span className={styles.eventName}>2026 华东大区创富峰会（线下）</span>
                <span className={styles.eventMeta}>杭州国际博览中心 · 预计规模 500 人</span>
                <div className={styles.eventFunnel}>
                  <span>已发邀约：1200</span>
                  <span>确认出席：185</span>
                  <span>跟进中：450</span>
                </div>
              </div>
            </div>
            <div className={styles.eventCard}>
              <div className={styles.eventDate}>
                <span className={styles.eventMonth}>本周</span>
                <span className={styles.eventDay}>三</span>
              </div>
              <div className={styles.eventInfo}>
                <span className={styles.eventName}>CEO 线上云招商大促（直播）</span>
                <span className={styles.eventMeta}>微信视频号直播 · 重点解答“低门槛入场”核心逻辑</span>
                <div className={styles.eventFunnel}>
                  <span>预约人数：3,240</span>
                  <span>AI 自动提醒：已配置</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fission */}
        <section className={styles.waterfallSection} style={{ margin: 0 }}>
          <div className={styles.sectionHeaderLine}>
            <span className={styles.sectionIcon}>🔗</span>
            <h2 className={styles.waterfallTitle}>裂变模型设计</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={styles.fissionCard}>
              <div className={styles.fissionTop}>
                <span className={styles.fissionName}>“推 N 返一”激励机制</span>
                <span className={styles.statusLive}>已激活</span>
              </div>
              <p className={styles.fissionDesc}>老加盟商推荐 3 家新店，全额返还首店加盟费。系统自动追踪推荐关系与开店进度。</p>
              <div className={styles.fissionStats}>
                <span>活跃参与：42 家</span>
                <span>新线索：156 条</span>
                <span>已达标：2 家</span>
              </div>
            </div>
            <div className={styles.fissionCard}>
              <div className={styles.fissionTop}>
                <span className={styles.fissionName}>区域合伙人赋能模型</span>
                <span className={styles.statusDraft}>策略运算中</span>
              </div>
              <p className={styles.fissionDesc}>赋予标杆店面“区域面试官”角色，按区域开拓成功数量给予股权或永久物料补贴。</p>
              <div className={styles.fissionStats}>
                <span style={{color: '#8b5cf6'}}>🤖 AI 建议筛选出 15 家候选标杆店，等待确认</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Autonomous Agent and Manual Agent Status */}
      <section className={styles.waterfallSection}>
        <div className={styles.sectionHeaderLine}>
          <span className={styles.sectionIcon}>🤖</span>
          <h2 className={styles.waterfallTitle}>Agent 运行监控中枢</h2>
          <span className={styles.waterfallSub}>全链路 9 大招商旅程的自主 Agent 与人工指令执行状态</span>
        </div>
        
        <div className={styles.stageGrid}>
          {FRANCHISE_STAGES.map((stage) => {
            const stageRuns = data.autonomousAgents.filter((run) => run.stage === stage.key);
            return (
              <div key={stage.key} className={styles.stageCard} style={{ opacity: stageRuns.length === 0 ? 0.7 : 1 }}>
                <div className={styles.stageHeader}>
                  <span className={styles.stageIcon}>{stage.icon}</span>
                  <span className={styles.stageName}>{stage.label}</span>
                  <span className={styles.stageRunCount} style={{ background: stageRuns.length > 0 ? stage.color : '#e5e7eb', color: stageRuns.length > 0 ? '#fff' : '#6b7280' }}>
                    {stageRuns.length}
                  </span>
                </div>
                <div className={styles.stageRunList}>
                  {stageRuns.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>暂无运行任务</div>
                  ) : (
                    stageRuns.slice(0, 3).map((run) => {
                      const runMeta = RUN_STATUS_META[run.status] || RUN_STATUS_META.running;
                      const isAuto = run.triggerSource === 'autonomous' || run.triggerSource === 'journey';
                      return (
                        <div key={run.id} className={styles.miniRunCard}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12 }}>{isAuto ? '⚙️' : '👤'}</span>
                            <span className={styles.miniRunAgent} style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{run.title || run.agentType}</span>
                          </div>
                          <span className={styles.miniRunStatus} style={{ color: runMeta.color, background: runMeta.bg }}>
                            {runMeta.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
