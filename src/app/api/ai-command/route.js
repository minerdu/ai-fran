import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { appendGovernanceAudit } from '@/lib/governanceStore';
import { parseSopScheduleToTasks, validateSopPlan } from './sop-parser';
import { batchReview } from '@/lib/services/auto-review';
import { mockLeads } from '@/lib/franchiseData';

/**
 * AI 招商指挥中心 - 自然语言工作流生成与执行（增强版）
 *
 * 支持：
 * - 单步批量招商动作生成
 * - 多步 SOP 时间编排（如线索培育、招商会邀约、签约推进）
 * - 条件筛选增强（高意向、高投资能力、沉默线索等）
 * - AI 自动审核引擎集成
 */

// 加载 AI 模型配置
async function loadAiConfig() {
  try {
    return await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
  } catch (e) {
    return null;
  }
}

function buildCommandId() {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCommandContext(body = {}) {
  return {
    currentTab: body.current_tab || null,
    workspaceId: body.workspace_id || null,
    brandId: body.brand_id || null,
  };
}

function buildObjectLink(type, id = '') {
  if (type === 'lead') return `/leads/${id}`;
  if (type === 'approval') return '/approvals';
  if (type === 'playbook') return id ? `/ai/playbooks/${id}` : '/ai/playbooks';
  if (type === 'task') return '/tasks';
  return '/ai/command-center';
}

function buildLinkedObjects(targetLeads = [], extras = []) {
  return [
    ...targetLeads.slice(0, 6).map((lead) => ({
      type: 'lead',
      id: lead.id,
      name: lead.name,
      href: buildObjectLink('lead', lead.id),
    })),
    ...extras,
  ];
}

function buildCommandCard({
  id,
  input,
  intent,
  status,
  summary,
  createdAt = new Date().toISOString(),
  linkedObjects = [],
  execution = {},
  context = {},
  resultType = 'workflow',
}) {
  return {
    id,
    input,
    intent,
    status,
    resultType,
    resultSummary: summary,
    createdAt,
    linkedObjects,
    execution,
    context,
  };
}

function buildForcedApprovalNote(plan, command) {
  const actionTitle = plan?.action?.title || plan?.intent || '招商动作';
  return `命中强制人工审批规则：${actionTitle} 需先进入审批中心。原始指令：${command}`;
}

async function recordCommandAudit(commandId, command, context, resultType, summary, linked = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: 'ai_command',
        entityId: commandId,
        action: resultType,
        operator: 'human',
        reason: command,
        metadata: JSON.stringify({
          context,
          summary,
          ...linked,
        }),
      },
    });
    await appendGovernanceAudit({
      scope: 'ai_command',
      entityType: 'ai_command',
      entityId: commandId,
      action: resultType,
      operator: 'human',
      reason: command,
      metadata: {
        context,
        summary,
        ...linked,
      },
    });
  } catch (error) {
    console.error('[AI-Command] Failed to persist command audit:', error);
  }
}

// 调用 LLM
async function callLLM(config, systemPrompt, userMessage) {
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
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
  };
  if (isAzure) body.max_completion_tokens = 2000;
  else { body.max_tokens = 2000; body.model = config.modelName; }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error (${res.status}): ${errText.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 构建招商指挥增强版系统提示词
function buildCommandSystemPrompt(leadSummary) {
  return `你是品牌总部的 AI 招商执行官。运营人员会用自然语言给你下达指令，你需要：

1. 理解指令意图（是单次招商动作，还是多步 SOP 编排）
2. 根据线索数据库信息，筛选出符合条件的代理商负责人
3. 生成具体的执行计划
4. 输出结构化的JSON执行方案

当前系统中的线索概况：
${leadSummary}

你必须严格按照以下JSON格式返回（不要返回任何其他内容，只返回纯JSON）：

【如果是单次任务】：
{
  "intent": "指令意图简述",
  "type": "single",
  "filter": {
    "description": "筛选条件描述",
    "criteria": "intent_high | value_high | silent | negotiating | signed | all | active_7d | new_leads"
  },
  "action": {
    "type": "send_message | send_material | create_reminder | batch_tag | invite_event | request_approval",
    "title": "任务标题",
    "content": "要发送给线索的具体内容（用专业可信的招商顾问口吻撰写）",
    "needApproval": true或false(规则：涉及加盟费折扣、返利、独家代理、ROI承诺、合同、付款、资料外发审批等敏感操作设为true，其他设为false)
  },
  "summary": "用中文向运营者汇报的招商执行摘要（100字以内）"
}

【如果是多步SOP编排】（如"做3次建档培育SOP"、"连续跟进一周"等）：
{
  "intent": "多步SOP编排",
  "type": "sop",
  "filter": {
    "description": "筛选条件描述",
    "criteria": "同上"
  },
  "sop_schedule": [
    {"day_offset": 0, "time": "10:00", "title": "第1步标题", "action": {"type": "send_message"}, "content": "第1步要发的消息内容"},
    {"day_offset": 2, "time": "14:00", "title": "第2步标题", "action": {"type": "send_message"}, "content": "第2步要发的消息内容"},
    {"day_offset": 4, "time": "10:00", "title": "第3步标题", "action": {"type": "send_message"}, "content": "第3步要发的消息内容"}
  ],
  "needApproval": true或false(规则：涉及加盟费、返利、独家权、合同条款、外发敏感资料、ROI承诺等设为true，其他设为false),
  "summary": "向运营者汇报的多步招商执行计划摘要（100字以内）"
}

注意：
- SOP中每步的 content 要结合线索情况写出有差异化的话术，不要千篇一律
- day_offset 0 = 今天，1 = 明天，以此类推
- time 为建议的发送时间，格式 "HH:mm"
- 不得输出门店消费、护理项目、会员卡充值、术后关怀等 C 端内容
- 涉及价格优惠、独家权、返利、ROI、付款、合同、资料外发审批时 needApproval 必须为 true`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { command } = body;
    const context = normalizeCommandContext(body);
    const commandId = buildCommandId();
    if (!command || !command.trim()) {
      return NextResponse.json({ error: '请输入招商指令' }, { status: 400 });
    }

    const config = await loadAiConfig();

    // 1. 加载线索概况摘要供 LLM 分析（优先数据库，降级 mock 数据 = CRM/企微导入数据）
    let leads = [];
    try {
      leads = await prisma.customer.findMany({
        where: { isGroup: false },
        include: { tags: { include: { tag: true } } },
      });
    } catch (e) {
      console.warn('[AI-Command] DB query failed, using mock leads:', e.message);
    }
    if (leads.length === 0) {
      // 降级：使用 mock 数据（视为从 CRM/企微 导入的真实线索）
      leads = mockLeads.filter(l => !l.isGroup).map(l => ({
        ...l,
        tags: (l.tags || []).map(t => ({ tag: { name: typeof t === 'string' ? t : t.name || t } })),
      }));
    }

    const leadSummary = leads.map(c => {
      const tags = c.tags?.map(t => t.tag.name).join('、') || '无';
      const hasCrm = c.crmHistory ? '有招商记录' : '无招商记录';
      return `- ${c.name} | 意向:${c.intentScore} | 价值:${c.valueScore} | 沉默:${c.silentDays}天 | 标签:[${tags}] | ${hasCrm}`;
    }).join('\n');

    let plan;

    if (config && config.enabled && config.apiKey && config.apiBaseUrl) {
      // 真实 LLM 解析指令
      const systemPrompt = buildCommandSystemPrompt(leadSummary);
      const llmResponse = await callLLM(config, systemPrompt, command);

      // 提取 JSON（LLM 可能在 JSON 前后包裹 markdown 代码块）
      let jsonStr = llmResponse;
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      try {
        plan = JSON.parse(jsonStr);
      } catch (e) {
        const commandCard = buildCommandCard({
          id: commandId,
          input: command,
          intent: 'free_text_reply',
          status: 'completed',
          summary: llmResponse,
          linkedObjects: [],
          context,
          resultType: 'text_reply',
        });
        await recordCommandAudit(commandId, command, context, 'text_reply', llmResponse, {
          commandCard,
        });
        return NextResponse.json({
          success: true,
          type: 'text',
          message: llmResponse, // 如果 LLM 没返回 JSON，直接当文本回复
          command: commandCard,
          context,
        });
      }
    } else {
      // Mock 模式
      plan = buildMockPlan(command, leads);
    }

    // 2. 根据 plan.filter.criteria 筛选线索
    let targetLeads = filterLeads(leads, plan.filter?.criteria || 'all');

    // 3. 判断是单次任务还是多步 SOP
    if (plan.type === 'sop' && plan.sop_schedule) {
      // ===== 多步 SOP 编排 =====
      const validation = validateSopPlan(plan);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          type: 'error',
          message: `SOP 计划结构不合法: ${validation.errors.join('；')}`,
        }, { status: 400 });
      }

      const result = await parseSopScheduleToTasks(
        plan.sop_schedule,
        targetLeads,
        {
          command,
          intent: plan.intent,
          needApproval: plan.needApproval ?? true,
        }
      );

      const pendingManual = result.tasks.filter((task) => task.status === '待审批').length;
      const linkedObjects = buildLinkedObjects(targetLeads, pendingManual > 0 ? [{
        type: 'approval',
        id: 'pending',
        name: `${pendingManual} 项待审批`,
        href: buildObjectLink('approval'),
      }] : []);
      const summaryText = plan.summary || result.summary;
      const commandCard = buildCommandCard({
        id: commandId,
        input: command,
        intent: plan.intent || 'sop_workflow',
        status: pendingManual > 0 ? 'pending_approval' : 'completed',
        summary: summaryText,
        linkedObjects,
        execution: {
          targetCount: targetLeads.length,
          tasksCreated: result.tasks.length,
          pendingManual,
          targetNames: targetLeads.map((c) => c.name),
        },
        context,
        resultType: 'sop_workflow',
      });

      await recordCommandAudit(commandId, command, context, 'sop_workflow', summaryText, {
        targetCount: targetLeads.length,
        tasksCreated: result.tasks.length,
        pendingManual,
        linkedObjects,
        intent: plan.intent || 'sop_workflow',
        commandCard,
      });

      return NextResponse.json({
        success: true,
        type: 'sop_workflow',
        command: commandCard,
        plan: {
          intent: plan.intent,
          filterDesc: plan.filter?.description,
          steps: plan.sop_schedule.length,
          needApproval: plan.needApproval,
        },
        execution: {
          targetCount: targetLeads.length,
          targetLeadNames: targetLeads.map(c => c.name),
          targetNames: targetLeads.map(c => c.name),
          tasksCreated: result.tasks.length,
          tasks: result.tasks.slice(0, 20),
        },
        linkedObjects,
        summary: summaryText,
        context,
      });
    }

    // ===== 单次批量任务 =====
    const needApproval = plan.action?.needApproval ?? false;
    const tasksCreated = [];

    for (const lead of targetLeads) {
      try {
        // Ensure lead exists in DB (may be mock data)
        const existingLead = await prisma.customer.findUnique({ where: { id: lead.id }, select: { id: true } });
        if (!existingLead) {
          await prisma.customer.create({
            data: {
              id: lead.id,
              name: lead.name || '未知线索',
              phone: lead.phone || '',
              wechatId: lead.wechatId || `wx_${lead.id}`,
              source: lead.source || 'crm_import',
              lifecycleStatus: lead.lifecycleStatus || 'pool',
              intentScore: lead.intentScore || 3.0,
              valueScore: lead.valueScore || 3.0,
              satisfactionScore: lead.satisfactionScore || 0,
              silentDays: lead.silentDays || 0,
              aiSummary: lead.aiSummary || '',
            },
          });
        }
        const task = await prisma.task.create({
          data: {
            customerId: lead.id,
            title: plan.action?.title || '自然语言招商指令任务',
            taskType: plan.action?.type === 'send_material' ? 'asset_bundle' : (plan.action?.type || 'text'),
            content: plan.action?.content || command,
            triggerSource: 'manual_command',
            triggerReason: `📋 人工招商指令: "${command.substring(0, 50)}"`,
            approvalStatus: 'pending', // 先设 pending，由 auto-review 决定
            executeStatus: 'draft',
            reviewedBy: needApproval ? 'ai' : null,
            reviewNotes: needApproval ? buildForcedApprovalNote(plan, command) : null,
          },
        });
        tasksCreated.push(task);
      } catch (taskErr) {
        console.warn(`[AI-Command] Failed to create task for ${lead.name}:`, taskErr.message);
      }
    }

    // 运行 AI 自动审核
    const taskIds = tasksCreated.map(t => t.id);
    const reviewResult = needApproval
      ? {
          approved: [],
          pending: taskIds,
          results: taskIds.map((taskId) => ({
            taskId,
            approved: false,
            reason: buildForcedApprovalNote(plan, command),
          })),
        }
      : await batchReview(taskIds);

    // 构建返回数据
    const responseTaskDetails = tasksCreated.map((task, i) => {
      const lead = targetLeads[i];
      const isApproved = reviewResult.approved.includes(task.id);
      return {
        id: task.id,
        leadId: lead.id,
        leadName: lead.name,
        status: isApproved ? '已排期（AI自动审核通过）' : '待审批',
        reviewedBy: isApproved ? 'ai' : (needApproval ? 'human_required' : 'ai'),
      };
    });

    const summaryText = needApproval
      ? `${plan.summary || `已为 ${targetLeads.length} 位线索生成招商任务`}，因涉及敏感动作，已提交审批中心等待人工确认。`
      : (plan.summary || `已为 ${targetLeads.length} 位线索生成招商任务（${reviewResult.approved.length}条自动通过，${reviewResult.pending.length}条待人工审批）。`);
    const linkedObjects = buildLinkedObjects(targetLeads, reviewResult.pending.length > 0 ? [{
      type: 'approval',
      id: 'pending',
      name: `${reviewResult.pending.length} 项待审批`,
      href: buildObjectLink('approval'),
    }] : []);
    const commandCard = buildCommandCard({
      id: commandId,
      input: command,
      intent: plan.intent || 'workflow',
      status: reviewResult.pending.length > 0 ? 'pending_approval' : 'completed',
      summary: summaryText,
      linkedObjects,
      execution: {
        targetCount: targetLeads.length,
        tasksCreated: tasksCreated.length,
        autoApproved: reviewResult.approved.length,
        pendingManual: reviewResult.pending.length,
        targetNames: targetLeads.map((c) => c.name),
      },
      context,
      resultType: 'workflow',
    });
    await recordCommandAudit(commandId, command, context, 'workflow', summaryText, {
      targetCount: targetLeads.length,
      tasksCreated: tasksCreated.length,
      autoApproved: reviewResult.approved.length,
      pendingManual: reviewResult.pending.length,
      linkedObjects,
      intent: plan.intent || 'workflow',
      commandCard,
    });

    return NextResponse.json({
      success: true,
      type: 'workflow',
      command: commandCard,
      plan: {
        intent: plan.intent,
        filterDesc: plan.filter?.description,
        actionTitle: plan.action?.title,
        actionContent: plan.action?.content,
        needApproval,
      },
      execution: {
        targetCount: targetLeads.length,
        targetLeadNames: targetLeads.map(c => c.name),
        targetNames: targetLeads.map(c => c.name),
        tasksCreated: tasksCreated.length,
        autoApproved: reviewResult.approved.length,
        pendingManual: reviewResult.pending.length,
        tasks: responseTaskDetails.slice(0, 10),
      },
      linkedObjects,
      summary: summaryText,
      context,
    });

  } catch (error) {
    console.error('[AI-Command] Error:', error);
    return NextResponse.json({
      success: false,
      type: 'error',
      message: `执行失败: ${error.message}`,
    }, { status: 500 });
  }
}

// 线索筛选逻辑
function filterLeads(leads, criteria) {
  switch (criteria) {
    case 'intent_high':
      return leads.filter((lead) => lead.intentScore >= 4.0);
    case 'value_high':
      return leads.filter((lead) => lead.valueScore >= 4.0);
    case 'silent':
      return leads.filter((lead) =>
        lead.tags?.some((tagLink) => tagLink.tag.name === '培育中' || tagLink.tag.name === '可回流') || lead.silentDays > 7
      );
    case 'negotiating':
      return leads.filter((lead) =>
        lead.lifecycleStatus === 'negotiating'
      );
    case 'signed':
      return leads.filter((lead) => lead.lifecycleStatus === 'signed');
    case 'active_7d': {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return leads.filter((lead) =>
        lead.lastInteractionAt && new Date(lead.lastInteractionAt) >= sevenDaysAgo
      );
    }
    case 'new_leads':
      return leads.filter((lead) => ['new', 'pool', 'qualified'].includes(lead.lifecycleStatus));
    default:
      return leads;
  }
}

// Mock 模式降级方案
function buildMockPlan(command) {
  // 多步 SOP Mock
  if (command.includes('SOP') || command.includes('sop') || command.includes('破冰') || command.includes('连续跟进')) {
    return {
      intent: '多步SOP编排：沉默线索重启培育',
      type: 'sop',
      filter: { description: '沉默超过7天的线索', criteria: 'silent' },
      sop_schedule: [
        {
          day_offset: 0,
          time: '10:00',
          title: '第1步：重新建立联系',
          action: { type: 'send_message' },
          content: '张总您好，之前您提到还在评估加盟模型，我们刚更新了一版同城门店经营数据，方便的话我发您参考。',
        },
        {
          day_offset: 2,
          time: '14:00',
          title: '第2步：输出经营信息',
          action: { type: 'send_message' },
          content: '我们把培训体系、供应链和开业支持拆成了清单版，如果您现在内部在做测算，我可以一并发给您。',
        },
        {
          day_offset: 4,
          time: '10:00',
          title: '第3步：推进考察',
          action: { type: 'send_message' },
          content: '本周总部有一场小范围考察日，如果您方便来一趟，我可以帮您预留接待名额并安排对接人。',
        },
      ],
      needApproval: false,
      summary: '已为沉默线索制定3步重启培育 SOP：重连→输出资料→推进总部考察。',
    };
  }

  if (command.includes('报价') || command.includes('政策') || command.includes('折扣')) {
    return {
      intent: '向高意向线索发起报价审批',
      type: 'single',
      filter: { description: '意向评分 ≥ 4.0 的高意向线索', criteria: 'intent_high' },
      action: { type: 'request_approval', title: '高意向线索报价审批', content: '该线索已进入报价窗口，建议提交加盟政策与报价审批，并同步安排招商主管一对一跟进。', needApproval: true },
      summary: '已筛选高意向线索，并生成报价审批任务。',
    };
  }
  if (command.includes('沉默') || command.includes('激活') || command.includes('唤醒')) {
    return {
      intent: '唤醒沉默线索',
      type: 'single',
      filter: { description: '沉默超过 7 天的线索', criteria: 'silent' },
      action: { type: 'send_message', title: '沉默线索重新触达', content: '您好，之前您提到还在评估加盟计划。我们本周更新了选址建议和加盟支持清单，如果您愿意，我可以发您做参考。', needApproval: false },
      summary: '已筛选沉默线索，并生成重新触达消息。',
    };
  }
  if (command.includes('签约') || command.includes('谈判')) {
    return {
      intent: '推进谈判中线索签约',
      type: 'single',
      filter: { description: '当前处于谈判中的线索', criteria: 'negotiating' },
      action: { type: 'send_message', title: '签约推进提醒', content: '您好，针对您关注的培训支持和开业节奏，我们已整理成签约前确认清单。如果方便，本周可以安排一次视频沟通逐项确认。', needApproval: false },
      summary: '已为谈判中线索生成签约推进动作。',
    };
  }
  return {
    intent: '通用招商指令',
    type: 'single',
    filter: { description: '全部线索', criteria: 'all' },
    action: { type: 'send_message', title: '批量招商跟进', content: '您好，我们近期更新了加盟支持政策和总部考察安排。如果您仍在评估开店计划，我可以按您的城市和预算为您匹配合适方案。', needApproval: false },
    summary: '已为全部线索生成基础跟进任务。',
  };
}
