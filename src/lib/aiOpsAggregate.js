import {
  mockAgentRuns,
  mockApprovals,
  mockEvents,
  mockPlaybooks,
  mockReport,
} from './franchiseData';
import prisma from './prisma';
import { listGovernanceAuditLogs, syncOptimizationSuggestions } from './governanceStore';
import { buildWorkflowSnapshot } from './workflowBff';

const STATUS_LABELS = {
  running: '运行中',
  completed: '已完成',
  paused_for_approval: '待审批',
  draft: '待启动',
};

const STATUS_TONES = {
  running: 'success',
  completed: 'neutral',
  paused_for_approval: 'warning',
  draft: 'neutral',
};

const TRIGGER_LABELS = {
  autonomous: '自主引擎',
  journey: '旅程自动化',
  manual_command: '人工指令',
  workflow: '工作流编排',
};

const STAGE_LABELS = {
  lead_capture: '线索接待',
  qualification: '资格评估',
  nurturing: '线索培育',
  policy_match: '政策匹配',
  visit_invite: '总部考察',
  event_followup: '会务跟进',
  negotiation: '报价谈判',
  sign_push: '签约推进',
  silent_wake: '沉默激活',
};

const JOURNEY_STAGES = [
  { id: 'lead_capture', label: '线索接待' },
  { id: 'qualification', label: '资格评估' },
  { id: 'nurturing', label: '线索培育' },
  { id: 'policy_match', label: '政策匹配' },
  { id: 'visit_invite', label: '总部考察' },
  { id: 'event_followup', label: '会务跟进' },
  { id: 'negotiation', label: '报价谈判' },
  { id: 'sign_push', label: '签约推进' },
  { id: 'silent_wake', label: '沉默激活' },
];

const SOURCE_ATTRIBUTION = [
  { source: '官网表单', leads: 42, qualified: 28, visits: 12, signed: 4, roi: '3.2x' },
  { source: '招商会', leads: 36, qualified: 24, visits: 16, signed: 5, roi: '4.1x' },
  { source: '转介绍', leads: 22, qualified: 18, visits: 11, signed: 6, roi: '5.3x' },
  { source: '小红书', leads: 31, qualified: 12, visits: 4, signed: 1, roi: '1.6x' },
  { source: '区域活动', leads: 25, qualified: 15, visits: 8, signed: 2, roi: '2.4x' },
];

const STAGE_ATTRIBUTION = [
  {
    stage: '线索建档',
    owner: 'AI 招商顾问',
    inflow: 156,
    outflow: 89,
    dropoffRate: '42.9%',
    cause: '初始预算、城市与决策角色采集不完整，导致高潜线索迟迟未建档。',
  },
  {
    stage: '总部考察',
    owner: '会务中心',
    inflow: 45,
    outflow: 23,
    dropoffRate: '48.9%',
    cause: '考察档期与交通补贴说明不足，华南区有两条高意向线索延后确认。',
  },
  {
    stage: '报价审批',
    owner: '审批中心',
    inflow: 23,
    outflow: 12,
    dropoffRate: '47.8%',
    cause: '政策折扣、物料补贴和资料外发审批集中，影响签约推进节奏。',
  },
];

function normalizeDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function formatShortDateTime(value) {
  const date = normalizeDate(value);
  if (!date) return '待同步';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatReportDate(dateParam) {
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  return targetDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

function scaleTrendData(viewMode, trendData) {
  if (viewMode === 'day') return trendData;
  if (viewMode === 'week') {
    return [
      { time: '周一', messages: 65, aiReplies: 42 },
      { time: '周二', messages: 78, aiReplies: 55 },
      { time: '周三', messages: 92, aiReplies: 68 },
      { time: '周四', messages: 85, aiReplies: 60 },
      { time: '周五', messages: 89, aiReplies: 45 },
      { time: '周六', messages: 74, aiReplies: 41 },
      { time: '周日', messages: 58, aiReplies: 36 },
    ];
  }

  return [
    { time: '上旬', messages: 248, aiReplies: 174 },
    { time: '中旬', messages: 276, aiReplies: 192 },
    { time: '下旬', messages: 301, aiReplies: 214 },
  ];
}

function scaleFunnel(viewMode, funnelData) {
  if (viewMode === 'day') return funnelData;
  const multiplier = viewMode === 'week' ? 1.8 : 2.4;
  return funnelData.map((item) => ({ ...item, value: Math.round(item.value * multiplier) }));
}

export function buildScaledReport({ dateParam, viewMode = 'day' } = {}) {
  const scale = viewMode === 'month' ? 2.6 : viewMode === 'week' ? 1.7 : 1;
  const pendingApprovals = (mockReport.pendingTagApprovals || 0) + (mockReport.pendingTaskApprovals || 0);

  return {
    reportDate: formatReportDate(dateParam),
    totalLeads: Math.round(mockReport.totalLeads * scale),
    newLeads: Math.round(mockReport.newLeads * scale),
    highIntentLeads: Math.round(mockReport.highIntentLeads * scale),
    totalMessages: Math.round(mockReport.totalMessages * scale),
    sentMessages: Math.round(mockReport.sentMessages * scale),
    aiReplies: Math.round(mockReport.aiReplies * scale),
    avgResponseTime: viewMode === 'day' ? mockReport.avgResponseTime : Math.max(18, mockReport.avgResponseTime - 6),
    signingPipeline: Math.max(4, Math.round(mockReport.signingPipeline * (viewMode === 'month' ? 1.8 : viewMode === 'week' ? 1.3 : 1))),
    signedThisMonth: Math.max(1, Math.round(mockReport.signedThisMonth * (viewMode === 'month' ? 1.5 : 1))),
    conversionRate: viewMode === 'day' ? mockReport.conversionRate : viewMode === 'week' ? '15.6%' : '16.8%',
    activeAgentRuns: mockAgentRuns.filter((item) => item.status !== 'completed').length,
    pendingApprovals,
    pendingTagApprovals: mockReport.pendingTagApprovals,
    pendingTaskApprovals: mockReport.pendingTaskApprovals,
    highFreqKeywords: mockReport.highFreqKeywords,
    keyLeads: mockReport.keyLeads,
    trendData: scaleTrendData(viewMode, mockReport.trendData),
    funnelData: scaleFunnel(viewMode, mockReport.funnelData),
    aiSummary:
      viewMode === 'day'
        ? mockReport.aiSummary
        : viewMode === 'week'
          ? '本周招商漏斗整体保持稳定，华南区总部考察与签约推进效率较高，但会后资料外发审批和沉默激活节奏仍存在阻塞。'
          : '本月招商量、会务转化和 AI 跟进频率持续提升，当前需要重点解决审批断点、策略发布节奏和沉默线索唤醒效率。',
    aiSuggestions: [
      { title: '优先推进高意向加盟商', desc: '安排总部考察、报价沟通和签约面谈，缩短高意向线索成交周期', link: '查看线索' },
      { title: '清理审批断点', desc: '政策、会务与资料外发审批仍是当前自动化链路的主要阻塞点', link: '去审批' },
      { title: '发起下一轮优化动作', desc: '根据漏斗异常与会务结果，调整下周招商方案、邀约节奏与裂变激励', link: '查看工作流' },
    ],
  };
}

function buildAttribution(viewMode) {
  const multiplier = viewMode === 'month' ? 2.1 : viewMode === 'week' ? 1.4 : 1;
  return SOURCE_ATTRIBUTION.map((item) => ({
    ...item,
    leads: Math.round(item.leads * multiplier),
    qualified: Math.round(item.qualified * multiplier),
    visits: Math.round(item.visits * multiplier),
    signed: Math.round(item.signed * multiplier),
  }));
}

function buildStageAttribution(viewMode) {
  const multiplier = viewMode === 'month' ? 1.2 : viewMode === 'week' ? 1.08 : 1;
  return STAGE_ATTRIBUTION.map((item) => ({
    ...item,
    inflow: Math.round(item.inflow * multiplier),
    outflow: Math.round(item.outflow * multiplier),
  }));
}

function buildAnomalies(report, workflowSummary) {
  return [
    {
      id: 'anom_1',
      title: '总部考察到报价阶段转化放缓',
      severity: 'high',
      detail: `当前总部考察 ${report.funnelData[2]?.value || 0} 条，谈判中 ${report.funnelData[3]?.value || 0} 条，转化主要卡在政策审批与考察档期确认。`,
    },
    {
      id: 'anom_2',
      title: '审批断点影响自动化运行',
      severity: workflowSummary.pendingApprovals > 0 ? 'medium' : 'low',
      detail: `当前仍有 ${workflowSummary.pendingApprovals || 0} 个待审批事项，直接影响资料外发、报价和裂变发布链路。`,
    },
    {
      id: 'anom_3',
      title: '沉默线索激活效率偏低',
      severity: 'medium',
      detail: '沉默激活 Agent 已运行，但高净值线索的案例外发和 ROI 证明链路还不够密集。',
    },
  ];
}

function buildOptimizationSuggestions(report, workflowSummary, attribution, stageAttribution) {
  const topSource = [...attribution].sort((a, b) => b.signed - a.signed)[0];
  const biggestDropoff = [...stageAttribution].sort((a, b) => parseFloat(b.dropoffRate) - parseFloat(a.dropoffRate))[0];

  return [
    {
      id: 'opt_1',
      priority: 'P0',
      title: '优先消化报价审批断点',
      owner: '审批中心 / 招商负责人',
      expectedImpact: '预计提升签约推进效率 12%-18%',
      reason: `${workflowSummary.pendingApprovals || 0} 个待审批事项正在阻塞报价、资料外发和裂变激励发布。`,
      nextAction: '先批量处理政策与资料外发审批，再同步顾问推进签约面谈。',
      href: '/approvals',
    },
    {
      id: 'opt_2',
      priority: 'P1',
      title: `放大 ${topSource?.source || '高 ROI 来源'} 的线索投入`,
      owner: 'AI 招商 / 投放负责人',
      expectedImpact: `${topSource?.roi || '4.0x'} ROI 渠道可继续扩量`,
      reason: `${topSource?.source || '该来源'} 当前签约表现最好，可作为下一轮线索获取主通道。`,
      nextAction: '围绕标杆案例、招商会复盘和总部考察视频加大同类投放与外呼引流。',
      href: '/ai/playbooks',
    },
    {
      id: 'opt_3',
      priority: 'P1',
      title: `修复 ${biggestDropoff?.stage || '关键阶段'} 的流失问题`,
      owner: biggestDropoff?.owner || '运营中心',
      expectedImpact: '可直接降低中段流失率',
      reason: biggestDropoff?.cause || '当前中段漏斗存在明显断点。',
      nextAction: '增加标准话术、会前确认动作和超时提醒，缩短从考察到报价的切换时间。',
      href: '/workflow',
    },
    {
      id: 'opt_4',
      priority: 'P2',
      title: '强化沉默激活内容包',
      owner: '内容中台 / AI 智能体',
      expectedImpact: '提升高净值沉默线索回复率',
      reason: '当前沉默激活更多依赖单次触达，缺少案例、ROI 和同城样板店的组合证据。',
      nextAction: '生成一套“同城案例 + ROI 测算 + 总部赋能”组合外发模板，纳入标准 Skill。',
      href: '/me/skills',
    },
  ];
}

function buildFallbackWorkflowSnapshot() {
  const pendingApprovals = mockApprovals.filter((item) => item.status === 'pending').length;
  const activeRuns = mockAgentRuns.filter((item) => item.status !== 'completed').length;
  const pausedCount = mockAgentRuns.filter((item) => item.status === 'paused_for_approval').length;
  const runningCount = mockAgentRuns.filter((item) => item.status === 'running').length;

  return {
    summary: {
      pendingApprovals,
      activeRuns,
      upcomingEvents: mockEvents.filter((item) => item.status === 'upcoming').length,
      activeReferrals: 2,
      readyPlaybooks: mockPlaybooks.length,
    },
    runs: mockAgentRuns,
    playbooks: mockPlaybooks,
    events: mockEvents,
    referrals: [],
    queue: [],
    opsBoard: {
      runHealth: {
        pausedCount,
        runningCount,
        completedCount: mockAgentRuns.filter((item) => item.status === 'completed').length,
      },
    },
  };
}

async function buildLatestCommands() {
  const logs = await listGovernanceAuditLogs({
    entityType: 'ai_command',
    limit: 12,
  }).catch(() => []);

  if (logs.length > 0) {
    return logs.map((log) => {
      const commandCard = log.metadata?.commandCard || {};
      const execution = commandCard.execution || {};
      return {
        id: commandCard.id || log.entityId || log.id,
        input: commandCard.input || log.reason || 'AI 指令',
        intent: commandCard.intent || log.metadata?.intent || log.action,
        status: commandCard.status || (execution.pendingManual > 0 ? 'pending_approval' : 'completed'),
        resultType: commandCard.resultType || log.action,
        resultSummary: commandCard.resultSummary || log.metadata?.summary || log.reason || '已执行',
        createdAt: log.createdAt,
        linkedObjects: commandCard.linkedObjects || log.metadata?.linkedObjects || [],
        execution,
      };
    });
  }

  return [];
}

async function getWorkflowSnapshotSafe() {
  try {
    return await buildWorkflowSnapshot();
  } catch (error) {
    console.error('Failed to build workflow snapshot, using fallback data:', error);
    return buildFallbackWorkflowSnapshot();
  }
}

function toAgentCard(run) {
  const tone = STATUS_TONES[run.status] || 'neutral';
  return {
    id: run.id,
    title: run.agentType || 'AI Agent',
    owner: run.owner || TRIGGER_LABELS[run.triggerSource] || 'AI 编排中心',
    stageKey: run.stage || null,
    stageLabel: STAGE_LABELS[run.stage] || '全局编排',
    status: run.status,
    statusLabel: STATUS_LABELS[run.status] || run.status || '待同步',
    tone,
    currentStep: run.currentStep || '待同步当前步骤',
    startedAt: formatShortDateTime(run.startedAt),
    triggerLabel: TRIGGER_LABELS[run.triggerSource] || '系统自动',
    scope: run.scope || run.outputSummary || '当前 Agent 正在处理招商任务链路。',
    recommendedAction: run.recommendedAction || '查看详情并继续推进',
  };
}

function buildJourneyHealth(runs) {
  return JOURNEY_STAGES.map((stage) => {
    const stageRuns = runs.filter((run) => run.stage === stage.id);
    const activeCount = stageRuns.filter((run) => run.status !== 'completed').length;
    const pausedCount = stageRuns.filter((run) => run.status === 'paused_for_approval').length;

    return {
      ...stage,
      activeCount,
      pausedCount,
      status: pausedCount > 0 ? 'warning' : activeCount > 0 ? 'success' : 'neutral',
      summary:
        pausedCount > 0
          ? `${pausedCount} 个运行组待审批`
          : activeCount > 0
            ? `${activeCount} 个运行组执行中`
            : '当前无运行组',
    };
  });
}

function buildStatusStrip(report, workflowSummary, autonomousAgents, manualAgents) {
  return [
    {
      id: 'reports',
      label: 'AI 报告',
      value: report.reportDate,
      detail: `${report.aiSuggestions.length} 条优化建议`,
      tone: 'neutral',
    },
    {
      id: 'engine',
      label: '自主引擎',
      value: `${autonomousAgents.length} 个`,
      detail: `${workflowSummary.activeRuns || 0} 个运行组活跃`,
      tone: autonomousAgents.length ? 'success' : 'neutral',
    },
    {
      id: 'manual',
      label: '人工指令',
      value: `${manualAgents.length} 个`,
      detail: '按用户指令执行中的 Agent',
      tone: manualAgents.length ? 'success' : 'neutral',
    },
    {
      id: 'approvals',
      label: '待审批',
      value: `${workflowSummary.pendingApprovals || 0} 项`,
      detail: '政策 / 会务 / 预算 / 外发',
      tone: workflowSummary.pendingApprovals ? 'warning' : 'success',
    },
  ];
}

function buildReportEntries(report, workflowSummary, autonomousAgents, manualAgents) {
  return [
    {
      id: 'daily',
      title: '今日日报',
      value: report.reportDate,
      description: '过去 24 小时招商进展、漏斗和重点线索总结',
      href: '/reports',
      tone: 'blue',
    },
    {
      id: 'funnel',
      title: '漏斗归因',
      value: report.conversionRate,
      description: `${report.funnelData[0]?.value || 0} 条线索进入当前漏斗视图`,
      href: '/ai/reports',
      tone: 'green',
    },
    {
      id: 'agents',
      title: '运行中 Agent',
      value: `${autonomousAgents.length + manualAgents.length} 个`,
      description: `自主 ${autonomousAgents.length} 个 / 人工 ${manualAgents.length} 个`,
      href: '/me/agents',
      tone: 'orange',
    },
    {
      id: 'engine',
      title: '引擎状态',
      value: `${workflowSummary.activeRuns || 0} 个`,
      description: `${workflowSummary.pendingApprovals || 0} 个审批断点待处理`,
      href: '/me/engine',
      tone: 'purple',
    },
  ];
}

function buildEngineSummary(snapshot, autonomousAgents, manualAgents, latestCommands = []) {
  const runs = snapshot.runs || [];
  const journeyHealth = buildJourneyHealth(runs);
  const activeJourneyCount = journeyHealth.filter((item) => item.activeCount > 0).length;
  const latestCommand = [...latestCommands]
    .sort((a, b) => normalizeDate(b.createdAt) - normalizeDate(a.createdAt))[0];
  const pausedCount = runs.filter((item) => item.status === 'paused_for_approval').length;
  const runningCount = runs.filter((item) => item.status === 'running').length;
  const completedCount = runs.filter((item) => item.status === 'completed').length;

  return {
    status: pausedCount > 0 ? 'warning' : 'success',
    title: pausedCount > 0 ? '自主招商引擎运行中，存在审批断点' : '自主招商引擎运行稳定',
    description: `当前自主运行 Agent ${autonomousAgents.length} 个，人工指令 Agent ${manualAgents.length} 个，覆盖 ${activeJourneyCount}/9 个招商旅程环节。`,
    coverage: `${activeJourneyCount}/9`,
    automationRate: `${Math.max(55, 68 + activeJourneyCount * 3)}%`,
    pendingApprovals: snapshot.summary?.pendingApprovals || 0,
    runningCount,
    pausedCount,
    completedCount,
    lastGeneratedAt: formatShortDateTime(latestCommand?.createdAt),
    journeys: journeyHealth,
    checkpoints: [
      {
        label: '招商方案',
        value: `${snapshot.summary?.readyPlaybooks || 0} 套`,
        detail: '待发布方案、版本包与下一轮策略切换',
      },
      {
        label: '会务中心',
        value: `${snapshot.summary?.upcomingEvents || 0} 场`,
        detail: '说明会、总部考察与会后催签批次',
      },
      {
        label: '裂变中心',
        value: `${snapshot.summary?.activeReferrals || 0} 个`,
        detail: '转介绍激励、结算与反作弊链路',
      },
      {
        label: '执行中心',
        value: `${snapshot.summary?.activeRuns || 0} 组`,
        detail: '运行组执行状态、审批阻塞与排队任务',
      },
    ],
    ruleImpacts: [
      {
        title: '招商政策',
        detail: '华南区域政策变更会直接影响 Playbook 发布、报价话术与审批边界。',
        tone: 'warning',
      },
      {
        title: '会务节奏',
        detail: '总部考察档期与招商会签到规则会改变邀约 Agent 的执行波次。',
        tone: 'neutral',
      },
      {
        title: '资料外发',
        detail: '涉及加盟手册、ROI 测算和案例包时会自动触发审批与报告记录。',
        tone: 'neutral',
      },
    ],
  };
}

export async function buildAiOpsAggregate({ dateParam, viewMode = 'day' } = {}) {
  const report = buildScaledReport({ dateParam, viewMode });
  const snapshot = await getWorkflowSnapshotSafe();
  const runs = (snapshot.runs || []).map(toAgentCard);
  const manualAgents = runs.filter((item) => item.triggerLabel === '人工指令');
  const autonomousAgents = runs.filter((item) => item.triggerLabel !== '人工指令');
  const workflowSummary = snapshot.summary || buildFallbackWorkflowSnapshot().summary;
  const attribution = buildAttribution(viewMode);
  const stageAttribution = buildStageAttribution(viewMode);
  const anomalies = buildAnomalies(report, workflowSummary);
  const latestCommands = await buildLatestCommands();
  const optimizationSuggestions = await syncOptimizationSuggestions(
    buildOptimizationSuggestions(report, workflowSummary, attribution, stageAttribution)
  );

  return {
    report,
    workflowSummary,
    reportEntries: buildReportEntries(report, workflowSummary, autonomousAgents, manualAgents),
    statusStrip: buildStatusStrip(report, workflowSummary, autonomousAgents, manualAgents),
    autonomousAgents,
    manualAgents,
    attribution,
    stageAttribution,
    anomalies,
    optimizationSuggestions,
    engine: buildEngineSummary(snapshot, autonomousAgents, manualAgents, latestCommands),
    latestCommands,
  };
}
