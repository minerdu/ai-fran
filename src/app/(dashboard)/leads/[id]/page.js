'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RadarChart from '@/components/customer/RadarChart';
import WecomGroupCard from '@/components/leads/WecomGroupCard';
import LeadStateMachineViz from '@/components/leads/LeadStateMachineViz';
import styles from './page.module.css';

const tagClassMap = {
  lifecycle: 'tagLifecycle',
  intent: 'tagIntent',
  risk: 'tagRisk',
  status: 'tagStatus',
  custom: 'tagCustom',
  region: 'tagCustom',
  source: 'tagStatus',
  invest: 'tagIntent',
};

function getStageText(status) {
  const map = {
    pool: '线索池',
    qualified: '已建档',
    negotiating: '谈判中',
    signed: '已签约',
    rejected: '暂不匹配',
    silent: '沉默待激活',
  };
  return map[status] || '线索池';
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('detail');
  const [lead, setLead] = useState(null);
  const [groupCards, setGroupCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(true);
  const [scoreExpanded, setScoreExpanded] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/customers/${params.id}`, { cache: 'no-store' });
        if (!response.ok) {
          setLead(null);
          return;
        }
        const data = await response.json();
        setLead(data);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [params.id]);

  useEffect(() => {
    if (!lead) return;
    fetch(`/api/customers/groups?city=${encodeURIComponent(lead.city)}&region=${encodeURIComponent(lead.region)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setGroupCards(Array.isArray(data) ? data : []))
      .catch(() => setGroupCards([]));
  }, [lead]);

  const scores = useMemo(() => {
    if (!lead) return [];
    return [
      { label: '投资能力', value: lead.valueScore, color: '#FF4D4F' },
      { label: '意向强度', value: lead.intentScore, color: '#1677FF' },
      { label: '决策紧迫', value: lead.demandScore, color: '#52C41A' },
      { label: '互动活跃', value: lead.satisfactionScore, color: '#FF8C00' },
      { label: '跟进成熟', value: lead.relationScore, color: '#7C3AED' },
    ];
  }, [lead]);

  const radarScores = useMemo(() => {
    if (!lead) return {};
    return {
      投资能力: lead.valueScore,
      意向强度: lead.intentScore,
      决策紧迫: lead.demandScore,
      互动活跃: lead.satisfactionScore,
      跟进成熟: lead.relationScore,
    };
  }, [lead]);

  const handleAction = async (action, nextStage) => {
    if (!lead) return;
    const response = await fetch(`/api/customers/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, nextStage }),
    });
    if (response.ok) {
      const refreshed = await fetch(`/api/customers/${lead.id}`, { cache: 'no-store' });
      const data = await refreshed.json();
      setLead(data);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.header} style={{ opacity: 0.5 }}>
          <button className={styles.backBtn}>←</button>
          <div className={styles.headerAvatar} style={{ background: '#e2e8f0' }} />
          <div>
            <div style={{ width: 120, height: 24, background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 80, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
          </div>
        </div>
        <div className={styles.content} style={{ opacity: 0.5 }}>
          <div className={styles.detailContent}>
             <div style={{ height: 200, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }} />
             <div style={{ height: 300, background: '#f8fafc', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className={styles.notFound}>
        <span>😕</span>
        <p>线索不存在</p>
        <button onClick={() => router.back()} className="btn-secondary">返回</button>
      </div>
    );
  }

  const lastInteraction = lead.lastInteractionAt
    ? new Date(lead.lastInteractionAt).toLocaleString('zh-CN')
    : '暂无';

  return (
    <div className={styles.detailPage}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ←
        </button>
        <div className={styles.headerAvatar}>
          <span>{lead.name.slice(-2)}</span>
        </div>
        <div>
          <h2 className={styles.headerName}>{lead.name}</h2>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {lead.company} · {lead.city}
          </div>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'detail' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('detail')}
        >
          线索详情
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          招商对话
        </button>
        <Link
          href={`/leads/${params.id}/timeline`}
          className={styles.tabBtn}
          style={{ marginLeft: 'auto', fontSize: 13, color: '#2563eb', fontWeight: 600 }}
        >
          查看时间线 →
        </Link>
      </div>

      <div className={styles.content}>
        {activeTab === 'detail' ? (
          <div className={styles.detailContent}>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>当前阶段</span>
                <span className={styles.statValue}>{getStageText(lead.lifecycleStatus)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>所属区域</span>
                <span className={styles.statValue}>{lead.region}</span>
              </div>
              <button className={styles.refreshBtn} onClick={() => handleAction('mark_exception')}>
                <span>⚠️</span>
                <span>例外标记</span>
              </button>
            </div>
            <div className={styles.scoreGrid} style={{ marginBottom: 16 }}>
              {[
                { key: 'pool', label: '回线索池' },
                { key: 'qualified', label: '设为已建档' },
                { key: 'negotiating', label: '推进谈判中' },
                { key: 'signed', label: '设为已签约' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={styles.scoreBadge}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleAction('update_stage', item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>最近互动</span>
                <span className={styles.statValue}>{lastInteraction}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>静默天数</span>
                <span className={styles.statValue}>{lead.silentDays}天</span>
              </div>
              <button className={styles.refreshBtn} onClick={() => handleAction('assign_manual')}>
                <span>👤</span>
                <span>转人工</span>
              </button>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>基础档案</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.scoreGrid}>
                  <span className={styles.scoreBadge}>公司 {lead.company}</span>
                  <span className={styles.scoreBadge}>预算 {lead.investBudget}</span>
                  <span className={styles.scoreBadge}>经验 {lead.experience}</span>
                  <span className={styles.scoreBadge}>历史记录 {lead.storeCount}</span>
                  <span className={styles.scoreBadge}>负责人 {lead.name}</span>
                  <span className={styles.scoreBadge}>顾问 {lead.assignedTo}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => setDescExpanded(!descExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {descExpanded ? '▾' : '▸'} AI 线索摘要
                </span>
              </button>
              {descExpanded ? (
                <div className={styles.sectionBody}>
                  <p className={styles.descText}>{lead.aiSummary}</p>
                  {lead.lastKeyQuestion ? (
                    <p className={styles.descText} style={{ marginTop: '12px' }}>
                      最近关键问题：{lead.lastKeyQuestion}
                    </p>
                  ) : null}
                  <div className={styles.scoreGrid} style={{ marginTop: '12px' }}>
                    {lead.suggestedActions.map((action) => (
                      <span key={action} className={styles.scoreBadge}>{action}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => setScoreExpanded(!scoreExpanded)}
              >
                <span className={styles.sectionTitle}>
                  {scoreExpanded ? '▾' : '▸'} 线索评分
                </span>
              </button>
              {scoreExpanded ? (
                <div className={styles.sectionBody}>
                  <div className={styles.scoreGrid}>
                    {scores.map((item) => (
                      <span
                        key={item.label}
                        className={styles.scoreBadge}
                        style={{ color: item.color, borderColor: `${item.color}33`, background: `${item.color}10` }}
                      >
                        {item.label} {item.value?.toFixed?.(1) ?? item.value}
                      </span>
                    ))}
                    {lead.compositeScore ? (
                      <span className={styles.scoreBadge} style={{ color: '#0f766e', borderColor: '#0f766e33', background: '#0f766e10' }}>
                        综合评分 {lead.compositeScore.toFixed?.(2) ?? lead.compositeScore}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.radarCenter}>
                    <RadarChart scores={radarScores} size={132} max={5} />
                  </div>
                  {lead.scoreUpdatedAt ? (
                    <div className={styles.descText} style={{ marginTop: '12px' }}>
                      最新评分回写：{new Date(lead.scoreUpdatedAt).toLocaleString('zh-CN')}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {lead.stageHistory?.length ? (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>阶段历史</span>
                </div>
                <div className={styles.sectionBody}>
                  <div className={styles.taskList}>
                    {lead.stageHistory.slice(0, 4).map((item) => (
                      <div key={item.id} className={styles.taskItem}>
                        <span className={styles.taskTime}>
                          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        <div className={styles.taskInfo}>
                          <span className={styles.taskTitle}>{item.fromStage || '初始'} → {item.toStage}</span>
                          <span className={styles.taskDesc}>{item.reason}</span>
                        </div>
                        <span className={styles.taskStatus}>{item.actor === 'human' ? '人工' : '系统'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>状态流转可视化</span>
              </div>
              <div className={styles.sectionBody}>
                <LeadStateMachineViz
                  currentStage={lead.lifecycleStatus || lead.stage}
                  stageHistory={lead.stageHistory || []}
                />
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>标签画像</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.tagList}>
                  {lead.tags.map((tag) => (
                    <span key={tag.id} className={`${styles.tag} ${styles[tagClassMap[tag.category] || 'tagCustom']}`}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {groupCards.length ? (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>企微群管理</span>
                </div>
                <div className={styles.sectionBody}>
                  <div className={styles.groupGrid}>
                    {groupCards.slice(0, 2).map((group) => (
                      <WecomGroupCard key={group.id} group={group} />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.section}>
              <div className={styles.taskTabBar}>
                <button
                  className={`${styles.taskTabBtn} ${styles.taskTabActive}`}
                >
                  招商任务
                  <span className={styles.taskBadge}>{lead.tasks.length}</span>
                </button>
              </div>
              <div className={styles.sectionBody}>
                <button className={styles.addTaskBtn} onClick={() => router.push('/tasks')}>
                  + 打开任务中心
                </button>
                <div className={styles.taskList}>
                  {lead.tasks.length ? lead.tasks.map((task) => (
                    <div key={task.id} className={styles.taskItem}>
                      <span className={styles.taskTime}>
                        {task.scheduledAt ? new Date(task.scheduledAt).toLocaleDateString('zh-CN') : new Date(task.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <span className={styles.taskDesc}>{task.description}</span>
                      </div>
                      <span className={`${styles.taskStatus} ${task.approvalStatus === 'pending' ? styles.statusPending : styles.statusApproved}`}>
                        {task.approvalStatus === 'pending' ? '待审批' : task.executeStatus === 'success' ? '已完成' : '进行中'}
                      </span>
                    </div>
                  )) : (
                    <div className={styles.emptyTask}>当前暂无招商任务</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.chatContent}>
            <div className={styles.chatList}>
              {lead.messages.length ? lead.messages.map((message) => {
                const isGroupInbound = message.direction === 'inbound' && message.content.includes(': ');
                const senderName = isGroupInbound ? message.content.split(': ')[0] : lead.name;
                const avatarText = senderName.slice(-2);
                const displayText = isGroupInbound ? message.content.split(': ').slice(1).join(': ') : message.content;

                return (
                  <div
                    key={message.id}
                    className={`${styles.chatMsg} ${message.direction === 'inbound' ? styles.chatInbound : styles.chatOutbound}`}
                  >
                    {message.direction === 'inbound' && (
                      <div className={styles.chatAvatar}>
                        <span>{avatarText}</span>
                      </div>
                    )}
                    <div className={styles.chatBubbleContainer}>
                      <div className={styles.chatBubble}>
                        {message.senderType === 'ai' ? <span className={styles.chatAiTag}>AI 招商顾问</span> : null}
                        {displayText}
                      </div>
                      <span className={styles.chatTime}>
                        {new Date(message.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className={styles.emptyChat}>暂无招商对话记录</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
