import {
  mockApprovals,
  mockEvents as franchiseEvents,
  mockLeads as franchiseLeads,
  mockMessages as franchiseMessages,
  mockPersona as franchisePersona,
  mockReport as franchiseReport,
} from './franchiseData';

const stageMap = {
  pool: 'pool',
  unqualified: 'unqualified',
  qualified: 'qualified',
  negotiating: 'negotiating',
  signed: 'signed',
  rejected: 'rejected',
};

export const mockLeadProfiles = franchiseLeads.map((lead, index) => {
  const activityScore = Math.max(1, Number((5 - Math.min(lead.silentDays, 20) / 5).toFixed(1)));
  return {
    id: lead.id,
    name: lead.name,
    avatar: null,
    phone: lead.phone,
    wechatId: lead.wechatId,
    source: lead.source,
    lifecycleStatus: stageMap[lead.stage] || 'pool',
    intentScore: lead.intentScore,
    valueScore: Number((((lead.investCapability || 0) + (lead.industryFit || 0)) / 2).toFixed(1)),
    demandScore: lead.urgency,
    satisfactionScore: activityScore,
    relationScore: Number((Math.max(1, 5 - lead.silentDays * 0.15)).toFixed(1)),
    silentDays: lead.silentDays,
    aiSummary: lead.aiSummary,
    lastInteractionAt: lead.lastInteractionAt,
    lastKeyQuestion: lead.lastKeyQuestion,
    assignedTo: lead.assignedTo,
    assignedToId: lead.assignedToId,
    company: lead.company,
    city: lead.city,
    region: lead.region,
    investBudget: lead.investBudget,
    storeCount: lead.storeCount,
    experience: lead.experience,
    investCapability: lead.investCapability,
    industryFit: lead.industryFit,
    urgency: lead.urgency,
    tags: lead.tags,
    conversations: [],
    rank: index + 1,
  };
});

export const mockLeadMessages = franchiseMessages;

export const mockLeadTasks = [
  {
    id: 'task_1',
    leadId: 'lead_1',
    leadName: '王志远',
    title: '安排总部考察确认',
    triggerSource: 'workflow',
    triggerReason: '线索已完成品牌认知和选址初判，进入总部考察排期阶段。',
    taskType: 'meeting',
    content: '确认总部考察时间，发送考察流程单，并同步广州天河两个备选点位的初评意见。',
    scheduledAt: '2026-04-21T10:00:00Z',
    approvalStatus: 'approved',
    executeStatus: 'scheduled',
  },
  {
    id: 'task_2',
    leadId: 'lead_2',
    leadName: '李美琴',
    title: '培训体系资料外发审批',
    triggerSource: 'ai',
    triggerReason: '线索重点关注零基础转型支持，需要外发培训体系与标杆案例。',
    taskType: 'asset_bundle',
    content: '发送培训体系图、总部赋能清单、3个零基础加盟商案例，并邀请参加本周视频说明会。',
    scheduledAt: '2026-04-20T14:30:00Z',
    approvalStatus: 'pending',
    executeStatus: 'draft',
  },
  {
    id: 'task_3',
    leadId: 'lead_3',
    leadName: '张国栋',
    title: '高净值线索唤醒',
    triggerSource: 'sop',
    triggerReason: '沉默 12 天，但投资能力高，适合发送同城案例和 ROI 测算表唤醒。',
    taskType: 'text',
    content: '张总，结合成都同级城市门店模型，我们整理了一版 ROI 测算和总部考察建议，如果您方便，我今天发给您做内部评估。',
    scheduledAt: '2026-04-20T16:00:00Z',
    approvalStatus: 'pending',
    executeStatus: 'draft',
  },
];

export const mockWorkflowTasks = [
  {
    id: 'wf_1',
    time: '10:00',
    type: 'report',
    target: '总部管理群',
    description: '输出今日招商日报与重点审批',
    color: '#E8E8E8',
    icon: '📊',
  },
  {
    id: 'wf_2',
    time: '11:30',
    type: 'follow',
    target: '李美琴',
    description: '发送培训体系和标杆加盟商案例',
    color: '#FFF4E6',
    icon: '🧾',
  },
  {
    id: 'wf_3',
    time: '14:00',
    type: 'event',
    target: '深圳品牌考察日',
    description: '确认考察名单与总部接待流程',
    color: '#E6F7EE',
    icon: '🏢',
  },
  {
    id: 'wf_4',
    time: '17:30',
    type: 'approval',
    target: '审批中心',
    description: '处理资料外发与政策调整审批',
    color: '#E6F0FF',
    icon: '✅',
  },
];

export const mockMaterials = [
  { id: 'mat_1', title: '加盟手册 2026 版', type: 'pdf', tags: '品牌介绍,加盟政策,标准店' },
  { id: 'mat_2', title: '总部培训体系总览', type: 'image', tags: '培训,赋能,开店支持' },
  { id: 'mat_3', title: 'ROI 测算表示例', type: 'sheet', content: '直营与加盟模型对比、回本周期、人员模型', tags: 'ROI,测算,财务' },
  { id: 'mat_4', title: '招商会邀约话术', type: 'text', content: '您好，我们本周有一场总部招商说明会，适合正在评估加盟的负责人参加。', tags: '邀约,话术,招商会' },
  { id: 'mat_5', title: '标杆门店案例视频', type: 'video', tags: '案例,门店,考察前置' },
  { id: 'mat_6', title: '区域保护政策摘要', type: 'link', tags: '政策,区域,审批' },
];

export const mockLeadAppointments = franchiseEvents.map((event) => ({
  id: event.id,
  leadId: event.relatedLeads[0] || '',
  leadName: franchiseLeads.find((lead) => lead.id === event.relatedLeads[0])?.name || event.title,
  serviceType: event.type,
  serviceName: event.title,
  appointmentAt: `${event.date}T${event.time.slice(0, 5)}:00Z`,
  duration: 180,
  room: event.venue,
  staffName: '总部招商组',
  status: event.status === 'upcoming' ? 'confirmed' : event.status,
  reminderSentAt: null,
  reminderHours: 24,
}));

export const mockPersona = {
  companyName: franchisePersona.companyName,
  roleDefinition: '你是总部 AI 招商顾问，负责接待加盟代理商负责人、识别资质并推进建档、考察、审批和签约。',
  taskWorkflow: '围绕城市、预算、经验、开店时点、决策角色完成建档；根据阶段推进招商会邀约、总部考察、资料外发、报价审批和签约动作。',
  edgeCases: '涉及加盟费、返利、合同、打款、区域独家、收益承诺和例外政策时，不直接承诺，统一进入审批或转人工。',
  formatRules: '保持专业、可信、克制，不使用门店零售或 C 端消费语气。短句分段，优先明确下一步动作。',
};

export const mockReport = {
  reportDate: franchiseReport.reportDate,
  totalLeads: franchiseReport.totalLeads,
  newLeads: franchiseReport.newLeads,
  totalCustomers: franchiseReport.totalLeads,
  newCustomers: franchiseReport.newLeads,
  totalMessages: franchiseReport.totalMessages,
  sentMessages: franchiseReport.sentMessages,
  receivedMessages: franchiseReport.totalMessages,
  aiReplies: franchiseReport.aiReplies,
  avgResponseTime: franchiseReport.avgResponseTime,
  signingPipeline: franchiseReport.signingPipeline,
  signedThisMonth: franchiseReport.signedThisMonth,
  conversionRate: franchiseReport.conversionRate,
  pendingApprovals: franchiseReport.pendingApprovals,
  totalGroups: franchiseEvents.length,
  highFreqKeywords: franchiseReport.highFreqKeywords,
  keyLeads: franchiseReport.keyLeads,
  keyCustomers: franchiseReport.keyLeads,
  trendData: franchiseReport.trendData,
  funnelData: franchiseReport.funnelData,
  pendingTagApprovals: franchiseReport.pendingTagApprovals,
  pendingTaskApprovals: franchiseReport.pendingTaskApprovals,
  aiSummary: franchiseReport.aiSummary,
  aiSuggestions: franchiseReport.aiSuggestions,
};

export const mockApprovalsFeed = mockApprovals;

// Backward-compatible aliases while remaining modules migrate to lead naming.
export const mockCustomers = mockLeadProfiles;
export const mockMessages = mockLeadMessages;
export const mockTasks = mockLeadTasks.map((task) => ({
  ...task,
  customerId: task.leadId,
  customerName: task.leadName,
}));
export const mockAppointments = mockLeadAppointments.map((item) => ({
  ...item,
  customerId: item.leadId,
  customerName: item.leadName,
}));
