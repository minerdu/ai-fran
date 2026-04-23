import prisma from './prisma';
import {
  appendGovernanceAudit,
  getOptimizationSuggestionById,
  updateOptimizationSuggestionRecord,
} from './governanceStore';

async function getFallbackLeadId() {
  const lead = await prisma.customer.findFirst({
    where: {
      lifecycleStatus: {
        in: ['new', 'pool', 'qualified', 'negotiating', 'signed'],
      },
    },
    orderBy: [
      { intentScore: 'desc' },
      { updatedAt: 'desc' },
    ],
    select: { id: true, name: true },
  });

  return lead || null;
}

async function writeOptimizationAudit(entityId, action, reason, metadata) {
  await prisma.auditLog.create({
    data: {
      entityType: 'optimization_suggestion',
      entityId,
      action,
      operator: 'human',
      reason: reason || null,
      metadata: JSON.stringify(metadata || {}),
    },
  });
  await appendGovernanceAudit({
    scope: 'optimization',
    entityType: 'optimization_suggestion',
    entityId,
    action,
    operator: 'human',
    reason: reason || null,
    metadata: metadata || {},
  });
}

function getSuggestionBlueprint(id) {
  const blueprints = {
    opt_1: {
      title: '优化建议执行 - 批量处理报价审批断点',
      taskType: 'request_approval',
      triggerSource: 'manual_command',
      triggerReason: 'AI 优化建议触发批量审批清理',
      content: '根据优化建议优先处理政策、资料外发和报价相关审批，解除签约推进阻塞。',
      approvalStatus: 'pending',
      executeStatus: 'draft',
      href: '/approvals',
    },
    opt_2: {
      title: '优化建议执行 - 放大高 ROI 线索来源',
      taskType: 'content_publish',
      triggerSource: 'workflow',
      triggerReason: 'AI 优化建议触发来源扩量计划',
      content: '围绕高 ROI 来源输出下一轮招商方案、案例投放素材和会务引流节奏。',
      approvalStatus: 'approved',
      executeStatus: 'scheduled',
      scheduleOffsetMs: 5 * 60 * 1000,
      href: '/ai/playbooks',
    },
    opt_3: {
      title: '优化建议执行 - 修复关键阶段流失',
      taskType: 'follow_up',
      triggerSource: 'workflow',
      triggerReason: 'AI 优化建议触发中段漏斗修复',
      content: '针对总部考察、报价审批等关键阶段补齐标准话术、提醒节奏与跟进动作。',
      approvalStatus: 'approved',
      executeStatus: 'scheduled',
      scheduleOffsetMs: 10 * 60 * 1000,
      href: '/workflow',
    },
    opt_4: {
      title: '优化建议执行 - 强化沉默激活内容包',
      taskType: 'asset_bundle',
      triggerSource: 'manual_command',
      triggerReason: 'AI 优化建议触发沉默激活内容生产',
      content: '生成同城案例、ROI 测算和总部赋能组合内容包，并同步到 Skill 中心与外发模版。',
      approvalStatus: 'approved',
      executeStatus: 'scheduled',
      scheduleOffsetMs: 15 * 60 * 1000,
      href: '/me',
    },
  };

  return blueprints[id] || null;
}

export async function updateOptimizationSuggestionState(id, action, reason) {
  const existingRecord = await getOptimizationSuggestionById(id);
  if (!existingRecord) {
    throw new Error('Optimization suggestion not found');
  }

  if (action !== 'launch') {
    const next = await updateOptimizationSuggestionRecord(id, { status: action, reason });
    await writeOptimizationAudit(id, action, reason, { action, status: next.status });
    return next;
  }

  if (existingRecord.status === 'launch' && existingRecord.launchTaskTitle) {
    return existingRecord;
  }

  const blueprint = getSuggestionBlueprint(id);
  if (!blueprint) {
    const next = await updateOptimizationSuggestionRecord(id, { status: action, reason });
    await writeOptimizationAudit(id, action, reason, { action, status: next.status });
    return next;
  }

  const lead = await getFallbackLeadId();
  let createdTask = null;

  if (lead) {
    createdTask = await prisma.task.create({
      data: {
        customerId: lead.id,
        title: blueprint.title,
        taskType: blueprint.taskType,
        content: blueprint.content,
        triggerSource: blueprint.triggerSource,
        triggerReason: blueprint.triggerReason,
        approvalStatus: blueprint.approvalStatus,
        executeStatus: blueprint.executeStatus,
        ...(blueprint.scheduleOffsetMs
          ? { scheduledAt: new Date(Date.now() + blueprint.scheduleOffsetMs) }
          : {}),
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  const next = await updateOptimizationSuggestionRecord(id, {
    status: action,
    reason,
    launchTaskId: createdTask?.id || null,
    launchTaskTitle: createdTask?.title || blueprint.title,
    launchHref: blueprint.href,
  });
  await writeOptimizationAudit(id, action, reason, {
    action,
    href: blueprint.href,
    taskId: createdTask?.id || null,
    taskTitle: createdTask?.title || blueprint.title,
    status: next.status,
  });
  return next;
}
