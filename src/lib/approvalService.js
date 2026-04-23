import prisma from './prisma';
import { mockApprovals } from './franchiseData';
import { appendGovernanceAudit } from './governanceStore';
import { cancelWorkflowRun, continueWorkflowRun } from './workflowActions';

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeApproval(approval, overlay = null) {
  const metadata = overlay?.metadata ? parseJson(overlay.metadata, {}) : {};
  return {
    ...approval,
    status: metadata?.status || approval.status,
    decidedAt: metadata?.decidedAt || approval.decidedAt || null,
    selectedAlternative: metadata?.selectedAlternative || approval.selectedAlternative || '',
    decisionReason: metadata?.decisionReason || null,
    runRecoveryAction: metadata?.runRecoveryAction || null,
    thresholdValue: metadata?.thresholdValue || approval.thresholdValue || '',
    decisionMode: metadata?.decisionMode || null,
  };
}

function getTaskApprovalType(task) {
  const combined = `${task.title || ''} ${task.content || ''} ${task.triggerReason || ''}`.toLowerCase();
  if (/(手册|资料|附件|案例|roi|测算|pdf|招商包|外发)/i.test(combined) || ['image', 'video', 'combo', 'asset_bundle'].includes(task.taskType)) {
    return 'external_delivery';
  }
  if (/(预算|报价|返点|返现|返利|roi|回本|打款|费用|加盟费|保证金)/i.test(combined)) {
    return 'budget';
  }
  if (/(高频|触达|企微|电话|邮件)/i.test(combined)) {
    return 'outreach';
  }
  if (/(会议|邀约|考察|到会)/i.test(combined)) {
    return 'meeting';
  }
  return 'task';
}

function getTaskRiskLevel(task, approvalType) {
  const combined = `${task.title || ''} ${task.content || ''} ${task.reviewNotes || ''}`.toLowerCase();
  if (approvalType === 'budget' || /(报价|返点|返利|roi|加盟费|保证金|合同|独家|打款)/i.test(combined)) {
    return 'high';
  }
  if (approvalType === 'external_delivery' || approvalType === 'outreach') {
    return 'medium';
  }
  return 'low';
}

function buildTaskAlternatives(task, approvalType) {
  if (approvalType === 'external_delivery') {
    return ['仅发送公开版手册摘要', '先预约电话沟通，再外发完整版资料'];
  }
  if (approvalType === 'outreach') {
    return ['触达频次降为 2 次', '改为单渠道跟进'];
  }
  if (approvalType === 'budget') {
    return ['先使用公开政策版本', '缩小优惠与支持范围'];
  }
  if (task.taskType === 'request_approval') {
    return ['先走标准政策版本', '改为总部沟通后再提交审批'];
  }
  return [];
}

function buildTaskApproval(task) {
  const approvalType = getTaskApprovalType(task);
  const riskLevel = getTaskRiskLevel(task, approvalType);
  const createdAt = toIso(task.createdAt);
  const expiresAt = task.approvalStatus === 'pending'
    ? new Date(new Date(task.createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    id: task.id,
    type: approvalType,
    title: task.title || '招商任务审批',
    description: task.content || task.triggerReason || '待审批招商任务',
    sourceAgent: task.triggerSource === 'manual_command'
      ? 'AI Command Agent'
      : task.triggerSource === 'ai-sop'
        ? 'AI SOP Agent'
        : task.triggerSource === 'workflow'
          ? 'Workflow Agent'
          : 'Task Center',
    sourceSkillVersion: task.triggerSource === 'manual_command' ? 'franchise-command-v1' : 'franchise-workflow-v1',
    riskLevel,
    impact: `将影响线索「${task.customer?.name || '未知线索'}」的招商触达与执行排期`,
    recommendation: task.reviewNotes || (task.approvalStatus === 'pending'
      ? '建议人工复核后执行该招商动作。'
      : task.approvalStatus === 'approved'
        ? '已审批通过，可进入执行队列。'
        : '已驳回，请调整内容后重新提交。'),
    alternatives: buildTaskAlternatives(task, approvalType),
    status: task.approvalStatus,
    createdAt,
    expiresAt,
    runId: null,
    objectType: 'lead',
    objectName: task.customer?.name || '未知线索',
    decidedAt: task.approvalStatus === 'pending' ? null : toIso(task.updatedAt),
    selectedAlternative: '',
    decisionReason: task.rejectReason || null,
    thresholdValue: '',
    decisionMode: task.reviewedBy === 'human'
      ? (task.approvalStatus === 'approved' ? 'approve' : task.approvalStatus === 'rejected' ? 'reject' : null)
      : null,
    taskId: task.id,
    sourceRecordType: 'task',
  };
}

async function getApprovalOverlays() {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'approval',
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return logs.reduce((acc, log) => {
    if (!acc[log.entityId]) acc[log.entityId] = log;
    return acc;
  }, {});
}

async function listTaskBackedApprovals() {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { approvalStatus: 'pending' },
        { reviewedBy: 'human' },
        { rejectReason: { not: null } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { name: true },
      },
    },
  });

  return tasks.map(buildTaskApproval);
}

async function updateRelatedTasks(approval, nextStatus) {
  const tasks = await prisma.task.findMany({
    where: {
      approvalStatus: 'pending',
      OR: [
        { title: { contains: approval.objectName || approval.title } },
        { triggerReason: { contains: approval.objectName || approval.title } },
        { content: { contains: approval.objectName || approval.title } },
      ],
    },
    take: 10,
  });

  for (const task of tasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: nextStatus === 'approved'
        ? {
            approvalStatus: 'approved',
            executeStatus: task.executeStatus === 'draft' ? 'scheduled' : task.executeStatus,
            scheduledAt: task.scheduledAt || new Date(Date.now() + 60 * 1000),
          }
        : {
            approvalStatus: 'rejected',
            executeStatus: 'cancelled',
          },
    });
  }
}

async function persistApprovalDecision(approval, nextStatus, options = {}) {
  const {
    alternative = '',
    reason = '',
    thresholdValue = '',
    decisionMode = null,
  } = options;
  const decidedAt = new Date().toISOString();
  let runRecoveryAction = null;

  await updateRelatedTasks(approval, nextStatus);

  if (approval.runId) {
    if (nextStatus === 'approved') {
      await continueWorkflowRun(approval.runId);
      runRecoveryAction = 'continued';
    } else if (nextStatus === 'rejected') {
      await cancelWorkflowRun(approval.runId);
      runRecoveryAction = 'cancelled';
    }
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'approval',
      entityId: approval.id,
      action: nextStatus === 'approved' ? 'approve' : 'reject',
      operator: 'human',
      reason: reason || approval.recommendation || approval.description,
      metadata: JSON.stringify({
        status: nextStatus,
        decidedAt,
        selectedAlternative: alternative || '',
        decisionReason: reason || '',
        runRecoveryAction,
        thresholdValue: thresholdValue || '',
        decisionMode: decisionMode || null,
      }),
    },
  });
  await appendGovernanceAudit({
    scope: 'approval',
    entityType: 'approval',
    entityId: approval.id,
    action: nextStatus === 'approved' ? 'approve' : 'reject',
    operator: 'human',
    reason: reason || approval.recommendation || approval.description,
    metadata: {
      status: nextStatus,
      decidedAt,
      selectedAlternative: alternative || '',
      decisionReason: reason || '',
      runRecoveryAction,
      thresholdValue: thresholdValue || '',
      decisionMode: decisionMode || null,
    },
  });

  return { decidedAt, runRecoveryAction };
}

async function persistTaskApprovalDecision(task, nextStatus, options = {}) {
  const {
    alternative = '',
    reason = '',
    thresholdValue = '',
    decisionMode = null,
  } = options;
  const decidedAt = new Date().toISOString();
  const reviewNotes = [
    nextStatus === 'approved' ? '人工审批通过' : '人工审批驳回',
    alternative ? `替代方案：${alternative}` : '',
    thresholdValue ? `阈值调整：${thresholdValue}` : '',
    reason || '',
  ].filter(Boolean).join('；');

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: nextStatus === 'approved'
      ? {
          approvalStatus: 'approved',
          executeStatus: task.executeStatus === 'draft' ? 'scheduled' : task.executeStatus,
          scheduledAt: task.scheduledAt || new Date(Date.now() + 60 * 1000),
          reviewedBy: 'human',
          reviewNotes,
          rejectReason: null,
        }
      : {
          approvalStatus: 'rejected',
          executeStatus: 'cancelled',
          reviewedBy: 'human',
          reviewNotes,
          rejectReason: reason || '人工审批驳回',
        },
    include: {
      customer: {
        select: { name: true },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'approval',
      entityId: task.id,
      action: nextStatus === 'approved' ? 'approve' : 'reject',
      operator: 'human',
      reason: reason || updatedTask.title || updatedTask.content,
      metadata: JSON.stringify({
        status: nextStatus,
        decidedAt,
        selectedAlternative: alternative || '',
        decisionReason: reason || '',
        runRecoveryAction: null,
        thresholdValue: thresholdValue || '',
        decisionMode: decisionMode || (nextStatus === 'approved' ? 'approve' : 'reject'),
      }),
    },
  });
  await appendGovernanceAudit({
    scope: 'approval',
    entityType: 'approval',
    entityId: task.id,
    action: nextStatus === 'approved' ? 'approve' : 'reject',
    operator: 'human',
    reason: reason || updatedTask.title || updatedTask.content,
    metadata: {
      status: nextStatus,
      decidedAt,
      selectedAlternative: alternative || '',
      decisionReason: reason || '',
      runRecoveryAction: null,
      thresholdValue: thresholdValue || '',
      decisionMode: decisionMode || (nextStatus === 'approved' ? 'approve' : 'reject'),
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'task',
      entityId: task.id,
      action: nextStatus === 'approved' ? 'manual_approve' : 'manual_reject',
      operator: 'human',
      reason: reviewNotes,
      metadata: JSON.stringify({
        approvalStatus: nextStatus,
        selectedAlternative: alternative || '',
        thresholdValue: thresholdValue || '',
      }),
    },
  });

  return buildTaskApproval(updatedTask);
}

export async function listApprovals() {
  const [overlays, taskApprovals] = await Promise.all([
    getApprovalOverlays(),
    listTaskBackedApprovals(),
  ]);

  return [
    ...taskApprovals.map((approval) => normalizeApproval(approval, overlays[approval.id])),
    ...mockApprovals.map((approval) => normalizeApproval(approval, overlays[approval.id])),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function decideApproval(id, nextStatus, alternative = '', reason = '') {
  const approval = mockApprovals.find((item) => item.id === id);
  if (!approval) throw new Error('Approval not found');
  await persistApprovalDecision(approval, nextStatus, { alternative, reason });
  return listApprovals();
}

export async function handleApprovalAction(id, action, options = {}) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      customer: {
        select: { name: true },
      },
    },
  }).catch(() => null);

  if (task && (task.approvalStatus === 'pending' || task.reviewedBy === 'human' || task.rejectReason)) {
    if (action === 'approve') {
      await persistTaskApprovalDecision(task, 'approved', {
        alternative: options.selectedAlternative || '',
        reason: options.reason || '',
        decisionMode: options.selectedAlternative ? 'select_alternative' : 'approve',
      });
    } else if (action === 'reject') {
      await persistTaskApprovalDecision(task, 'rejected', {
        reason: options.reason || '',
        decisionMode: 'reject',
      });
    } else if (action === 'select_alternative') {
      await persistTaskApprovalDecision(task, 'approved', {
        alternative: options.selectedAlternative || '',
        reason: options.reason || `采用替代方案：${options.selectedAlternative || '自定义方案'}`,
        decisionMode: 'select_alternative',
      });
    } else if (action === 'change_threshold') {
      await persistTaskApprovalDecision(task, 'approved', {
        thresholdValue: options.thresholdValue || '',
        reason: options.reason || `调整审批阈值为：${options.thresholdValue || '自定义阈值'}`,
        decisionMode: 'change_threshold',
      });
    } else {
      throw new Error('Unsupported approval action');
    }

    return listApprovals();
  }

  const approval = mockApprovals.find((item) => item.id === id);
  if (!approval) throw new Error('Approval not found');

  if (action === 'approve') {
    await persistApprovalDecision(approval, 'approved', {
      alternative: options.selectedAlternative || '',
      reason: options.reason || '',
      decisionMode: options.selectedAlternative ? 'select_alternative' : 'approve',
    });
  } else if (action === 'reject') {
    await persistApprovalDecision(approval, 'rejected', {
      reason: options.reason || '',
      decisionMode: 'reject',
    });
  } else if (action === 'select_alternative') {
    await persistApprovalDecision(approval, 'approved', {
      alternative: options.selectedAlternative || '',
      reason: options.reason || `采用替代方案：${options.selectedAlternative || '自定义方案'}`,
      decisionMode: 'select_alternative',
    });
  } else if (action === 'change_threshold') {
    await persistApprovalDecision(approval, 'approved', {
      thresholdValue: options.thresholdValue || '',
      reason: options.reason || `调整审批阈值为：${options.thresholdValue || '自定义阈值'}`,
      decisionMode: 'change_threshold',
    });
  } else {
    throw new Error('Unsupported approval action');
  }

  return listApprovals();
}

export async function batchDecideApprovals(ids, nextStatus, reason = '') {
  const taskApprovals = await prisma.task.findMany({
    where: { id: { in: ids } },
    include: {
      customer: {
        select: { name: true },
      },
    },
  });

  for (const task of taskApprovals) {
    if (task.approvalStatus === 'pending') {
      await persistTaskApprovalDecision(task, nextStatus, { reason });
    }
  }

  const handledTaskIds = new Set(taskApprovals.map((task) => task.id));
  const approvals = mockApprovals.filter((item) => ids.includes(item.id) && !handledTaskIds.has(item.id));
  for (const approval of approvals) {
    if (approval.status === 'pending') {
      await persistApprovalDecision(approval, nextStatus, { reason });
    }
  }
  return listApprovals();
}
