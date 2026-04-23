import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 9 旅程 AI 自主招商引擎
 *
 * 定时扫描所有线索，根据其生命周期阶段和互动状态，
 * 自动匹配对应旅程 Agent 并创建执行任务。
 *
 * 旅程覆盖：
 * 1. 线索接待 (lead_capture)      — 新线索首联
 * 2. 资格评估 (qualification)     — 意向评估与建档
 * 3. 线索培育 (nurturing)         — 中意向定期培育
 * 4. 政策匹配 (policy_match)      — 高意向方案匹配
 * 5. 总部考察 (visit_invite)      — 邀约到总部
 * 6. 会务跟进 (event_followup)    — 会后催签
 * 7. 报价谈判 (negotiation)       — 报价与合同
 * 8. 签约推进 (sign_push)         — 催签与付款
 * 9. 沉默激活 (silent_wake)       — 唤醒沉默线索
 */

// 加载 AI 配置
async function loadAiConfig() {
  try {
    return await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
  } catch (e) {
    return null;
  }
}

// 轻量 LLM 调用
async function callLLMForJourney(config, systemPrompt, userPrompt) {
  if (!config || !config.enabled || !config.apiKey) return null;

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const isAzure = baseUrl.includes('.openai.azure.com');

  let url, headers;
  if (isAzure) {
    url = `${baseUrl}/openai/deployments/${config.modelName}/chat/completions?api-version=2024-08-01-preview`;
    headers = { 'Content-Type': 'application/json', 'api-key': config.apiKey };
  } else {
    url = `${baseUrl}/chat/completions`;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` };
  }

  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
  };
  if (isAzure) body.max_completion_tokens = 500;
  else { body.max_tokens = 500; body.model = config.modelName; }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn('[Autonomous Engine] LLM call failed:', e.message);
    return null;
  }
}

// 旅程规则引擎
const JOURNEY_RULES = [
  {
    id: 'lead_capture',
    label: '线索接待',
    match: (lead) => lead.lifecycleStatus === 'new' || lead.lifecycleStatus === 'pool',
    needApproval: false,
    buildPrompt: (lead) => `为新线索 ${lead.name} 生成首联破冰话术。城市:${lead.city || '未知'}。要求：专业、简洁、以了解对方加盟意向为目标。只返回话术内容，不超过80字。`,
    fallbackContent: (lead) => `${lead.name}您好，我是品牌总部招商顾问。看到您提交了加盟咨询，想了解下您目前在哪个城市，有没有具体的开店计划？`,
    taskTitle: (lead) => `线索首联 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：线索接待旅程自动首联',
    stage: 'lead_capture',
  },
  {
    id: 'qualification',
    label: '资格评估',
    match: (lead) => lead.lifecycleStatus === 'qualified' && lead.intentScore < 3.0 && lead.silentDays <= 3,
    needApproval: false,
    buildPrompt: (lead) => `线索 ${lead.name} 已建档但意向分较低(${lead.intentScore}/5)。生成一条跟进消息，目标是确认城市、预算和开店时间，以便提升意向评估。只返回消息内容，不超过80字。`,
    fallbackContent: (lead) => `${lead.name}您好，想跟您确认几个信息：您计划在哪个城市开店？大概预算范围和期望开业时间是？方便的话我帮您匹配合适方案。`,
    taskTitle: (lead) => `资格评估跟进 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：资格评估旅程自动跟进',
    stage: 'qualification',
  },
  {
    id: 'nurturing',
    label: '线索培育',
    match: (lead) => lead.lifecycleStatus === 'qualified' && lead.intentScore >= 2.0 && lead.intentScore < 3.5 && lead.silentDays >= 2,
    needApproval: false,
    buildPrompt: (lead) => `线索 ${lead.name}(意向分${lead.intentScore})处于培育阶段，已沉默${lead.silentDays}天。生成一条培育消息，可以分享成功案例、培训体系或开业支持信息。只返回消息内容，不超过100字。`,
    fallbackContent: (lead) => `${lead.name}您好，我们最近刚更新了一版同城门店经营数据，包括首月营收和回本周期。如果您还在评估，我可以发您做参考。`,
    taskTitle: (lead) => `线索培育 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：线索培育旅程自动触达',
    stage: 'nurturing',
  },
  {
    id: 'policy_match',
    label: '政策匹配',
    match: (lead) => lead.intentScore >= 3.5 && lead.intentScore < 4.0 && lead.lifecycleStatus === 'qualified',
    needApproval: false,
    buildPrompt: (lead) => `线索 ${lead.name}(意向分${lead.intentScore})意向较高，需匹配加盟政策。生成一条消息，介绍当前适合的加盟方案和区域政策。只返回消息内容，不超过100字。`,
    fallbackContent: (lead) => `${lead.name}您好，根据您的城市和预算，我为您匹配了两套加盟方案。方案A适合标准店型，方案B适合旗舰店型。您方便的话我把详细对比发您。`,
    taskTitle: (lead) => `政策匹配 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：政策匹配旅程自动推送',
    stage: 'policy_match',
  },
  {
    id: 'visit_invite',
    label: '总部考察',
    match: (lead) => lead.intentScore >= 4.0 && ['qualified', 'negotiating'].includes(lead.lifecycleStatus),
    needApproval: false,
    buildPrompt: (lead) => `线索 ${lead.name}(意向分${lead.intentScore})为高意向线索。生成一条总部考察邀约消息，包含考察亮点和档期安排。只返回消息内容，不超过80字。`,
    fallbackContent: (lead) => `${lead.name}您好，根据您的意向程度，建议安排一次总部考察。本周还有接待名额，我帮您预留并安排接待人对接，您看可以吗？`,
    taskTitle: (lead) => `总部考察邀约 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：总部考察旅程自动邀约',
    stage: 'visit_invite',
  },
  {
    id: 'event_followup',
    label: '会务跟进',
    match: (lead) => lead.lifecycleStatus === 'negotiating' && lead.silentDays >= 1 && lead.silentDays <= 5,
    needApproval: false,
    buildPrompt: (lead) => `线索 ${lead.name} 处于谈判阶段，需要会后跟进。生成一条催签跟进消息，推进资料补发和下一步对接。只返回消息内容，不超过80字。`,
    fallbackContent: (lead) => `${lead.name}您好，上次沟通后我帮您整理了培训体系和开业支持清单。如果您方便，本周可以安排一次视频沟通逐项确认。`,
    taskTitle: (lead) => `会务跟进 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：会务跟进旅程自动触达',
    stage: 'event_followup',
  },
  {
    id: 'negotiation',
    label: '报价谈判',
    match: (lead) => lead.lifecycleStatus === 'negotiating' && lead.intentScore >= 4.0,
    needApproval: true,
    buildPrompt: (lead) => `线索 ${lead.name}(意向分${lead.intentScore})处于谈判中。生成一条推进报价的消息，告知需要提交报价审批流程。只返回消息内容，不超过80字。`,
    fallbackContent: (lead) => `${lead.name}您好，针对您关注的加盟方案，我已整理好报价和合同要点清单，提交总部审批后会第一时间跟您确认。`,
    taskTitle: (lead) => `报价谈判推进 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：报价谈判旅程（需审批）',
    stage: 'negotiation',
  },
  {
    id: 'sign_push',
    label: '签约推进',
    match: (lead) => lead.lifecycleStatus === 'negotiating' && lead.intentScore >= 4.5,
    needApproval: true,
    buildPrompt: (lead) => `线索 ${lead.name}(意向分${lead.intentScore})即将签约。生成一条催签消息，包含合同确认和付款提醒。只返回消息内容，不超过80字。`,
    fallbackContent: (lead) => `${lead.name}您好，合同条款和付款安排已整理完毕，提交审批后我会第一时间发给您确认签约。`,
    taskTitle: (lead) => `签约推进 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：签约推进旅程（需审批）',
    stage: 'sign_push',
  },
  {
    id: 'silent_wake',
    label: '沉默激活',
    match: (lead) => lead.silentDays >= 7 && !['signed', 'rejected'].includes(lead.lifecycleStatus),
    needApproval: false,
    buildPrompt: (lead) => `线索 ${lead.name} 已沉默${lead.silentDays}天。生成一条唤醒消息，可以用同城案例、ROI数据或限时活动来重新建立联系。只返回消息内容，不超过100字。`,
    fallbackContent: (lead) => `${lead.name}您好，好久没联系了。我们最近有几个同城加盟商开业的案例，首月数据不错。如果您还在考虑，我把案例和测算发您参考。`,
    taskTitle: (lead) => `沉默激活 - ${lead.name}`,
    triggerReason: '🤖 AI 自主引擎：沉默激活旅程自动唤醒',
    stage: 'silent_wake',
  },
];

// 检查线索是否已有最近的同类旅程任务（避免重复触达）
async function hasRecentJourneyTask(leadId, stage, hoursWindow = 24) {
  const since = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
  const existing = await prisma.task.findFirst({
    where: {
      customerId: leadId,
      triggerSource: 'journey',
      triggerReason: { contains: stage },
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function GET(request) {
  try {
    // Cron 安全验证：仅允许内部调用
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await loadAiConfig();

    // 1. 加载所有活跃线索
    const leads = await prisma.customer.findMany({
      where: {
        isGroup: false,
        lifecycleStatus: { notIn: ['signed', 'rejected'] },
      },
      include: { tags: { include: { tag: true } } },
    });

    if (leads.length === 0) {
      return NextResponse.json({ status: 'idle', message: '无活跃线索' });
    }

    const results = {
      scanned: leads.length,
      tasksCreated: 0,
      journeyCoverage: {},
      skipped: 0,
      errors: 0,
    };

    const systemPrompt = `你是品牌总部的 AI 招商顾问。你正在为不同阶段的加盟线索生成个性化跟进消息。
要求：
1. 语气专业可信，像资深招商顾问
2. 不使用 C 端话术（如护理、美容、门店消费等）
3. 涉及价格、折扣、合同时只能引导，不做承诺
4. 每条消息不超过指定字数
5. 只返回消息内容，不加任何前缀或说明`;

    // 2. 遍历线索，匹配旅程规则
    for (const lead of leads) {
      for (const rule of JOURNEY_RULES) {
        if (!rule.match(lead)) continue;

        // 检查是否已有最近任务
        const hasRecent = await hasRecentJourneyTask(lead.id, rule.stage, 24);
        if (hasRecent) {
          results.skipped++;
          continue;
        }

        try {
          // 3. 生成消息内容（优先用 GPT，降级用 fallback）
          let content = null;
          if (config && config.enabled && config.apiKey) {
            content = await callLLMForJourney(config, systemPrompt, rule.buildPrompt(lead));
          }
          if (!content) {
            content = rule.fallbackContent(lead);
          }

          // 4. 创建任务
          await prisma.task.create({
            data: {
              customerId: lead.id,
              title: rule.taskTitle(lead),
              taskType: 'text',
              content,
              triggerSource: 'journey',
              triggerReason: rule.triggerReason,
              approvalStatus: rule.needApproval ? 'pending' : 'approved',
              executeStatus: rule.needApproval ? 'draft' : 'scheduled',
              scheduledAt: rule.needApproval ? null : new Date(Date.now() + 5 * 60 * 1000),
            },
          });

          results.tasksCreated++;
          results.journeyCoverage[rule.id] = (results.journeyCoverage[rule.id] || 0) + 1;

          // 记录审计日志
          await prisma.auditLog.create({
            data: {
              entityType: 'journey_engine',
              entityId: `${rule.id}_${lead.id}`,
              action: 'auto_create_task',
              operator: 'ai_engine',
              reason: `${rule.label} 旅程为 ${lead.name} 自动生成任务`,
              metadata: JSON.stringify({
                stage: rule.stage,
                leadName: lead.name,
                leadId: lead.id,
                intentScore: lead.intentScore,
                silentDays: lead.silentDays,
                needApproval: rule.needApproval,
              }),
            },
          });

          // 每个线索只匹配第一个符合的旅程（优先级从上到下）
          break;
        } catch (err) {
          console.error(`[Autonomous Engine] Error processing lead ${lead.name} for ${rule.id}:`, err);
          results.errors++;
        }
      }
    }

    const coverageCount = Object.keys(results.journeyCoverage).length;
    console.log(
      `[Autonomous Engine] Scan complete: ${results.scanned} leads, ${results.tasksCreated} tasks created, ${coverageCount}/9 journeys active, ${results.skipped} skipped`
    );

    return NextResponse.json({
      status: 'success',
      ...results,
      coverageRate: `${coverageCount}/9`,
    });
  } catch (error) {
    console.error('[Autonomous Engine] Critical Error:', error);
    return NextResponse.json({ error: 'Engine failed' }, { status: 500 });
  }
}
