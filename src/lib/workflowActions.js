import prisma from './prisma';
import { createDeliveryJob } from './executionOpsService';
import { mockApprovals } from './franchiseData';
import {
  phase2Events,
  phase2Playbooks,
  phase2ReferralPrograms,
} from './phase2WorkflowData';

function formatShortDateToken(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function buildArtifactRef(prefix, entityId, value, index = 1) {
  const idToken = String(entityId).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000';
  return `${prefix}-${formatShortDateToken(value)}-${idToken}-${String(index).padStart(2, '0')}`;
}

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
    select: { id: true },
  });

  return lead?.id || null;
}

async function writeAuditLog(entityType, entityId, action, reason, metadata) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      operator: 'human',
      reason,
      metadata: JSON.stringify(metadata || {}),
    },
  });
}

async function getPlaybookVersionNumber(playbookId) {
  const total = await prisma.auditLog.count({
    where: {
      entityType: 'workflow_playbook',
      entityId: playbookId,
      action: 'publish_version',
    },
  });

  return total + 1;
}

async function getLeadById(leadId) {
  if (!leadId) return null;

  return prisma.customer.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      lifecycleStatus: true,
      source: true,
    },
  });
}

async function hasWorkflowAudit(entityType, entityId, action, leadId) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      entityType,
      entityId,
      action,
      ...(leadId
        ? {
            metadata: {
              contains: leadId,
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function submitPlaybookApproval(playbookId) {
  const playbook = phase2Playbooks.find((item) => item.id === playbookId);
  if (!playbook) throw new Error('Playbook not found');

  const leadId = await getFallbackLeadId();
  if (leadId) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `Playbook 发布审批 - ${playbook.title}`,
        taskType: 'request_approval',
        content: `为 ${playbook.title} 提交总部审批。策略模式：${playbook.mode}，预算 ${playbook.budget}，预测 ROI ${playbook.predictedROI}。`,
        triggerSource: 'workflow',
        triggerReason: 'Phase 2 Playbook Studio 手动发起审批发布',
        approvalStatus: 'pending',
        executeStatus: 'draft',
      },
    });
  }

  await writeAuditLog('workflow_playbook', playbookId, 'submit_approval', '提交 Playbook 审批', {
    status: 'pending_approval',
    mode: playbook.mode,
  });
}

export async function launchPlaybook(playbookId) {
  const playbook = phase2Playbooks.find((item) => item.id === playbookId);
  if (!playbook) throw new Error('Playbook not found');

  const leadId = await getFallbackLeadId();
  if (leadId) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `Playbook 自动执行 - ${playbook.title}`,
        taskType: 'text',
        content: `按 ${playbook.mode} 方案启动自动执行，覆盖素材生成、邀约序列、会务推进和裂变规则联动。`,
        triggerSource: 'workflow',
        triggerReason: 'Phase 2 Playbook Studio 发起自动执行',
        approvalStatus: 'approved',
        executeStatus: 'scheduled',
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  }

  await writeAuditLog('workflow_playbook', playbookId, 'launch', '启动 Playbook 自动执行', {
    status: 'active',
    mode: playbook.mode,
  });
}

export async function approveLaunchPlaybook(playbookId) {
  const playbook = phase2Playbooks.find((item) => item.id === playbookId);
  if (!playbook) throw new Error('Playbook not found');
  const linkedApproval = mockApprovals.find((item) => item.objectType === 'playbook');

  await writeAuditLog('approval', linkedApproval?.id || 'appr_playbook_auto', 'approve', '方案详情一键审批并发布', {
    status: 'approved',
    decidedAt: new Date().toISOString(),
    decisionReason: `${playbook.title} 已通过审批并进入发布执行`,
    runRecoveryAction: 'continued',
  });

  await publishPlaybookVersion(playbookId);
  await launchPlaybook(playbookId);
  if (linkedApproval?.runId) {
    await continueWorkflowRun(linkedApproval.runId);
  }

  return {
    playbookId,
    action: 'approve_launch',
  };
}

export async function publishPlaybookVersion(playbookId) {
  const playbook = phase2Playbooks.find((item) => item.id === playbookId);
  if (!playbook) throw new Error('Playbook not found');

  const generatedAt = new Date();
  const versionNumber = await getPlaybookVersionNumber(playbookId);
  const versionTag = `V${String(versionNumber).padStart(2, '0')}`;
  const releaseRef = buildArtifactRef('PB', playbookId, generatedAt, versionNumber);
  const packageItems = [
    ...playbook.assetBundle.slice(0, 3),
    playbook.meetingStrategy,
    playbook.fissionStrategy,
  ];
  const manifestSummary = [
    `政策建议：${playbook.policyRecommendation}`,
    `会务链路：${playbook.meetingStrategy}`,
    `裂变联动：${playbook.fissionStrategy}`,
  ];
  const leadId = await getFallbackLeadId();

  if (leadId) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `Playbook 版本发布 - ${playbook.title} ${versionTag} ${releaseRef}`,
        taskType: 'content_publish',
        content: `发布 ${playbook.title} ${versionTag}。同步输出政策摘要、会务序列、裂变规则和招商素材包。`,
        triggerSource: 'workflow',
        triggerReason: 'Phase 2 Playbook Studio 生成发布版本',
        approvalStatus: 'approved',
        executeStatus: 'success',
      },
    });
  }

  await writeAuditLog('workflow_playbook', playbookId, 'publish_version', `发布 ${playbook.title} ${versionTag}`, {
    status: 'published',
    versionTag,
    releaseRef,
    budget: playbook.budget,
    predictedROI: playbook.predictedROI,
    predictedContractRate: playbook.predictedContractRate,
    packageItems,
    manifestSummary,
  });
}

export async function launchEventSequence(eventId) {
  const event = phase2Events.find((item) => item.id === eventId);
  if (!event) throw new Error('Event not found');

  const batchRef = buildArtifactRef('EV', eventId, new Date(), 1);
  const relatedLeadIds = event.relatedLeads?.length
    ? event.relatedLeads
    : [(await getFallbackLeadId())].filter(Boolean);

  for (const leadId of relatedLeadIds) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `${event.title} 邀约序列启动`,
        taskType: 'invite_event',
        content: `启动 ${event.title} 的邀约、会前提醒、签到提醒和会后催签序列。`,
        triggerSource: 'workflow',
        triggerReason: `会务中心手动启动 ${event.title} 序列`,
        approvalStatus: 'approved',
        executeStatus: 'scheduled',
        scheduledAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });
  }

  await writeAuditLog('workflow_event', eventId, 'launch_sequence', '启动会务自动序列', {
    status: 'active',
    sequenceState: 'running',
    batchRef,
    nextFollowup: '继续跟进报名线索并推动签到提醒',
  });
}

export async function triggerEventPostFollowup(eventId) {
  const event = phase2Events.find((item) => item.id === eventId);
  if (!event) throw new Error('Event not found');

  const batchRef = buildArtifactRef('EV', eventId, new Date(), 1);
  const relatedLeadIds = event.relatedLeads?.length
    ? event.relatedLeads
    : [(await getFallbackLeadId())].filter(Boolean);

  for (const leadId of relatedLeadIds) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `${event.title} 会后催签`,
        taskType: 'text',
        content: `针对 ${event.title} 到场线索触发会后催签动作，输出资料包、报价说明和视频沟通安排。`,
        triggerSource: 'workflow',
        triggerReason: `会务中心手动触发 ${event.title} 会后催签`,
        approvalStatus: 'pending',
        executeStatus: 'draft',
      },
    });
  }

  await writeAuditLog('workflow_event', eventId, 'post_followup', '触发会后催签序列', {
    status: 'upcoming',
    sequenceState: 'post_followup',
    batchRef,
    nextFollowup: '推进会后催签、报价沟通和签约跟进',
  });
}

export async function checkInEventLead(eventId, leadId) {
  const event = phase2Events.find((item) => item.id === eventId);
  if (!event) throw new Error('Event not found');

  const lead = await getLeadById(leadId);
  if (!lead) throw new Error('Lead not found');

  if (event.relatedLeads?.length && !event.relatedLeads.includes(leadId)) {
    throw new Error('Lead is not in the event roster');
  }

  const alreadyCheckedIn = await hasWorkflowAudit('workflow_event', eventId, 'check_in', leadId);
  if (alreadyCheckedIn) return;

  const batchRef = buildArtifactRef('EV', eventId, new Date(), 1);

  await prisma.task.create({
    data: {
      customerId: lead.id,
      title: `${event.title} 会后 1v1 跟进 - ${lead.name} ${batchRef}`,
      taskType: 'follow_up',
      content: `已在会务中心登记 ${lead.name} 完成 ${event.title} 签到，自动生成会后 1v1 跟进、资料补发和签约推进任务。`,
      triggerSource: 'workflow',
      triggerReason: `${event.title} 签到后自动生成会后跟进`,
      approvalStatus: 'approved',
      executeStatus: 'scheduled',
      scheduledAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  await writeAuditLog('workflow_event', eventId, 'check_in', `标记 ${lead.name} 已签到`, {
    status: 'active',
    sequenceState: 'checked_in',
    batchRef,
    leadId: lead.id,
    leadName: lead.name,
    leadSource: lead.source,
    nextFollowup: '已签到线索进入会后 1v1 跟进与签约推进',
  });
}

export async function submitReferralApproval(programId) {
  const program = phase2ReferralPrograms.find((item) => item.id === programId);
  if (!program) throw new Error('Referral program not found');

  const leadId = await getFallbackLeadId();
  if (leadId) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `裂变规则审批 - ${program.name}`,
        taskType: 'request_approval',
        content: `提交 ${program.name} 审批。模板 ${program.template}，奖励 ${program.reward}，区域 ${program.region}。`,
        triggerSource: 'workflow',
        triggerReason: 'Referral Center 手动提交审批',
        approvalStatus: 'pending',
        executeStatus: 'draft',
      },
    });
  }

  await writeAuditLog('workflow_referral', programId, 'submit_approval', '提交裂变规则审批', {
    status: 'pending_approval',
  });
}

export async function publishReferralProgram(programId) {
  const program = phase2ReferralPrograms.find((item) => item.id === programId);
  if (!program) throw new Error('Referral program not found');

  const leadId = await getFallbackLeadId();
  if (leadId) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `裂变规则发布 - ${program.name}`,
        taskType: 'text',
        content: `发布 ${program.name}，同步生成招募物料、短链二维码和结算说明。`,
        triggerSource: 'workflow',
        triggerReason: 'Referral Center 手动发布规则',
        approvalStatus: 'approved',
        executeStatus: 'scheduled',
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  }

  await writeAuditLog('workflow_referral', programId, 'publish', '发布裂变规则', {
    status: 'active',
  });
}

export async function generateReferralAssets(programId) {
  const program = phase2ReferralPrograms.find((item) => item.id === programId);
  if (!program) throw new Error('Referral program not found');

  const assetRef = buildArtifactRef('RA', programId, new Date(), 1);
  const deliveryJob = await createDeliveryJob({
    entityType: 'workflow_referral',
    entityId: programId,
    jobType: 'generate_assets',
    status: 'success',
    artifactRef: assetRef,
    payload: {
      programName: program.name,
      assets: program.assets,
    },
  });

  const leadId = await getFallbackLeadId();
  if (leadId) {
    await prisma.task.create({
      data: {
        customerId: leadId,
        title: `裂变素材生成 - ${program.name} ${assetRef}`,
        taskType: 'asset_bundle',
        content: `为 ${program.name} 生成招募海报、二维码、FAQ 和结算说明，生成批次 ${assetRef}。`,
        triggerSource: 'workflow',
        triggerReason: 'Referral Center 生成裂变物料',
        approvalStatus: 'approved',
        executeStatus: 'success',
      },
    });
  }

  await writeAuditLog('workflow_referral', programId, 'generate_assets', '生成裂变素材包', {
    status: 'active',
    assetRef,
    deliveryJobId: deliveryJob.id,
  });

  return { assetRef, deliveryJobId: deliveryJob.id };
}

export async function settleReferralReward(programId, leadId) {
  const program = phase2ReferralPrograms.find((item) => item.id === programId);
  if (!program) throw new Error('Referral program not found');

  const lead = await getLeadById(leadId);
  if (!lead) throw new Error('Lead not found');

  const alreadySettled = await hasWorkflowAudit('workflow_referral', programId, 'settle_reward', leadId);
  if (alreadySettled) return;

  const settlementRef = buildArtifactRef('RF', `${programId}${leadId}`, new Date(), 1);
  const payoutStage = '总部财务已完成结算';

  await prisma.task.create({
    data: {
      customerId: lead.id,
      title: `裂变奖励结算 - ${lead.name} ${settlementRef}`,
      taskType: 'finance_settlement',
      content: `为 ${lead.name} 结算 ${program.name} 奖励，规则为 ${program.reward}。当前线索阶段：${lead.lifecycleStatus}。`,
      triggerSource: 'workflow',
      triggerReason: `${program.name} 奖励结算确认`,
      approvalStatus: 'approved',
      executeStatus: 'success',
    },
  });

  await writeAuditLog('workflow_referral', programId, 'settle_reward', `结算 ${lead.name} 的裂变奖励`, {
    status: 'active',
    leadId: lead.id,
    leadName: lead.name,
    reward: program.reward,
    settlementRef,
    payoutStage,
  });
}

export async function continueWorkflowRun(runId) {
  await writeAuditLog('workflow_run', runId, 'continue', '继续执行运行组', {
    status: 'running',
    currentStep: '继续执行',
    recommendedAction: '观察执行结果与队列反馈',
  });
}

export async function retryWorkflowRun(runId) {
  await writeAuditLog('workflow_run', runId, 'retry', '重试当前运行组', {
    status: 'running',
    currentStep: '重试节点中',
    recommendedAction: '检查重试结果并确认是否解除阻塞',
  });
}

export async function cancelWorkflowRun(runId) {
  await writeAuditLog('workflow_run', runId, 'cancel', '取消当前运行组', {
    status: 'cancelled',
    currentStep: '人工取消',
    recommendedAction: '如需恢复，请重新下发工作流或重试节点',
  });
}

export async function overrideInviteStatus(inviteId, status, metadata = {}) {
  const event = phase2Events.find((item) => item.id === inviteId);
  if (!event) throw new Error('Invite / Event not found');

  const sequenceState = status === 'dialing'
    ? 'dialing'
    : status === 'completed'
      ? 'completed'
      : status === 'paused'
        ? 'paused'
        : 'manual_override';

  await writeAuditLog('workflow_event', inviteId, 'override_status', '人工覆盖邀约状态', {
    status: status === 'completed' ? 'active' : event.status,
    sequenceState,
    overrideStatus: status,
    leadId: metadata.leadId || null,
    note: metadata.note || null,
  });

  if (metadata.leadId) {
    await prisma.task.create({
      data: {
        customerId: metadata.leadId,
        title: `${event.title} 邀约状态覆盖 - ${status}`,
        taskType: 'invite_event',
        content: `人工将 ${event.title} 邀约状态覆盖为 ${status}。备注：${metadata.note || '无'}。`,
        triggerSource: 'workflow',
        triggerReason: '人工覆盖 Invite 状态',
        approvalStatus: 'approved',
        executeStatus: status === 'completed' ? 'success' : 'scheduled',
        scheduledAt: status === 'completed' ? null : new Date(Date.now() + 2 * 60 * 1000),
      },
    });
  }
}
