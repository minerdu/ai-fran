'use client';

import { useMemo, useState } from 'react';
import useStore from '@/lib/store';
import { useToast } from '@/components/common/Toast';
import RadarChart from '@/components/customer/RadarChart';
import styles from './CustomerDetail.module.css';

const EMPTY_ARRAY = [];

const stageMeta = {
  pool: { label: '线索池', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
  qualified: { label: '已建档', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  negotiating: { label: '谈判中', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  signed: { label: '已签约', color: '#059669', bg: '#ecfdf5', border: '#86efac' },
  rejected: { label: '已拒绝', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

const stageScoreMap = {
  pool: 1.5,
  qualified: 3.2,
  negotiating: 4.4,
  signed: 5,
  rejected: 1.2,
};

function formatDateTime(value) {
  if (!value) return '暂无记录';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deriveNextAction(lead) {
  if (lead.stage === 'pool') return '补全公司背景、预算与开店城市，完成线索建档';
  if (lead.stage === 'qualified') return '安排品牌介绍会或总部考察，推动进入谈判阶段';
  if (lead.stage === 'negotiating') return '确认政策报价、投资回报和签约节奏，推进审批与面谈';
  if (lead.stage === 'signed') return '切入开业筹备、首批物料和培训排期';
  return '进入培育池，等待预算与时机成熟后重新激活';
}

export default function CustomerDetail({ leadId, onClose, ...legacyProps }) {
  const resolvedLeadId = leadId || legacyProps.customerId;
  const [descExpanded, setDescExpanded] = useState(true);
  const [scoreExpanded, setScoreExpanded] = useState(true);
  const [tagExpanded, setTagExpanded] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [prefExpanded, setPrefExpanded] = useState(true);
  const [crmExpanded, setCrmExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isRefreshingInsight, setIsRefreshingInsight] = useState(false);
  const toast = useToast();

  const lead = useStore((state) => state.leads.find((item) => item.id === resolvedLeadId));
  const messages = useStore((state) => state.allMessages[resolvedLeadId] || EMPTY_ARRAY);

  const radarScores = useMemo(() => {
    if (!lead) return {};
    const activityScore = Math.max(1, Math.min(5, 5 - lead.silentDays / 5));

    return {
      '意向强度': lead.intentScore || 0,
      '投资能力': lead.investCapability || 0,
      '行业契合': lead.industryFit || 0,
      '决策紧迫': lead.urgency || 0,
      '互动活跃': Number(activityScore.toFixed(1)),
      '签约成熟': stageScoreMap[lead.stage] || 0,
    };
  }, [lead]);

  const scores = useMemo(() => {
    if (!lead) return [];
    return [
      { label: '意向强度', value: lead.intentScore || 0, color: '#2563eb' },
      { label: '投资能力', value: lead.investCapability || 0, color: '#059669' },
      { label: '行业契合', value: lead.industryFit || 0, color: '#7c3aed' },
      { label: '决策紧迫', value: lead.urgency || 0, color: '#d97706' },
      { label: '互动活跃', value: radarScores['互动活跃'] || 0, color: '#0ea5e9' },
      { label: '签约成熟', value: radarScores['签约成熟'] || 0, color: '#ef4444' },
    ];
  }, [lead, radarScores]);

  if (!lead) {
    return (
      <div className={styles.notFound}>
        <span>😕</span>
        <p>未找到代理商线索</p>
      </div>
    );
  }

  const stage = stageMeta[lead.stage] || stageMeta.pool;
  const recentMessages = messages.slice(-4).reverse();
  const nextAction = deriveNextAction(lead);

  return (
    <div className={styles.detailPanel}>
      <div className={styles.header}>
        {onClose ? <button className={styles.closeBtn} onClick={onClose}>✕</button> : null}
        <div className={styles.headerTitle}>代理商画像</div>
      </div>

      <div className={styles.content}>
        <div className={styles.detailContent}>
          <div className={styles.memberHeader}>
            <div className={styles.memberBadge} style={{ background: stage.bg, color: stage.color, borderColor: stage.border }}>
              <span className={styles.memberLevel}>{lead.name.slice(-2)}</span>
            </div>
            <div className={styles.memberStats}>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{lead.storeCount || 0}</span>
                <span className={styles.memberStatLabel}>现有门店</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{lead.investBudget || '待确认'}</span>
                <span className={styles.memberStatLabel}>投资预算</span>
              </div>
              <div className={styles.memberStatItem}>
                <span className={styles.memberStatValue}>{stage.label}</span>
                <span className={styles.memberStatLabel}>当前阶段</span>
              </div>
            </div>
          </div>

          <div className={`${styles.sectionBlock} ${styles.themeAi}`}>
            <div className={styles.sectionHeader} onClick={() => setDescExpanded(!descExpanded)}>
              <span className={styles.sectionTitle}>AI 核心洞察</span>
              <div className={styles.headerActions}>
                <button
                  className={styles.iconBtn}
                  title="刷新洞察"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsRefreshingInsight(true);
                    setTimeout(() => setIsRefreshingInsight(false), 1000);
                  }}
                >
                  <span className={isRefreshingInsight ? styles.spin : ''}>🔄</span>
                </button>
                <span className={styles.expandIcon}>{descExpanded ? '▾' : '▸'}</span>
              </div>
            </div>
            {descExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.aiText}>
                  {isRefreshingInsight ? '正在重新整理代理商画像与招商洞察...' : lead.aiSummary}
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.sectionBlock} ${styles.themeScore}`}>
            <div className={styles.sectionHeader} onClick={() => setScoreExpanded(!scoreExpanded)}>
              <span className={styles.sectionTitle}>招商评分分析</span>
              <span className={styles.expandIcon}>{scoreExpanded ? '▾' : '▸'}</span>
            </div>
            {scoreExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.scoreRow}>
                  {scores.map((item) => (
                    <span key={item.label} className={styles.scoreBadge} style={{ background: `${item.color}15`, color: item.color }}>
                      {item.label} {item.value.toFixed(1)}
                    </span>
                  ))}
                </div>
                <div className={styles.radarCenter}>
                  <RadarChart scores={radarScores} size={140} />
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.sectionBlock} ${styles.themeTag}`}>
            <div className={styles.sectionHeader} onClick={() => setTagExpanded(!tagExpanded)}>
              <span className={styles.sectionTitle}>线索标签 ({lead.tags?.length || 0})</span>
              <div className={styles.headerActions}>
                <button className={styles.iconBtn} onClick={(event) => { event.stopPropagation(); setShowTagModal(true); }}>管理</button>
                <span className={styles.expandIcon}>{tagExpanded ? '▾' : '▸'}</span>
              </div>
            </div>
            {tagExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.tagFlow}>
                  {(lead.tags || []).map((tag) => (
                    <span key={tag.name} className={styles.tag} style={{ background: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.sectionBlock} ${styles.themeInfo}`}>
            <div className={styles.sectionHeader} onClick={() => setInfoExpanded(!infoExpanded)}>
              <span className={styles.sectionTitle}>基础资料</span>
              <span className={styles.expandIcon}>{infoExpanded ? '▾' : '▸'}</span>
            </div>
            {infoExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.infoFlow}>
                  <div className={styles.infoPair}><span className={styles.lbl}>负责人</span><span className={styles.val}>{lead.name}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>公司主体</span><span className={styles.val}>{lead.company}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>目标城市</span><span className={styles.val}>{lead.city}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>招商区域</span><span className={styles.val}>{lead.region}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>线索来源</span><span className={styles.val}>{lead.source}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>经营背景</span><span className={styles.val}>{lead.experience || '待确认'}</span></div>
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.sectionBlock} ${styles.themePref}`}>
            <div className={styles.sectionHeader} onClick={() => setPrefExpanded(!prefExpanded)}>
              <span className={styles.sectionTitle}>招商 CRM 映射</span>
              <span className={styles.expandIcon}>{prefExpanded ? '▾' : '▸'}</span>
            </div>
            {prefExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.infoFlow}>
                  <div className={styles.infoPair}><span className={styles.lbl}>微信号</span><span className={styles.val}>{lead.wechatId || '待补录'}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>联系电话</span><span className={styles.val}>{lead.phone || '待补录'}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>归属顾问</span><span className={styles.val}>{lead.assignedTo || '待分配'}</span></div>
                  <div className={styles.infoPair}><span className={styles.lbl}>最近互动</span><span className={styles.val}>{formatDateTime(lead.lastInteractionAt)}</span></div>
                </div>
                <div className={styles.noteBar}>
                  <span className={styles.lbl}>下一步建议</span>
                  {nextAction}
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.sectionBlock} ${styles.themeCrm}`}>
            <div className={styles.sectionHeader} onClick={() => setCrmExpanded(!crmExpanded)}>
              <span className={styles.sectionTitle}>机会与决策信息</span>
              <span className={styles.expandIcon}>{crmExpanded ? '▾' : '▸'}</span>
            </div>
            {crmExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.crmList}>
                  <div className={styles.crmItem}>
                    <div className={styles.crmItemLeft}>
                      <div className={styles.crmProduct}>最近关键问题</div>
                      <div className={styles.crmMeta}>
                        <span className={styles.crmDate}>{formatDateTime(lead.lastInteractionAt)}</span>
                      </div>
                    </div>
                    <div className={styles.crmAmount}>{lead.lastKeyQuestion || '暂无'}</div>
                  </div>
                  <div className={styles.crmItem}>
                    <div className={styles.crmItemLeft}>
                      <div className={styles.crmProduct}>投资与开店基础</div>
                      <div className={styles.crmMeta}>
                        <span className={styles.crmTech}>预算 {lead.investBudget || '待确认'}</span>
                        <span className={styles.crmTech}>门店 {lead.storeCount || 0} 家</span>
                      </div>
                    </div>
                    <div className={styles.crmAmount}>{lead.experience || '经营背景待补充'}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${styles.sectionBlock} ${styles.themeTimeline}`}>
            <div className={styles.sectionHeader} onClick={() => setTimelineExpanded(!timelineExpanded)}>
              <span className={styles.sectionTitle}>最近互动与 AI 执行轨迹</span>
              <span className={styles.expandIcon}>{timelineExpanded ? '▾' : '▸'}</span>
            </div>
            {timelineExpanded ? (
              <div className={styles.sectionBody}>
                <div className={styles.timeline}>
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineLine}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTime}>当前阶段</div>
                      <div className={styles.timelineText}>线索处于 <b>{stage.label}</b>，系统建议下一步执行 <b>{nextAction}</b></div>
                    </div>
                  </div>
                  {recentMessages.map((message) => (
                    <div key={message.id} className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${message.senderType === 'ai' ? styles.timelineDotWarn : styles.timelineDotGray}`}></div>
                      <div className={styles.timelineLine}></div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTime}>{formatDateTime(message.createdAt)}</div>
                        <div className={styles.timelineText}>
                          {message.senderType === 'ai' ? 'AI 跟进' : message.direction === 'inbound' ? '线索回复' : '人工介入'}：
                          <b>{message.content}</b>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!recentMessages.length ? <div className={styles.emptyText}>暂无更多互动记录</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showTagModal ? (
        <div className={styles.modalOverlay} onClick={() => setShowTagModal(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>线索标签治理</h3>
              <button className={styles.iconBtn} onClick={() => setShowTagModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tagInputRow}>
                <input type="text" placeholder="输入希望追加的标签，例如：多店经营 / 总部考察" className={styles.tagInput} />
              </div>
              <div className={styles.aiAnalysisBox}>
                <h4>AI 风险提示</h4>
                <p>高价值、强预算、可签约等标签会直接影响评分与 Playbook 推荐。若当前证据不足，建议先补充公司背景、预算区间和最近互动内容，再申请特批。</p>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowTagModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={() => { toast.success('已提交标签治理申请'); setShowTagModal(false); }}>提交审批</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
