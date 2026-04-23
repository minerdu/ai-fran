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

export async function listApprovals() {
  const overlays = await getApprovalOverlays();
  return mockApprovals.map((approval) => normalizeApproval(approval, overlays[approval.id]));
}

export async function decideApproval(id, nextStatus, alternative = '', reason = '') {
  const approval = mockApprovals.find((item) => item.id === id);
  if (!approval) throw new Error('Approval not found');
  await persistApprovalDecision(approval, nextStatus, { alternative, reason });
  return listApprovals();
}

export async function handleApprovalAction(id, action, options = {}) {
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
  const approvals = mockApprovals.filter((item) => ids.includes(item.id));
  for (const approval of approvals) {
    if (approval.status === 'pending') {
      await persistApprovalDecision(approval, nextStatus, { reason });
    }
  }
  return listApprovals();
}
