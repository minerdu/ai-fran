import { PrismaClient } from '@prisma/client';
import { enqueue, cancel, hasQueuedMessages } from './message-queue';

const prisma = new PrismaClient();

/**
 * 从数据库加载 AI 模型配置
 */
async function loadAiConfig() {
  try {
    const config = await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
    return config;
  } catch (e) {
    console.error('[AI-Service] Failed to load AI config:', e);
    return null;
  }
}

/**
 * 构建系统提示词：融合 Persona 设定 + 线索 CRM 上下文
 * 新增：要求 LLM 返回结构化 JSON 格式
 */
async function buildSystemPrompt(leadId, configSystemPrompt) {
  // 1. 加载 Persona 设定
  let personaContext = '';
  try {
    const persona = await prisma.personaSetting.findFirst();
    if (persona) {
      personaContext = [
        persona.companyName ? `你所服务的公司：${persona.companyName}` : '',
        persona.roleDefinition ? `你的角色定位：${persona.roleDefinition}` : '',
        persona.taskWorkflow ? `你的工作流程：${persona.taskWorkflow}` : '',
        persona.edgeCases ? `特殊情况处理规则：${persona.edgeCases}` : '',
        persona.formatRules ? `输出格式规范：${persona.formatRules}` : '',
      ].filter(Boolean).join('\n');
    }
  } catch (e) { /* 静默处理 */ }

  // 2. 加载线索 CRM 信息
  let leadContext = '';
  if (leadId) {
    try {
      const lead = await prisma.customer.findUnique({
        where: { id: leadId },
        include: { tags: { include: { tag: true } } }
      });
      if (lead) {
        const tagNames = lead.tags?.map((tagLink) => tagLink.tag.name).join('、') || '无';
        let crmInfo = '无招商记录';
        if (lead.crmHistory) {
          try {
            const records = JSON.parse(lead.crmHistory);
            crmInfo = records.map((record) => `${record.date} ${record.product || record.action || '动作'} (${record.amount ? `¥${record.amount}` : '待确认'})`).join('；');
          } catch (e) { /* ignore */ }
        }
        leadContext = [
          `当前对话线索：${lead.name}`,
          `线索标签：${tagNames}`,
          `招商意向评分：${lead.intentScore}/5`,
          `代理价值评分：${lead.valueScore}/5`,
          `AI摘要：${lead.aiSummary || '暂无'}`,
          `历史招商记录：${crmInfo}`,
        ].join('\n');
      }
    } catch (e) { /* 静默处理 */ }
  }

  // 3. 组合最终系统提示词（结构化 JSON 输出要求）
  const defaultSystem = `你是品牌总部的 AI 招商顾问，服务对象是加盟代理商负责人这类 B 端线索。你的职责是完成线索建档、识别资质、推进考察、发送合适资料、辅助报价与签约推进。
你必须保持专业、可信、简洁，不得使用 C 端客服、门店消费、项目体验、术后关怀、美容顾问之类的话术。
遇到涉及加盟费折扣、返利、独家代理、合同条款、打款、退款、收益承诺、区域保护等敏感话题时，礼貌告知线索“该事项需要总部审批或招商主管确认”，不要擅自承诺。

【重要】你必须严格按照以下 JSON 格式返回结果（不要返回任何其他内容，只返回纯JSON）：
{
  "messages": [
    {"text": "第一段消息内容（专业自然，不超过50字）", "delay_ms": 1200},
    {"text": "第二段消息内容", "delay_ms": 2000}
  ],
  "intent_tags": ["用于标记线索意图的标签"],
  "suggested_actions": ["推荐的招商动作"],
  "financial_sensitive": false
}

规则：
1. messages 数组通常1-3条消息，模拟真人分段发送
2. 每条消息不超过50字，除非线索明确要求详细解释
3. delay_ms 表示该条消息发送前的等待时间（毫秒），根据文字量自然推算
4. 如果检测到财务敏感话题，设 financial_sensitive 为 true
5. intent_tags 和 suggested_actions 是你的分析判断，不需要发给线索
6. 优先采集城市、预算、行业经验、开店时间、决策角色；优先推进建档、邀约考察、资料外发、审批和签约动作`;

  const parts = [
    configSystemPrompt || defaultSystem,
    personaContext ? `\n--- 企业人设信息 ---\n${personaContext}` : '',
    leadContext ? `\n--- 当前线索画像 ---\n${leadContext}` : '',
  ];

  return parts.filter(Boolean).join('\n');
}

/**
 * 加载该会话的历史消息，用作 LLM 上下文
 */
async function loadConversationHistory(conversationId, maxMessages = 20) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: maxMessages,
    });
    return messages.map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));
  } catch (e) {
    return [];
  }
}

/**
 * 调用真实 LLM API（自动兼容 Azure OpenAI 和标准 OpenAI 格式）
 */
async function callLLM(config, systemPrompt, conversationHistory, userMessage) {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  // 检测是否为 Azure OpenAI（URL 中包含 .openai.azure.com）
  const isAzure = baseUrl.includes('.openai.azure.com');

  let url, headers;
  if (isAzure) {
    // Azure OpenAI 格式:
    // POST {endpoint}/openai/deployments/{deployment-name}/chat/completions?api-version=2024-08-01-preview
    const apiVersion = '2024-08-01-preview';
    url = `${baseUrl}/openai/deployments/${config.modelName}/chat/completions?api-version=${apiVersion}`;
    headers = {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    };
  } else {
    // 标准 OpenAI 兼容格式
    url = `${baseUrl}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  const body = {
    messages,
    temperature: config.temperature ?? 0.7,
  };
  // Azure 新版模型用 max_completion_tokens，标准用 max_tokens
  if (isAzure) {
    body.max_completion_tokens = config.maxTokens ?? 800;
  } else {
    body.max_tokens = config.maxTokens ?? 800;
    body.model = config.modelName;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error (${res.status}): ${errText.substring(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '抱歉，AI暂时无法生成回复。';
}

/**
 * 解析 LLM 返回的结构化 JSON
 * 兼容 LLM 可能在 JSON 前后包裹 markdown 代码块的情况
 */
function parseLLMStructuredResponse(rawResponse) {
  try {
    // 尝试直接解析
    return JSON.parse(rawResponse);
  } catch (e) {
    // 尝试提取 JSON 块
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        // 解析失败
      }
    }
  }

  // 降级：将整条文本作为单条消息
  return {
    messages: [{ text: rawResponse, delay_ms: 0 }],
    intent_tags: [],
    suggested_actions: [],
    financial_sensitive: false,
  };
}

/**
 * Mock 回复（未接入 AI 时的降级方案）— 招商结构化格式
 */
function getMockReply(content) {
  if (content.includes('考察') || content.includes('到总部') || content.includes('约时间')) {
    return {
      messages: [
        { text: '我先帮您看总部考察档期', delay_ms: 800 },
        { text: '明天下午和后天上午都还有接待名额', delay_ms: 1300 },
        { text: '您确认时间后，我来为您发考察安排单', delay_ms: 1200 },
      ],
      intent_tags: ['考察意向'],
      suggested_actions: ['创建考察跟进'],
      financial_sensitive: false,
    };
  }
  if (content.includes('加盟费') || content.includes('多少钱') || content.includes('折扣') || content.includes('返利')) {
    return {
      messages: [
        { text: '这类政策和价格问题需要总部确认', delay_ms: 1100 },
        { text: '我先帮您提交审批，并安排招商主管跟进', delay_ms: 1200 },
      ],
      intent_tags: ['政策咨询'],
      suggested_actions: ['提交审批', '转招商主管'],
      financial_sensitive: true,
    };
  }
  if (content.includes('培训') || content.includes('支持') || content.includes('赋能')) {
    return {
      messages: [
        { text: '总部支持会分成培训、开业、供应链和运营四块', delay_ms: 900 },
        { text: '如果您方便，我可以先发培训体系和开业清单给您', delay_ms: 1400 },
      ],
      intent_tags: ['培训咨询', '高意向'],
      suggested_actions: ['发送资料包'],
      financial_sensitive: false,
    };
  }
  return {
    messages: [
      { text: '收到，我先为您整理适合的招商信息', delay_ms: 800 },
      { text: '也欢迎告诉我所在城市、预算和行业背景，我好给您匹配方案', delay_ms: 1400 },
    ],
    intent_tags: [],
    suggested_actions: [],
    financial_sensitive: false,
  };
}

/**
 * 核心入口：处理线索发来的消息，自动生成 AI 回复
 *
 * 增强版：支持多消息分段 + 延迟发送 + 智能跳过
 */
export async function handleIncomingMessage(conversationId, incomingContent, leadId) {
  try {
    console.log(`[AI-Service] Processing inbound message on conv ${conversationId}: "${incomingContent}"`);

    // 智能跳过：如果有正在排队的消息，取消旧队列
    if (hasQueuedMessages(conversationId)) {
      console.log(`[AI-Service] New message received — cancelling queued messages for conv ${conversationId}`);
      cancel(conversationId);
    }

    const config = await loadAiConfig();
    let structured;

    if (config && config.enabled && config.apiKey && config.apiBaseUrl) {
      // --- 真实 LLM 调用 ---
      console.log(`[AI-Service] Using real LLM: ${config.provider} / ${config.modelName}`);
      const systemPrompt = await buildSystemPrompt(leadId, config.systemPrompt);
      const history = await loadConversationHistory(conversationId);
      const rawResponse = await callLLM(config, systemPrompt, history, incomingContent);
      structured = parseLLMStructuredResponse(rawResponse);
    } else {
      // --- Mock 降级 ---
      console.log('[AI-Service] AI model not configured, using mock reply.');
      await new Promise(resolve => setTimeout(resolve, 500));
      structured = getMockReply(incomingContent);
    }

    // 检测审批敏感词 -> 生成审批任务而非直接回复
    const financialKeywords = ['退款', '退钱', '赔偿', '报价', '打折', '加盟费', '返利', '独家', '代理权', '合同', '打款'];
    const isFinancial = structured.financial_sensitive ||
      financialKeywords.some(kw => incomingContent.includes(kw));

    if (isFinancial) {
      const allMessagesText = structured.messages.map(m => m.text).join('\n');
      await prisma.task.create({
        data: {
          // Prisma schema still uses task.customerId to point at the lead record.
          customerId: leadId,
          title: '招商敏感事项拦截：需人工审批',
          taskType: 'text',
          content: `线索消息: "${incomingContent}"\n\nAI 拟回复:\n${allMessagesText}\n\n涉及价格、合同、返利或代理政策等敏感事项，已拦截自动发送，请人工审批后再执行。`,
          triggerSource: 'ai',
          triggerReason: '招商敏感词自动拦截',
          approvalStatus: 'pending',
          executeStatus: 'draft',
          reviewedBy: 'ai',
          reviewNotes: 'AI 检测到招商敏感内容，自动路由人工审批',
        }
      });

      // 给线索一个通用安抚回复（不走队列，直接发）
      await prisma.message.create({
        data: {
          conversationId,
          direction: 'outbound',
          senderType: 'ai',
          contentType: 'text',
          content: '您提到的事项需要总部进一步确认，我已转交招商主管处理，会尽快给您回复。',
        }
      });
      console.log('[AI-Service] Sensitive franchise keyword detected. Task created for approval.');
      return;
    }

    // 多消息分段发送：通过消息队列逐条延迟发送
    const messages = structured.messages || [{ text: '收到您的消息了～', delay_ms: 0 }];

    if (messages.length === 1) {
      // 只有一条消息，直接保存不走队列
      await prisma.message.create({
        data: {
          conversationId,
          direction: 'outbound',
          senderType: 'ai',
          contentType: 'text',
          content: messages[0].text,
        }
      });
      console.log(`[AI-Service] Single reply saved: "${messages[0].text.substring(0, 50)}..."`);
    } else {
      // 多条消息走队列
      await enqueue(conversationId, messages, async (convId, text, index) => {
        await prisma.message.create({
          data: {
            conversationId: convId,
            direction: 'outbound',
            senderType: 'ai',
            contentType: 'text',
            content: text,
          }
        });
      });
    }

    // ===== AI 洞察回写 =====
    // 将 LLM 返回的 intent_tags 和 suggested_actions 写入数据库
    if (leadId) {
      try {
        await applyAiInsights(leadId, structured);
      } catch (insightErr) {
        console.warn('[AI-Service] Failed to apply AI insights:', insightErr.message);
      }
    }

  } catch (error) {
    console.error('[AI-Service] Error processing inbound message:', error);
  }
}

/**
 * 将 AI 分析结果（意图标签 + 建议动作）回写到数据库
 *
 * - 自动查找或创建 Tag 记录
 * - 关联到 Customer (CustomerTag)
 * - 根据招商信号动态调整 intentScore
 * - 更新线索的互动时间和沉默天数
 */
async function applyAiInsights(leadId, structured) {
  const intentTags = structured.intent_tags || [];
  const suggestedActions = structured.suggested_actions || [];

  // 1. 回写意图标签
  for (const tagName of intentTags) {
    if (!tagName || tagName.length > 50) continue;

    try {
      // 查找或创建 Tag
      let tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            category: 'intent',
            color: '#1890ff',
          },
        });
        console.log(`[AI-Service] Created new tag: "${tagName}"`);
      }

      // 关联到线索（忽略已存在的）
      await prisma.customerTag.upsert({
        where: {
          customerId_tagId: { customerId: leadId, tagId: tag.id },
        },
        create: {
          customerId: leadId,
          tagId: tag.id,
          addedBy: 'ai',
        },
        update: {}, // 已存在则不变
      });
    } catch (tagErr) {
      // 静默处理单个标签的写入失败
      console.warn(`[AI-Service] Failed to upsert tag "${tagName}":`, tagErr.message);
    }
  }

  // 2. 根据意图标签动态调整 intentScore
  const highIntentSignals = ['高意向', '考察意向', '签约意向', '高预算', '已要合同'];
  const mediumIntentSignals = ['培训咨询', '政策咨询', '资料申请', '选址咨询', '供应链咨询'];

  const hasHighIntent = intentTags.some(t => highIntentSignals.includes(t));
  const hasMediumIntent = intentTags.some(t => mediumIntentSignals.includes(t));

  const updateData = {
    silentDays: 0,
    lastInteractionAt: new Date(),
  };

  if (hasHighIntent) {
    // 高意向：提升到 4.0-4.5 之间（不覆盖已有的更高分）
    updateData.intentScore = { set: undefined }; // 需要条件更新
  }

  // 3. 更新线索记录
  const lead = await prisma.customer.findUnique({
    where: { id: leadId },
    select: { intentScore: true },
  });

  if (lead) {
    if (hasHighIntent && lead.intentScore < 4.0) {
      updateData.intentScore = Math.min(4.5, lead.intentScore + 1.0);
    } else if (hasMediumIntent && lead.intentScore < 3.5) {
      updateData.intentScore = Math.min(3.5, lead.intentScore + 0.5);
    }

    // 移除无效的 set 包装
    if (updateData.intentScore && typeof updateData.intentScore === 'object') {
      delete updateData.intentScore;
    }

    await prisma.customer.update({
      where: { id: leadId },
      data: updateData,
    });

    if (intentTags.length > 0) {
      console.log(`[AI-Service] Lead ${leadId} insights applied: tags=[${intentTags.join(',')}], score adjustment=${hasHighIntent ? '+1.0' : hasMediumIntent ? '+0.5' : 'none'}`);
    }
  }

  // 4. 将 suggested_actions 记录到审计日志（供前端展示推荐）
  if (suggestedActions.length > 0) {
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'customer',
          entityId: leadId,
          action: 'ai_suggestion',
          operator: 'ai',
          reason: `AI建议动作: ${suggestedActions.join('、')}`,
          metadata: JSON.stringify({ intentTags, suggestedActions }),
        },
      });
    } catch (logErr) {
      // 非关键路径，静默处理
    }
  }
}
