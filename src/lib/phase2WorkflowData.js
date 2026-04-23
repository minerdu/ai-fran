import {
  mockAgentRuns,
  mockApprovals,
  mockEvents,
  mockLeads,
  mockPlaybooks,
} from './franchiseData';
import { mockLeadTasks } from './mockData';

const playbookSeed = [
  {
    mode: '保守版',
    title: '华南区 Q2 招商方案 - 保守版',
    budget: '28万',
    targetLeads: 24,
    positioningSummary: '优先拿下已有美业经验、预算 60 万以上的区域代理商负责人。',
    storeModelRecommendation: '标准店优先，聚焦广州、深圳两城成熟商圈。',
    policyRecommendation: '不改加盟费，仅增加开业训练营和 30 天驻店辅导包。',
    meetingStrategy: '总部小班考察 + 城市 1 对 1 洽谈，不做大规模会务扩张。',
    fissionStrategy: '仅对华南已签约加盟商开放定向转介绍，签约后返培训券。',
    predictedInviteAcceptRate: '26%',
    predictedAttendanceRate: '63%',
    predictedContractRate: '11%',
    predictedROI: '2.4x',
    assetBundle: ['招商手册精简版', '总部考察流程单', '区域案例单页'],
    outreachSequence: ['首次筛选', '定向外发资料', '总部考察邀约', '签约清单确认'],
    readiness: ['案例素材齐备', '无需政策审批', '顾问跟进压力低'],
    risks: ['新增线索规模有限', '对预算敏感线索吸引力偏弱'],
  },
  {
    mode: '标准版',
    title: mockPlaybooks[1]?.title || '华南区 Q2 招商方案 - 标准版',
    budget: mockPlaybooks[1]?.budget || '36万',
    targetLeads: mockPlaybooks[1]?.targetLeads || 30,
    positioningSummary: '围绕“轻投入高赋能”吸引美业转型和多店经营型加盟商。',
    storeModelRecommendation: '标准店 + 旗舰店双模型并行，覆盖广州、深圳、佛山。',
    policyRecommendation: '维持加盟费，追加开业物料包和总部讲师驻场支持。',
    meetingStrategy: '招商说明会 + 总部考察日双序列联动，自动推进到场与催签。',
    fissionStrategy: '上线 Q2 转介绍激励，邀请老加盟商带看总部考察。',
    predictedInviteAcceptRate: '31%',
    predictedAttendanceRate: '68%',
    predictedContractRate: '15%',
    predictedROI: '3.5x',
    assetBundle: ['完整招商手册', '培训体系海报', 'ROI 测算模板', 'FAQ 异议库'],
    outreachSequence: ['招商会邀约', '会前提醒', '签到提醒', '会后催签', '审批流触发'],
    readiness: ['需要裂变激励审批', '会务名单已预热', 'FAQ 模板可直接发布'],
    risks: ['会务链路需强运营支撑', '多城协同节奏复杂'],
  },
  {
    mode: '激进版',
    title: mockPlaybooks[0]?.title || '华南区 Q2 招商方案 - 激进版',
    budget: mockPlaybooks[0]?.budget || '52万',
    targetLeads: mockPlaybooks[0]?.targetLeads || 45,
    positioningSummary: '快速扩张高潜区域，抢占优质商圈与城市主理人资源。',
    storeModelRecommendation: '旗舰店 + 城市主理人机制，重点覆盖广州、深圳、东莞、珠海。',
    policyRecommendation: '限时首付下调 + 区域保护申请绿色通道，需总部审批后发布。',
    meetingStrategy: '巡回招商会 + 标杆店带看 + 集中面谈三段式推进。',
    fissionStrategy: '老加盟商推荐返现 2%，叠加城市主理人合伙激励与二维码招募包。',
    predictedInviteAcceptRate: '39%',
    predictedAttendanceRate: '74%',
    predictedContractRate: '18%',
    predictedROI: '2.8x',
    assetBundle: ['城市巡回主视觉', '短视频脚本 6 条', '小红书招商文案 8 条', '区域政策 FAQ'],
    outreachSequence: ['自动入池', '三轮邀约', '考察分流', '报价审批', '催签冲刺'],
    readiness: ['依赖政策审批', '需追加物料预算', '需要反作弊裂变规则同步'],
    risks: ['审批链更长', '政策敏感度高', '顾问跟进负荷提升'],
  },
];

export const phase2Playbooks = playbookSeed.map((item, index) => ({
  id: `playbook_phase2_${index + 1}`,
  status: index === 1 ? 'recommended' : index === 2 ? 'pending_approval' : 'draft',
  owner: index === 2 ? 'Playbook Planner Agent' : '总部招商策略组',
  ...item,
}));

export const phase2Events = mockEvents.map((event, index) => {
  const relatedLeadNames = event.relatedLeads
    .map((leadId) => mockLeads.find((lead) => lead.id === leadId)?.name)
    .filter(Boolean);
  const attendanceTarget = Math.max(event.confirmed, Math.ceil(event.capacity * 0.6));

  return {
    ...event,
    owner: index === 0 ? 'Invite + Event Center' : '总部考察 Agent',
    inviteAcceptRate: `${Math.round((event.registered / event.capacity) * 100)}%`,
    attendanceTargetRate: `${Math.round((attendanceTarget / Math.max(event.registered, 1)) * 100)}%`,
    signedGoal: index === 0 ? 6 : 3,
    relatedLeadNames,
    sequence: [
      { label: '首轮邀约', status: 'done', count: event.registered },
      { label: '电话拨号', status: 'dialing', count: Math.max(event.confirmed - 1, 0) },
      { label: '二次确认', status: 'active', count: event.confirmed },
      { label: '会前提醒', status: 'queued', count: Math.max(event.confirmed - 2, 0) },
      { label: '签到提醒', status: 'queued', count: Math.max(event.confirmed - 4, 0) },
      { label: '会后催签', status: 'planned', count: event.confirmed },
    ],
    nextAction: index === 0 ? '确认主持人脚本和现场签到二维码' : '锁定总部接待排班与标杆门店带看路线',
  };
});

export const phase2ReferralPrograms = [
  {
    id: 'ref_1',
    name: 'Q2 老加盟商转介绍激励',
    status: 'pending_approval',
    template: '老加盟商推荐',
    reward: '签约后返现 2% + 物料券',
    region: '华东 / 华南',
    fraudThreshold: '同手机号 / 同法人 / 同地址自动去重',
    trigger: '已签约加盟商提交有效推荐，且被推荐线索进入总部考察',
    assets: ['推荐海报', '专属二维码', 'FAQ 话术', '结算说明单'],
    progress: { published: 0, referred: 18, qualified: 7, signed: 2 },
    owner: 'Referral Design Agent',
  },
  {
    id: 'ref_2',
    name: '城市主理人合伙计划',
    status: 'draft',
    template: '城市主理人',
    reward: '区域开店分成 + 总部培训权益',
    region: '华中 / 西南',
    fraudThreshold: '同城重复推荐超过 3 次触发人工复核',
    trigger: '城市主理人完成 2 场本地说明会并带来有效考察线索',
    assets: ['城市路演海报', '邀约话术', '招募短链', '主理人手册'],
    progress: { published: 0, referred: 9, qualified: 4, signed: 0 },
    owner: 'Growth Strategy Team',
  },
  {
    id: 'ref_3',
    name: '员工内推加盟线索计划',
    status: 'active',
    template: '员工内推',
    reward: '有效考察奖励 800 元，签约奖励 3000 元',
    region: '全国',
    fraudThreshold: '同员工月内超过 5 条无效推荐暂停资格',
    trigger: '总部员工提交 B 端负责人线索并完成基础建档',
    assets: ['内推长图', '员工 FAQ', '线索建档表'],
    progress: { published: 42, referred: 27, qualified: 11, signed: 3 },
    owner: 'HR + Referral Center',
  },
];

export const phase2RunTrails = mockAgentRuns.map((run, index) => ({
  ...run,
  owner: index === 0 ? 'Orchestrator Agent' : index === 1 ? 'Asset Generation Agent' : 'Lead Scoring Agent',
  scope: index === 0 ? '华南区 Playbook 生成与审批' : index === 1 ? '深圳招商会会后资料外发' : '全量线索评分与推荐动作',
  outputSummary: index === 0
    ? '已生成 3 套 Playbook，等待华南区域政策审批后发布。'
    : index === 1
      ? '已完成资料包组合与预算估算，待审批后自动外发。'
      : '已更新 156 条线索评分，输出高优先级跟进建议 23 条。',
  timeline: [
    { time: run.startedAt, label: 'Run 启动', state: 'done' },
    { time: run.startedAt, label: run.steps[0], state: 'done' },
    { time: run.startedAt, label: run.steps[1], state: 'done' },
    { time: run.startedAt, label: run.currentStep, state: run.status === 'completed' ? 'done' : 'active' },
  ],
  recommendedAction: run.status === 'completed' ? '查看评分结果' : '继续执行或处理审批',
}));

export function getWorkflowOverview() {
  const pendingApprovals = mockApprovals.filter((item) => item.status === 'pending');
  const activeRuns = phase2RunTrails.filter((item) => item.status !== 'completed');
  const upcomingEvents = phase2Events.filter((item) => item.status === 'upcoming');
  const activeReferrals = phase2ReferralPrograms.filter((item) => item.status === 'active' || item.status === 'pending_approval');

  return {
    pendingApprovals: pendingApprovals.length,
    activeRuns: activeRuns.length,
    upcomingEvents: upcomingEvents.length,
    activeReferrals: activeReferrals.length,
    readyPlaybooks: phase2Playbooks.filter((item) => item.status === 'recommended' || item.status === 'draft').length,
  };
}

export function getTodayExecutionQueue() {
  return [...mockLeadTasks]
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .map((task) => ({
      id: task.id,
      leadName: task.leadName,
      title: task.title,
      status: task.approvalStatus === 'pending' ? '待审批' : task.executeStatus === 'scheduled' ? '待执行' : '草稿',
      time: new Date(task.scheduledAt).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      source: task.triggerSource,
    }));
}

export function getQuickActions() {
  return [
    { label: '继续上次 Playbook', href: '/workflow/playbooks', meta: '查看三套策略并选择发布方案' },
    { label: '查看会务名单', href: '/workflow/events', meta: '跟进说明会、考察日与签到序列' },
    { label: '发布裂变规则', href: '/workflow/referrals', meta: '启用转介绍和城市主理人模板' },
    { label: '查看运行轨迹', href: '/workflow/runs', meta: '处理暂停 Run 与审批断点' },
  ];
}
