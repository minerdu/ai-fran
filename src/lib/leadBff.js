import prisma from './prisma';
import { getLeadScoresMap, getLeadStageHistory, recordLeadStageChange, syncLeadOperationalState } from './executionOpsService';

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function lifecycleToStage(status) {
  if (status === 'qualified') return 'qualified';
  if (status === 'negotiating') return 'negotiating';
  if (status === 'signed') return 'signed';
  if (status === 'rejected') return 'rejected';
  return 'pool';
}

function formatBudget(value) {
  if (!value) return '待确认';
  if (value >= 10000) return `¥${(value / 10000).toFixed(1)}w`;
  return `¥${value}`;
}

function deriveLeadProfile(customer) {
  const crmHistory = parseJson(customer.crmHistory, []);
  const latestRecord = crmHistory[0] || null;
  const company = latestRecord?.company || (customer.isGroup ? '招商沟通群' : '待建档企业');
  const city = latestRecord?.city || '待确认城市';
  const region = latestRecord?.region || city;
  const investBudget = latestRecord?.investBudget || (latestRecord?.amount ? formatBudget(latestRecord.amount) : (customer.totalSpent ? formatBudget(customer.totalSpent) : '待确认'));
  const storeCount = latestRecord?.storeCount || crmHistory.length;
  const experience = latestRecord?.experience || (customer.valueScore >= 4 ? '具备门店/渠道经验' : customer.valueScore >= 3 ? '具备基础经营经验' : '待确认经验');
  const assignedTo = customer.assignedToId === 'manual_followup' ? '人工跟进池' : customer.assignedToId || 'AI 招商顾问';

  return {
    company,
    city,
    region,
    investBudget,
    storeCount,
    experience,
    assignedTo,
    crmHistory,
  };
}

function formatTagLinks(tagLinks = []) {
  return tagLinks.map((link) => ({
    id: link.tagId,
    name: link.tag?.name || '标签',
    color: link.tag?.color || '#2563eb',
    category: link.tag?.category || 'custom',
  }));
}

function buildSuggestedActions(customer) {
  const actions = [];
  if (customer.silentDays >= 7) actions.push('发起沉默唤醒');
  if (customer.intentScore >= 4) actions.push('优先推进会务邀约');
  if (customer.lifecycleStatus === 'pool') actions.push('补全建档资料');
  if (customer.lifecycleStatus === 'negotiating') actions.push('准备政策 / 报价审批');
  if (!actions.length) actions.push('继续保持标准跟进');
  return actions;
}

function buildLeadSummary(customer) {
  const profile = deriveLeadProfile(customer);
  const latestConversation = customer.conversations?.[0] || null;
  const profileState = profile.company === '待建档企业' || customer.phone == null ? 'pending_profile' : 'profiled';

  return {
    id: customer.id,
    name: customer.name,
    company: profile.company,
    city: profile.city,
    region: profile.region,
    wechatId: customer.wechatId,
    aiSummary: customer.aiSummary || '待生成 AI 摘要',
    intentScore: customer.intentScore || 0,
    investCapability: customer.valueScore || 0,
    industryFit: customer.satisfactionScore || 0,
    urgency: customer.silentDays >= 7 ? 4.2 : 2.8,
    silentDays: customer.silentDays || 0,
    stage: lifecycleToStage(customer.lifecycleStatus),
    source: customer.source || 'manual',
    unreadCount: latestConversation?.unreadCount || 0,
    assignedToId: customer.assignedToId || 'main',
    profileState,
    investBudget: profile.investBudget,
    crmHistory: profile.crmHistory,
    tags: formatTagLinks(customer.tags),
    lastInteractionAt: customer.lastInteractionAt?.toISOString() || latestConversation?.lastMessageAt?.toISOString() || customer.updatedAt.toISOString(),
    isGroup: customer.isGroup,
  };
}

function buildGroupSummary(customer) {
  const profile = deriveLeadProfile(customer);
  const latestConversation = customer.conversations?.[0] || null;
  const messageCount = latestConversation?._count?.messages || 0;

  return {
    id: customer.id,
    name: customer.name,
    city: profile.city,
    region: profile.region,
    memberCount: Math.max(messageCount * 3, 12),
    unreadCount: latestConversation?.unreadCount || 0,
    lastMessageAt: latestConversation?.lastMessageAt?.toISOString() || customer.updatedAt.toISOString(),
    aiSummary: customer.aiSummary || '待生成群摘要',
  };
}

export async function loadLeadList({ filter = 'all', search = '' } = {}) {
  await syncLeadOperationalState();
  const customers = await prisma.customer.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { aiSummary: { contains: search } },
              { wechatId: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: {
          unreadCount: true,
          lastMessageAt: true,
        },
      },
    },
    orderBy: [
      { lastInteractionAt: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  const scoreMap = await getLeadScoresMap();
  const leads = customers.map((customer) => {
    const summary = buildLeadSummary(customer);
    const score = scoreMap[customer.id];
    if (!score) return summary;
    return {
      ...summary,
      intentScore: score.intentScore,
      investCapability: score.valueScore,
      industryFit: score.satisfactionScore,
      compositeScore: score.compositeScore,
      scoreUpdatedAt: score.updatedAt,
    };
  });

  if (filter === 'ai_handling') {
    return leads.filter((lead) => lead.assignedToId !== 'manual_followup');
  }
  if (filter === 'high_intent') {
    return leads.filter((lead) => lead.intentScore >= 4);
  }
  if (filter === 'silent') {
    return leads.filter((lead) => lead.silentDays >= 7);
  }

  return leads;
}

export async function loadLeadDetail(id) {
  await syncLeadOperationalState();
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50,
          },
        },
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!customer) return null;

  const profile = deriveLeadProfile(customer);
  const conversation = customer.conversations?.[0] || null;
  const messages = (conversation?.messages || []).map((message) => ({
    id: message.id,
    direction: message.direction,
    senderType: message.senderType,
    contentType: message.contentType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  const tasks = customer.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.triggerReason || task.content,
    approvalStatus: task.approvalStatus,
    executeStatus: task.executeStatus,
    scheduledAt: task.scheduledAt?.toISOString() || null,
    createdAt: task.createdAt.toISOString(),
  }));

  const [scoreMap, stageHistory] = await Promise.all([
    getLeadScoresMap(),
    getLeadStageHistory(id),
  ]);
  const score = scoreMap[id] || null;

  return {
    id: customer.id,
    name: customer.name,
    lifecycleStatus: customer.lifecycleStatus,
    company: profile.company,
    city: profile.city,
    region: profile.region,
    investBudget: profile.investBudget,
    experience: profile.experience,
    storeCount: profile.storeCount,
    assignedTo: profile.assignedTo,
    source: customer.source || 'manual',
    phone: customer.phone || '待补充',
    wechatId: customer.wechatId || '待补充',
    aiSummary: customer.aiSummary || '待生成 AI 摘要',
    lastKeyQuestion: customer.lastKeyQuestion || '',
    lastInteractionAt: customer.lastInteractionAt?.toISOString() || customer.updatedAt.toISOString(),
    silentDays: customer.silentDays || 0,
    intentScore: score?.intentScore ?? customer.intentScore ?? 0,
    valueScore: score?.valueScore ?? customer.valueScore ?? 0,
    demandScore: customer.silentDays >= 7 ? 4.5 : 3.2,
    satisfactionScore: score?.satisfactionScore ?? customer.satisfactionScore ?? 0,
    compositeScore: score?.compositeScore ?? 0,
    scoreUpdatedAt: score?.updatedAt || null,
    relationScore: customer.lifecycleStatus === 'negotiating' ? 4.3 : customer.lifecycleStatus === 'qualified' ? 3.4 : 2.6,
    stageHistory,
    tags: formatTagLinks(customer.tags),
    messages,
    tasks,
    suggestedActions: buildSuggestedActions(customer),
  };
}

export async function loadLeadGroups({ city, region, limit = 50 } = {}) {
  const groups = await prisma.customer.findMany({
    where: {
      isGroup: true,
    },
    include: {
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: {
          unreadCount: true,
          lastMessageAt: true,
          _count: {
            select: {
              messages: true,
            },
          },
        },
      },
    },
    orderBy: [
      { lastInteractionAt: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  let items = groups.map(buildGroupSummary);
  if (city || region) {
    const target = [city, region].filter(Boolean);
    const matched = items.filter((item) => target.includes(item.city) || target.includes(item.region));
    if (matched.length) items = matched;
  }

  return items.slice(0, limit);
}

export async function loadLeadTimeline(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tags: {
        include: { tag: true },
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 80,
          },
        },
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
        take: 40,
      },
    },
  });

  if (!customer) return null;

  const [detail, stageHistory] = await Promise.all([
    loadLeadDetail(id),
    getLeadStageHistory(id),
  ]);

  const messageItems = (customer.conversations?.[0]?.messages || []).map((message) => ({
    id: `msg_${message.id}`,
    timestamp: message.createdAt.toISOString(),
    type: message.senderType === 'customer' ? 'wecom' : 'ai_action',
    source: message.senderType === 'customer' ? 'customer' : message.senderType === 'ai' ? 'ai' : 'human',
    content: message.content,
    detail: message.contentType === 'text' ? '招商对话消息' : `消息类型 ${message.contentType}`,
    agent: message.senderType === 'ai' ? 'AI 招商顾问' : null,
    approvalId: null,
  }));

  const taskItems = customer.tasks.map((task) => ({
    id: `task_${task.id}`,
    timestamp: (task.executedAt || task.scheduledAt || task.createdAt).toISOString(),
    type: task.taskType === 'request_approval' ? 'approval' : task.taskType === 'invite_event' ? 'event' : 'ai_action',
    source: task.triggerSource === 'manual_command' ? 'human' : task.triggerSource === 'workflow' ? 'system' : 'ai',
    content: task.title,
    detail: `${task.triggerReason || '系统生成招商动作'} · ${task.approvalStatus}/${task.executeStatus}`,
    agent: task.triggerSource === 'workflow' ? 'Workflow Agent' : 'AI 招商顾问',
    approvalId: task.approvalStatus === 'pending' ? task.id : null,
  }));

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'customer', entityId: id },
        { entityType: 'lead', entityId: id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const auditItems = auditLogs.map((log) => ({
    id: `audit_${log.id}`,
    timestamp: log.createdAt.toISOString(),
    type: log.action === 'mark_exception' ? 'approval' : 'ai_action',
    source: log.operator === 'human' ? 'human' : 'system',
    content: log.action === 'mark_exception' ? '线索已标记例外' : log.action,
    detail: log.reason || '系统记录的线索动作',
    agent: log.operator === 'human' ? '人工处理' : '系统',
    approvalId: null,
  }));

  const items = [...messageItems, ...taskItems, ...auditItems]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const stageItems = stageHistory.map((history) => ({
    id: `stage_${history.id}`,
    timestamp: history.createdAt,
    type: 'ai_action',
    source: history.actor === 'human' ? 'human' : 'system',
    content: `阶段变更：${history.fromStage || '初始'} → ${history.toStage}`,
    detail: history.reason || '线索阶段更新',
    agent: history.actor === 'human' ? '人工处理' : 'Lead Scoring Agent',
    approvalId: null,
  }));

  return {
    lead: detail,
    items: [...items, ...stageItems].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
  };
}

async function ensureTag(name, category, color) {
  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.tag.create({
    data: {
      name,
      category,
      color,
    },
  });
}

export async function markLeadException(id, reason = '人工标记例外') {
  const tag = await ensureTag('例外线索', 'risk', '#dc2626');
  const existing = await prisma.customerTag.findFirst({
    where: {
      customerId: id,
      tagId: tag.id,
    },
  });

  if (!existing) {
    await prisma.customerTag.create({
      data: {
        customerId: id,
        tagId: tag.id,
        addedBy: 'manual',
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'customer',
      entityId: id,
      action: 'mark_exception',
      operator: 'human',
      reason,
    },
  });
}

export async function assignLeadToManual(id, reason = '批量转人工跟进') {
  await prisma.customer.update({
    where: { id },
    data: {
      assignedToId: 'manual_followup',
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'customer',
      entityId: id,
      action: 'assign_manual',
      operator: 'human',
      reason,
    },
  });
}

export async function batchCreateInviteTasks(ids = []) {
  const now = Date.now();
  for (const [index, id] of ids.entries()) {
    await prisma.task.create({
      data: {
        customerId: id,
        title: '批量邀约任务',
        taskType: 'invite_event',
        content: '针对高意向线索发起会务邀约，并同步发送总部考察或招商说明会排期。',
        triggerSource: 'manual_command',
        triggerReason: '线索页批量邀约',
        approvalStatus: 'approved',
        executeStatus: 'scheduled',
        scheduledAt: new Date(now + (index + 1) * 5 * 60 * 1000),
      },
    });
  }
}

export async function updateLeadLifecycleStage(id, nextStage, reason = '人工更新线索阶段') {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      lifecycleStatus: true,
    },
  });

  if (!customer || customer.lifecycleStatus === nextStage) return customer;

  await prisma.customer.update({
    where: { id },
    data: {
      lifecycleStatus: nextStage,
    },
  });

  await recordLeadStageChange(id, customer.lifecycleStatus, nextStage, reason, 'human');
  return prisma.customer.findUnique({ where: { id } });
}
