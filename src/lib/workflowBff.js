import prisma from './prisma';
import { listDeliveryJobs } from './executionOpsService';
import { getOptimizationTaskMeta, isOptimizationTask, summarizeOptimizationTasks } from './optimizationTaskMeta';
import {
  phase2Events,
  phase2Playbooks,
  phase2ReferralPrograms,
  phase2RunTrails,
} from './phase2WorkflowData';

const ACTIVE_TASK_SOURCES = new Set(['manual_command', 'workflow', 'sop', 'ai-sop', 'ai']);
const WORKFLOW_AUDIT_ENTITIES = new Set(['workflow_playbook', 'workflow_event', 'workflow_referral', 'workflow_run']);

const RUN_TRIGGER_META = {
  manual_command: {
    agentType: 'Orchestrator Agent',
    owner: 'AI Command Center',
    scope: '人工招商指令下发后的批量执行链路',
  },
  workflow: {
    agentType: 'Workflow Agent',
    owner: 'Workflow Orchestrator',
    scope: '工作流编排、会务节点和执行队列协调',
  },
  sop: {
    agentType: 'Sequence Agent',
    owner: 'SOP Automation',
    scope: 'SOP 自动培育、资料外发和催签序列',
  },
  'ai-sop': {
    agentType: 'Sequence Agent',
    owner: 'SOP Automation',
    scope: 'AI 生成的多步培育与邀约工作流',
  },
  ai: {
    agentType: 'AI Review Agent',
    owner: 'AI Review Engine',
    scope: 'AI 自动审核、敏感资料外发和审批拦截链路',
  },
};

const LEAD_SOURCE_LABELS = {
  wechat: '微信私聊',
  wework: '企微线索',
  event: '会务导入',
  referral: '转介绍',
  manual: '人工录入',
};

const ACTIVE_LEAD_STATUSES = new Set(['new', 'pool', 'qualified', 'negotiating']);

function normalizeDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function toIso(value) {
  const date = normalizeDate(value);
  return date ? date.toISOString() : new Date().toISOString();
}

function formatShortDateToken(value) {
  const date = normalizeDate(value) || new Date();
  return `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function buildArtifactRef(prefix, entityId, value, index = 1) {
  const idToken = String(entityId).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000';
  return `${prefix}-${formatShortDateToken(value)}-${idToken}-${String(index).padStart(2, '0')}`;
}

function formatLeadSource(source) {
  return LEAD_SOURCE_LABELS[source] || source || '待补录来源';
}

function resolveRunStatus(tasks) {
  if (tasks.some((task) => task.approvalStatus === 'pending')) return 'paused_for_approval';
  if (tasks.some((task) => task.executeStatus === 'scheduled')) return 'running';
  if (tasks.every((task) => task.executeStatus === 'success' || task.executeStatus === 'cancelled')) return 'completed';
  return 'draft';
}

function resolveRunStep(status, tasks) {
  if (status === 'paused_for_approval') return `等待 ${tasks.filter((task) => task.approvalStatus === 'pending').length} 条审批`;
  if (status === 'running') return `执行中 ${tasks.filter((task) => task.executeStatus === 'scheduled').length} 条任务`;
  if (status === 'completed') return '执行完成';
  return '准备执行';
}

function buildRunTimeline(tasks, status) {
  const ordered = [...tasks].sort((a, b) => normalizeDate(a.createdAt) - normalizeDate(b.createdAt));
  const firstTask = ordered[0];
  const lastTask = ordered[ordered.length - 1];

  return [
    { time: toIso(firstTask?.createdAt), label: '任务入队', state: 'done' },
    { time: toIso(firstTask?.createdAt), label: `收集 ${tasks.length} 条执行任务`, state: 'done' },
    { time: toIso(lastTask?.scheduledAt || lastTask?.updatedAt || lastTask?.createdAt), label: resolveRunStep(status, tasks), state: status === 'completed' ? 'done' : 'active' },
  ];
}

function formatTaskPreviewTime(task) {
  return toIso(task.scheduledAt || task.updatedAt || task.createdAt);
}

function buildTaskPreview(tasks, limit = 3) {
  return tasks.slice(0, limit).map((task) => ({
    id: task.id,
    title: task.title,
    leadName: task.customer?.name || '未知线索',
    statusLabel: formatTaskStatus(task),
    time: formatTaskPreviewTime(task),
  }));
}

function buildRunTree(source, tasks, status, optimizationTasks) {
  const pendingTasks = tasks.filter((task) => task.approvalStatus === 'pending');
  const scheduledTasks = tasks.filter((task) => task.executeStatus === 'scheduled');
  const completedTasks = tasks.filter((task) => task.executeStatus === 'success');
  const optimizationSummary = summarizeOptimizationTasks(optimizationTasks);
  const children = [
    {
      id: `${source}_intake`,
      label: '任务入队',
      meta: `当前已汇总 ${tasks.length} 条任务`,
      status: 'done',
      children: buildTaskPreview(tasks, 2).map((task) => ({
        id: `${source}_intake_${task.id}`,
        label: task.title,
        meta: `${task.leadName} · ${task.statusLabel}`,
        status: 'done',
      })),
    },
  ];

  if (pendingTasks.length) {
    children.push({
      id: `${source}_approval_branch`,
      label: '审批分支',
      meta: `${pendingTasks.length} 条任务等待人工确认`,
      status: 'pending',
      children: buildTaskPreview(pendingTasks).map((task) => ({
        id: `${source}_approval_${task.id}`,
        label: task.title,
        meta: `${task.leadName} · ${task.statusLabel}`,
        status: 'pending',
      })),
    });
  }

  if (scheduledTasks.length) {
    children.push({
      id: `${source}_execution_branch`,
      label: '执行分支',
      meta: `${scheduledTasks.length} 条任务已进入调度`,
      status: status === 'completed' ? 'done' : 'active',
      children: buildTaskPreview(scheduledTasks).map((task) => ({
        id: `${source}_execution_${task.id}`,
        label: task.title,
        meta: `${task.leadName} · ${task.statusLabel}`,
        status: task.statusLabel === '已完成' ? 'done' : 'active',
      })),
    });
  }

  if (optimizationSummary.length) {
    children.push({
      id: `${source}_optimization_branch`,
      label: '优化建议分支',
      meta: `${optimizationTasks.length} 条任务来自优化建议`,
      status: 'info',
      children: optimizationSummary.map((item) => ({
        id: `${source}_optimization_${item.key}`,
        label: item.label,
        meta: `${item.count} 条联动任务`,
        status: 'info',
      })),
    });
  }

  if (completedTasks.length) {
    children.push({
      id: `${source}_result_branch`,
      label: '结果回写',
      meta: `${completedTasks.length} 条任务已完成`,
      status: 'done',
      children: buildTaskPreview(completedTasks, 2).map((task) => ({
        id: `${source}_result_${task.id}`,
        label: task.title,
        meta: `${task.leadName} · ${task.statusLabel}`,
        status: 'done',
      })),
    });
  }

  return {
    id: `run_tree_${source}`,
    label: '运行主链路',
    meta: `${tasks.length} 条任务 · ${children.length} 个执行分支`,
    status: status === 'completed' ? 'done' : status === 'paused_for_approval' ? 'pending' : 'active',
    children,
  };
}

function matchesEventTask(task, event) {
  const text = `${task.title || ''} ${task.triggerReason || ''} ${task.content || ''} ${task.taskType || ''}`;
  return event.relatedLeads.includes(task.customerId) || text.includes(event.title);
}

function isDialingTask(task, event) {
  if (!matchesEventTask(task, event)) return false;
  const text = `${task.title || ''} ${task.triggerReason || ''} ${task.content || ''} ${task.taskType || ''}`;
  return /拨号|电话|邀约|invite_event|二次确认/i.test(text);
}

function isPostFollowupTask(task, event) {
  if (!matchesEventTask(task, event)) return false;
  const text = `${task.title || ''} ${task.triggerReason || ''} ${task.content || ''} ${task.taskType || ''}`;
  return /会后催签|会后 1v1 跟进|会后|催签|follow_up|报价沟通/i.test(text);
}

function buildLiveRuns(tasks) {
  const grouped = tasks.reduce((acc, task) => {
    const key = task.triggerSource || 'manual_command';
    if (!ACTIVE_TASK_SOURCES.has(key)) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const liveRuns = Object.entries(grouped).map(([source, group]) => {
    const meta = RUN_TRIGGER_META[source] || RUN_TRIGGER_META.manual_command;
    const status = resolveRunStatus(group);
    const pendingTask = group.find((task) => task.approvalStatus === 'pending');
    const oldest = [...group].sort((a, b) => normalizeDate(a.createdAt) - normalizeDate(b.createdAt))[0];
    const optimizationTasks = group.filter(isOptimizationTask);
    const optimizationSummary = summarizeOptimizationTasks(optimizationTasks);
    const primaryOptimization = optimizationTasks[0] ? getOptimizationTaskMeta(optimizationTasks[0]) : null;
    const optimizationText = optimizationSummary.length
      ? ` 其中 ${optimizationTasks.length} 条来自优化建议，包含 ${optimizationSummary.map((item) => `${item.label} ${item.count} 条`).join('、')}。`
      : '';
    const runTree = buildRunTree(source, group, status, optimizationTasks);

    return {
      id: `live_${source}`,
      agentType: meta.agentType,
      owner: meta.owner,
      scope: meta.scope,
      status,
      startedAt: toIso(oldest?.createdAt),
      currentStep: resolveRunStep(status, group),
      steps: ['任务入队', '聚合执行', resolveRunStep(status, group)],
      approvalId: null,
      outputSummary: `当前共有 ${group.length} 条 ${source} 任务，待审批 ${group.filter((task) => task.approvalStatus === 'pending').length} 条，待执行 ${group.filter((task) => task.executeStatus === 'scheduled').length} 条。${optimizationText}`,
      timeline: buildRunTimeline(group, status),
      recommendedAction: status === 'paused_for_approval'
        ? optimizationTasks.length
          ? '优先处理优化建议触发的审批断点'
          : '优先处理审批断点'
        : status === 'running'
          ? optimizationTasks.length
            ? '跟踪优化建议生成的任务执行结果'
            : '继续执行并检查队列'
          : '查看结果与复盘',
      taskStats: {
        total: group.length,
        pendingApproval: group.filter((task) => task.approvalStatus === 'pending').length,
        scheduled: group.filter((task) => task.executeStatus === 'scheduled').length,
        completed: group.filter((task) => task.executeStatus === 'success').length,
        optimization: optimizationTasks.length,
      },
      runTree,
      treeSummary: runTree.children.map((branch) => branch.label).join(' / '),
      linkedOptimization: primaryOptimization
        ? {
            title: '优化建议来源',
            label: primaryOptimization.label,
            icon: primaryOptimization.icon,
            href: primaryOptimization.href,
            count: optimizationTasks.length,
            summary: optimizationSummary.map((item) => `${item.label} ${item.count} 条`).join(' · '),
          }
        : null,
      linkedApproval: pendingTask
        ? {
            title: pendingTask.title,
            riskLevel: 'medium',
            impact: pendingTask.triggerReason || '该运行组存在待审批任务，需要人工接管后继续执行。',
          }
        : null,
    };
  });

  return liveRuns.length ? liveRuns : phase2RunTrails.map((run) => ({ ...run, linkedApproval: null }));
}

function buildQueue(tasks) {
  return [...tasks]
    .filter((task) => task.scheduledAt || task.approvalStatus === 'pending')
    .sort((a, b) => {
      const aTime = normalizeDate(a.scheduledAt || a.createdAt)?.getTime() || 0;
      const bTime = normalizeDate(b.scheduledAt || b.createdAt)?.getTime() || 0;
      return aTime - bTime;
    })
    .slice(0, 8)
    .map((task) => ({
      id: task.id,
      leadName: task.customer?.name || '未知线索',
      title: task.title,
      status: task.approvalStatus === 'pending' ? '待审批' : task.executeStatus === 'scheduled' ? '待执行' : '草稿',
      time: normalizeDate(task.scheduledAt || task.createdAt)?.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }) || '待排期',
      source: task.triggerSource,
    }));
}

function formatTaskStatus(task) {
  if (task.approvalStatus === 'pending') return '待审批';
  if (task.executeStatus === 'scheduled') return '待执行';
  if (task.executeStatus === 'success') return '已完成';
  if (task.executeStatus === 'cancelled') return '已取消';
  return '草稿';
}

function buildRelatedTaskPreview(tasks, matcher) {
  return tasks
    .filter(matcher)
    .slice(0, 3)
    .map((task) => ({
      id: task.id,
      title: task.title,
      leadName: task.customer?.name || '未知线索',
      statusLabel: formatTaskStatus(task),
      time: toIso(task.updatedAt || task.createdAt),
    }));
}

function buildPlaybooks(leads, tasks) {
  const activeLeadCount = leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.lifecycleStatus)).length;
  const negotiatingLeads = leads.filter((lead) => lead.lifecycleStatus === 'negotiating').length;
  const pendingApprovals = tasks.filter((task) => task.approvalStatus === 'pending').length;

  return phase2Playbooks.map((playbook) => ({
    ...playbook,
    liveTargetLeads: activeLeadCount,
    liveNegotiatingLeads: negotiatingLeads,
    livePendingApprovals: pendingApprovals,
  }));
}

function buildEvents(leads, tasks) {
  return phase2Events.map((event) => {
    const relatedTasks = tasks.filter((task) => matchesEventTask(task, event));
    const relatedLeadRecords = leads.filter((lead) => event.relatedLeads.includes(lead.id));
    const dialingTasks = relatedTasks.filter((task) => isDialingTask(task, event));
    const postFollowupTasks = relatedTasks.filter((task) => isPostFollowupTask(task, event));
    const sequence = (event.sequence || []).map((step) => {
      if (step.status === 'dialing' || /拨号/.test(step.label)) {
        return {
          ...step,
          count: Math.max(dialingTasks.length, step.count || 0),
          status: dialingTasks.length ? 'dialing' : step.status,
        };
      }
      if (/会后催签/.test(step.label)) {
        return {
          ...step,
          count: Math.max(postFollowupTasks.length, step.count || 0),
          status: postFollowupTasks.length ? 'active' : step.status,
        };
      }
      return step;
    });

    return {
      ...event,
      sequence,
      liveEventTasks: relatedTasks.length,
      liveDialingTasks: dialingTasks.length,
      liveDialingPreview: buildTaskPreview(dialingTasks),
      liveFollowupTasks: postFollowupTasks.length,
      livePostFollowupTasks: postFollowupTasks.length,
      livePostFollowupPreview: buildTaskPreview(postFollowupTasks),
      liveApprovalBlockers: relatedTasks.filter((task) => task.approvalStatus === 'pending').length,
      livePotentialAttendees: relatedLeadRecords.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.lifecycleStatus)).length,
    };
  });
}

function buildReferrals(leads, tasks) {
  const signedLeads = leads.filter((lead) => lead.lifecycleStatus === 'signed').length;
  const referralTasks = tasks.filter((task) => /转介绍|推荐|主理人|合伙/.test(`${task.title} ${task.triggerReason || ''} ${task.content}`));

  return phase2ReferralPrograms.map((program) => ({
    ...program,
    liveSignedLeads: signedLeads,
    liveReferralTasks: referralTasks.length,
    liveApprovalTasks: referralTasks.filter((task) => task.approvalStatus === 'pending').length,
  }));
}

function buildSummary(tasks, runs, playbooks, events, referrals) {
  return {
    pendingApprovals: tasks.filter((task) => task.approvalStatus === 'pending').length,
    activeRuns: runs.filter((run) => run.status !== 'completed' && run.status !== 'cancelled').length,
    upcomingEvents: events.filter((item) => item.status === 'upcoming' || item.status === 'active').length,
    activeReferrals: referrals.filter((item) => item.status === 'active' || item.status === 'pending_approval').length,
    readyPlaybooks: playbooks.filter((item) => item.status === 'recommended' || item.status === 'draft' || item.status === 'pending_approval' || item.status === 'published').length,
  };
}

export async function loadWorkflowOperationalData() {
  const [tasks, leads, auditLogs, deliveryJobs] = await Promise.all([
    prisma.task.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            lifecycleStatus: true,
            source: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        lifecycleStatus: true,
        source: true,
        lastInteractionAt: true,
        phone: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: {
          in: Array.from(WORKFLOW_AUDIT_ENTITIES),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    listDeliveryJobs(),
  ]);

  return { tasks, leads, auditLogs, deliveryJobs };
}

function buildAuditMap(auditLogs) {
  return auditLogs.reduce((acc, log) => {
    if (!acc[log.entityType]) acc[log.entityType] = {};
    if (!acc[log.entityType][log.entityId]) {
      let metadata = null;
      try {
        metadata = log.metadata ? JSON.parse(log.metadata) : null;
      } catch (error) {
        metadata = null;
      }
      acc[log.entityType][log.entityId] = {
        ...log,
        metadata,
      };
    }
    return acc;
  }, {});
}

function buildAuditHistoryMap(auditLogs) {
  return auditLogs.reduce((acc, log) => {
    if (!acc[log.entityType]) acc[log.entityType] = {};
    if (!acc[log.entityType][log.entityId]) acc[log.entityType][log.entityId] = [];

    let metadata = null;
    try {
      metadata = log.metadata ? JSON.parse(log.metadata) : null;
    } catch (error) {
      metadata = null;
    }

    acc[log.entityType][log.entityId].push({
      ...log,
      metadata,
    });
    return acc;
  }, {});
}

function derivePlaybookVersions(history) {
  return history
    .filter((item) => item.action === 'publish_version')
    .slice(0, 4)
    .map((item, index) => ({
      versionTag: item.metadata?.versionTag || `V${String(index + 1).padStart(2, '0')}`,
      createdAt: item.createdAt.toISOString(),
      releaseRef: item.metadata?.releaseRef || null,
      predictedROI: item.metadata?.predictedROI || null,
      predictedContractRate: item.metadata?.predictedContractRate || null,
      packageItems: item.metadata?.packageItems || null,
      manifestSummary: item.metadata?.manifestSummary || null,
    }));
}

function derivePlaybookReleasePacks(playbook, versions, tasks) {
  const releaseTasks = tasks.filter((task) => task.title.includes('Playbook 版本发布') && task.title.includes(playbook.title));

  return (versions.length ? versions : [{ versionTag: '待发布', createdAt: null }]).map((version, index) => ({
    id: `${playbook.id}_release_${index + 1}`,
    releaseRef: version.releaseRef || buildArtifactRef('PB', playbook.id, version.createdAt, index + 1),
    versionTag: version.versionTag,
    createdAt: version.createdAt,
    packageItems: version.packageItems || [
      ...playbook.assetBundle.slice(0, 3),
      playbook.meetingStrategy,
      playbook.fissionStrategy,
    ],
    manifestSummary: version.manifestSummary || [
      `政策建议：${playbook.policyRecommendation}`,
      `会务链路：${playbook.meetingStrategy}`,
      `裂变联动：${playbook.fissionStrategy}`,
    ],
    releaseStatus: version.createdAt ? 'published' : 'draft',
    linkedTaskCount: releaseTasks.length,
  }));
}

function mergePlaybookAudit(playbooks, auditMap, auditHistoryMap, tasks) {
  return playbooks.map((playbook) => {
    const log = auditMap.workflow_playbook?.[playbook.id];
    const fullHistory = auditHistoryMap.workflow_playbook?.[playbook.id] || [];
    const history = fullHistory.slice(0, 6).map((item) => ({
      action: item.action,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      operator: item.operator,
      status: item.metadata?.status || null,
    }));
    const versions = derivePlaybookVersions(fullHistory);
    const base = {
      ...playbook,
      history,
      versions,
      latestVersion: versions[0] || null,
      releasePacks: derivePlaybookReleasePacks(playbook, versions, tasks),
    };
    if (!log?.metadata?.status) return base;
    return {
      ...base,
      status: log.metadata.status,
      lastAction: log.action,
      lastActionAt: log.createdAt.toISOString(),
    };
  });
}

function mergeEventAudit(events, auditMap, auditHistoryMap, leads, tasks) {
  return events.map((event) => {
    const log = auditMap.workflow_event?.[event.id];
    const history = auditHistoryMap.workflow_event?.[event.id] || [];
    const checkedInLeadIds = new Set(
      history
        .filter((item) => item.action === 'check_in' && item.metadata?.leadId)
        .map((item) => item.metadata.leadId)
    );

    const roster = event.relatedLeads.map((leadId) => {
      const lead = leads.find((item) => item.id === leadId);
      const checkedIn = checkedInLeadIds.has(leadId);
      return {
        leadId,
        leadName: lead?.name || '待补充',
        sourceLabel: formatLeadSource(lead?.source),
        phone: lead?.phone || '待补录电话',
        status: checkedIn ? 'attended' : event.status === 'completed' ? 'absent' : 'confirmed',
        checkedIn,
        lastInteractionAt: lead?.lastInteractionAt ? lead.lastInteractionAt.toISOString() : null,
      };
    });

    const eventTaskCount = tasks.filter((task) => matchesEventTask(task, event)).length;
    const latestBatchRef = history.find((item) => item.metadata?.batchRef)?.metadata?.batchRef || null;
    const latestNextFollowup = history.find((item) => item.metadata?.nextFollowup)?.metadata?.nextFollowup || null;
    const executionBatch = {
      id: `${event.id}_live_batch`,
      batchRef: latestBatchRef || buildArtifactRef('EV', event.id, history[0]?.createdAt || event.date, 1),
      title: `${event.title} 当前执行批次`,
      checkedInCount: roster.filter((item) => item.checkedIn).length,
      absentCount: roster.filter((item) => item.status === 'absent').length,
      pendingCount: roster.filter((item) => item.status === 'confirmed').length,
      followupTaskCount: eventTaskCount,
      dialingTaskCount: event.liveDialingTasks || 0,
      postFollowupTaskCount: event.livePostFollowupTasks || 0,
      checkpoint: history[0]?.action || 'waiting',
      updatedAt: history[0]?.createdAt?.toISOString?.() || null,
      nextFollowup: latestNextFollowup || (roster.some((item) => item.status === 'confirmed') ? '继续提醒未签到名单' : '推进会后催签与签约跟进'),
    };

    const base = {
      ...event,
      roster,
      executionBatches: [executionBatch],
      liveCheckedIn: roster.filter((item) => item.checkedIn).length,
      liveAbsent: roster.filter((item) => item.status === 'absent').length,
      liveAttendanceRate: roster.length ? `${Math.round((roster.filter((item) => item.checkedIn).length / roster.length) * 100)}%` : '0%',
      liveDialingTasks: event.liveDialingTasks || 0,
      liveDialingPreview: event.liveDialingPreview || [],
      livePostFollowupTasks: event.livePostFollowupTasks || 0,
      livePostFollowupPreview: event.livePostFollowupPreview || [],
      history: history.slice(0, 6).map((item) => ({
        action: item.action,
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        operator: item.operator,
        leadName: item.metadata?.leadName || null,
      })),
    };
    if (!log?.metadata) return base;
    return {
      ...base,
      status: log.metadata.status || event.status,
      sequenceState: log.metadata.sequenceState || null,
      lastAction: log.action,
      lastActionAt: log.createdAt.toISOString(),
    };
  });
}

function mergeReferralAudit(referrals, auditMap, auditHistoryMap, leads, tasks) {
  return referrals.map((program) => {
    const log = auditMap.workflow_referral?.[program.id];
    const history = auditHistoryMap.workflow_referral?.[program.id] || [];
    const referralEvents = leads
      .filter((lead) => lead.lifecycleStatus === 'signed')
      .slice(0, 5)
      .map((lead, index) => {
        const settled = history.some((item) => item.action === 'settle_reward' && item.metadata?.leadId === lead.id);
        return {
          id: `${program.id}_evt_${lead.id}`,
          leadId: lead.id,
          leadName: lead.name,
          stage: lead.lifecycleStatus,
          sourceLabel: formatLeadSource(lead.source),
          rewardStatus: settled ? 'settled' : index === 0 ? 'pending_settlement' : 'qualified',
        };
      });

    const settlementTasks = tasks.filter((task) => task.title.includes('裂变奖励结算'));
    const settlementLedger = referralEvents.map((event) => {
      const settledHistory = history.find((item) => item.action === 'settle_reward' && item.metadata?.leadId === event.leadId);
      const settlementTask = settlementTasks.find((task) => task.customerId === event.leadId);
      return {
        id: `${program.id}_ledger_${event.leadId}`,
        settlementRef: settledHistory?.metadata?.settlementRef || buildArtifactRef('RF', `${program.id}${event.leadId}`, settledHistory?.createdAt || settlementTask?.updatedAt || null),
        leadId: event.leadId,
        leadName: event.leadName,
        rewardLabel: settledHistory?.metadata?.reward || program.reward,
        status: event.rewardStatus,
        updatedAt: settledHistory?.createdAt?.toISOString?.() || settlementTask?.updatedAt?.toISOString?.() || null,
        payoutStage: settledHistory?.metadata?.payoutStage || (event.rewardStatus === 'settled' ? '总部财务已完成结算' : event.rewardStatus === 'pending_settlement' ? '待财务复核' : '待转入结算池'),
      };
    });

    const base = {
      ...program,
      referralEvents,
      settlementLedger,
      liveSettledRewards: referralEvents.filter((item) => item.rewardStatus === 'settled').length,
      livePendingSettlements: referralEvents.filter((item) => item.rewardStatus === 'pending_settlement').length,
      history: history.slice(0, 6).map((item) => ({
        action: item.action,
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        status: item.metadata?.status || null,
        leadName: item.metadata?.leadName || null,
      })),
    };
    if (!log?.metadata?.status) return base;
    return {
      ...base,
      status: log.metadata.status,
      lastAction: log.action,
      lastActionAt: log.createdAt.toISOString(),
    };
  });
}

function mergeRunAudit(runs, auditMap, auditHistoryMap) {
  return runs.map((run) => {
    const log = auditMap.workflow_run?.[run.id];
    const base = {
      ...run,
      history: (auditHistoryMap.workflow_run?.[run.id] || []).slice(0, 6).map((item) => ({
        action: item.action,
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        status: item.metadata?.status || null,
        operator: item.operator,
      })),
    };
    if (!log?.metadata) return base;
    return {
      ...base,
      status: log.metadata.status === 'cancelled' ? 'cancelled' : (log.metadata.status || run.status),
      currentStep: log.metadata.currentStep || run.currentStep,
      recommendedAction: log.metadata.recommendedAction || run.recommendedAction,
      lastAction: log.action,
      lastActionAt: log.createdAt.toISOString(),
    };
  });
}

function attachDeliveryJobsToReferrals(referrals, deliveryJobs) {
  return referrals.map((program) => {
    const assetJobs = deliveryJobs
      .filter((job) => job.entityType === 'workflow_referral' && job.entityId === program.id)
      .map((job) => ({
        id: job.id,
        artifactRef: job.artifactRef,
        status: job.status,
        jobType: job.jobType,
        assets: job.payload?.assets || [],
        updatedAt: job.updatedAt,
      }));

    return {
      ...program,
      assetJobs,
      antiFraudRules: (program.fraudThreshold || '')
        .split(' / ')
        .flatMap((item) => item.split('，'))
        .map((item) => item.trim())
        .filter(Boolean),
    };
  });
}

function buildOpsBoard(playbooks, events, referrals, runs) {
  const latestPlaybookVersion = playbooks
    .flatMap((item) => (item.latestVersion ? [{ ...item.latestVersion, title: item.title }] : []))
    .sort((a, b) => normalizeDate(b.createdAt) - normalizeDate(a.createdAt))[0] || null;

  const totalEventRoster = events.reduce((sum, item) => sum + (item.roster?.length || 0), 0);
  const totalCheckedIn = events.reduce((sum, item) => sum + (item.liveCheckedIn || 0), 0);
  const pendingSettlements = referrals.reduce((sum, item) => sum + (item.livePendingSettlements || 0), 0);
  const settledRewards = referrals.reduce((sum, item) => sum + (item.liveSettledRewards || 0), 0);
  const latestSettlement = referrals
    .flatMap((item) =>
      (item.history || [])
        .filter((historyItem) => historyItem.action === 'settle_reward')
        .map((historyItem) => ({
          leadName: historyItem.leadName,
          createdAt: historyItem.createdAt,
          programName: item.name,
        }))
    )
    .sort((a, b) => normalizeDate(b.createdAt) - normalizeDate(a.createdAt))[0] || null;
  const latestReleasePack = playbooks
    .flatMap((item) => item.releasePacks || [])
    .filter((item) => item.releaseStatus === 'published')
    .sort((a, b) => normalizeDate(b.createdAt) - normalizeDate(a.createdAt))[0] || null;
  const latestEventBatch = events
    .flatMap((item) => item.executionBatches || [])
    .sort((a, b) => normalizeDate(b.updatedAt) - normalizeDate(a.updatedAt))[0] || null;
  const latestSettlementLedger = referrals
    .flatMap((item) => item.settlementLedger || [])
    .filter((item) => item.status === 'settled')
    .sort((a, b) => normalizeDate(b.updatedAt) - normalizeDate(a.updatedAt))[0] || null;

  return {
    playbookRelease: {
      publishedCount: playbooks.reduce((sum, item) => sum + (item.versions?.length || 0), 0),
      latestVersionTag: latestPlaybookVersion?.versionTag || '待发布',
      latestTitle: latestPlaybookVersion?.title || '暂无版本发布',
      lastPublishedAt: latestPlaybookVersion?.createdAt || null,
      latestReleaseRef: latestReleasePack?.releaseRef || '等待生成',
    },
    eventExecution: {
      checkedInCount: totalCheckedIn,
      rosterCount: totalEventRoster,
      attendanceRate: totalEventRoster ? `${Math.round((totalCheckedIn / totalEventRoster) * 100)}%` : '0%',
      nextEventTitle: events.find((item) => item.status === 'upcoming' || item.status === 'active')?.title || '暂无待执行会务',
      latestBatchRef: latestEventBatch?.batchRef || '等待批次生成',
    },
    referralSettlement: {
      settledCount: settledRewards,
      pendingCount: pendingSettlements,
      latestLeadName: latestSettlement?.leadName || '暂无结算记录',
      latestProgramName: latestSettlement?.programName || '等待结算',
      latestSettlementRef: latestSettlementLedger?.settlementRef || '等待结算编号',
    },
    runHealth: {
      pausedCount: runs.filter((item) => item.status === 'paused_for_approval').length,
      completedCount: runs.filter((item) => item.status === 'completed').length,
      runningCount: runs.filter((item) => item.status === 'running').length,
    },
  };
}

function buildArtifactRegistry(playbooks, events, referrals, tasks) {
  const playbookArtifacts = playbooks.flatMap((playbook) =>
    (playbook.releasePacks || []).map((pack) => {
      const relatedTasks = buildRelatedTaskPreview(
        tasks,
        (task) => task.title.includes(playbook.title) || task.triggerReason?.includes(playbook.title)
      );

      return {
        id: pack.id,
        type: 'playbook_release',
        typeLabel: '发布包',
        ref: pack.releaseRef,
        title: `${playbook.title} ${pack.versionTag}`,
        status: pack.releaseStatus,
        statusLabel: pack.releaseStatus === 'published' ? '已发布' : '待发布',
        summary: pack.manifestSummary?.join(' · ') || pack.packageItems?.slice(0, 3).join('、') || '等待发布内容',
        linkedCount: pack.linkedTaskCount,
        updatedAt: pack.createdAt,
        nextStep: pack.releaseStatus === 'published' ? '核对发布包内容，并检查联动任务是否全部完成。' : '先发布版本，再同步会务与裂变联动。',
        relatedTasks,
        href: `/workflow/playbooks?playbook=${playbook.id}&ref=${encodeURIComponent(pack.releaseRef)}`,
      };
    })
  );

  const eventArtifacts = events.flatMap((event) =>
    (event.executionBatches || []).map((batch) => {
      const relatedTasks = buildRelatedTaskPreview(
        tasks,
        (task) => task.title.includes(event.title) || task.triggerReason?.includes(event.title)
      );

      return {
        id: batch.id,
        type: 'event_batch',
        typeLabel: '执行批次',
        ref: batch.batchRef,
        title: batch.title,
        status: batch.checkpoint,
        statusLabel: batch.checkpoint,
        summary: `已签到 ${batch.checkedInCount} 人 / 待签到 ${batch.pendingCount} 人 / 未到场 ${batch.absentCount} 人`,
        linkedCount: batch.followupTaskCount,
        updatedAt: batch.updatedAt,
        nextStep: batch.nextFollowup,
        relatedTasks,
        href: `/workflow/events?event=${event.id}&batch=${encodeURIComponent(batch.batchRef)}`,
      };
    })
  );

  const referralArtifacts = referrals.flatMap((program) =>
    (program.settlementLedger || []).map((ledger) => {
      const relatedTasks = buildRelatedTaskPreview(
        tasks,
        (task) => task.title.includes('裂变奖励结算') && task.customerId === ledger.leadId
      );

      return {
        id: ledger.id,
        type: 'referral_settlement',
        typeLabel: '结算台账',
        ref: ledger.settlementRef,
        title: `${program.name} · ${ledger.leadName}`,
        status: ledger.status,
        statusLabel: ledger.status === 'settled' ? '已结算' : ledger.status === 'pending_settlement' ? '待结算' : '已达标',
        summary: `${ledger.rewardLabel} · ${ledger.payoutStage}`,
        linkedCount: null,
        updatedAt: ledger.updatedAt,
        nextStep: ledger.payoutStage,
        relatedTasks,
        href: `/workflow/referrals?program=${program.id}&settlement=${encodeURIComponent(ledger.settlementRef)}`,
      };
    })
  );

  return [...playbookArtifacts, ...eventArtifacts, ...referralArtifacts]
    .sort((a, b) => (normalizeDate(b.updatedAt)?.getTime() || 0) - (normalizeDate(a.updatedAt)?.getTime() || 0))
    .slice(0, 12);
}

function buildArtifactSummary(artifacts) {
  return artifacts.reduce((acc, artifact) => {
    acc.total += 1;
    acc.byType[artifact.type] = (acc.byType[artifact.type] || 0) + 1;
    acc.byStatus[artifact.status] = (acc.byStatus[artifact.status] || 0) + 1;
    return acc;
  }, {
    total: 0,
    byType: {},
    byStatus: {},
  });
}

function buildOptimizationSummaryMap(tasks) {
  return summarizeOptimizationTasks(tasks).reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});
}

function attachPlaybookOptimization(playbooks, summaryMap) {
  return playbooks.map((playbook) => {
    const optimizationContext = (summaryMap.approval_cleanup && (playbook.livePendingApprovals > 0 || playbook.status === 'pending_approval'))
      ? summaryMap.approval_cleanup
      : (summaryMap.source_growth && (playbook.status === 'published' || playbook.status === 'recommended'))
        ? summaryMap.source_growth
        : null;

    return {
      ...playbook,
      optimizationContext,
    };
  });
}

function attachEventOptimization(events, summaryMap) {
  return events.map((event) => {
    const optimizationContext = (summaryMap.approval_cleanup && (event.liveApprovalBlockers ?? 0) > 0)
      ? summaryMap.approval_cleanup
      : (summaryMap.funnel_repair && ((event.liveFollowupTasks ?? 0) > 0 || event.status === 'upcoming' || event.status === 'active'))
        ? summaryMap.funnel_repair
        : null;

    return {
      ...event,
      optimizationContext,
    };
  });
}

function attachReferralOptimization(referrals, summaryMap) {
  return referrals.map((program) => {
    const optimizationContext = (summaryMap.approval_cleanup && (program.liveApprovalTasks ?? 0) > 0)
      ? summaryMap.approval_cleanup
      : (summaryMap.silent_reactivation && ((program.liveReferralTasks ?? 0) > 0 || program.status === 'active'))
        ? summaryMap.silent_reactivation
        : null;

    return {
      ...program,
      optimizationContext,
    };
  });
}

export async function buildWorkflowSnapshot() {
  const { tasks, leads, auditLogs, deliveryJobs } = await loadWorkflowOperationalData();
  const auditMap = buildAuditMap(auditLogs);
  const auditHistoryMap = buildAuditHistoryMap(auditLogs);
  const runs = mergeRunAudit(buildLiveRuns(tasks), auditMap, auditHistoryMap);
  const optimizationSummaryMap = buildOptimizationSummaryMap(tasks.filter(isOptimizationTask));
  const playbooks = attachPlaybookOptimization(
    mergePlaybookAudit(buildPlaybooks(leads, tasks), auditMap, auditHistoryMap, tasks),
    optimizationSummaryMap
  );
  const events = attachEventOptimization(
    mergeEventAudit(buildEvents(leads, tasks), auditMap, auditHistoryMap, leads, tasks),
    optimizationSummaryMap
  );
  const referrals = attachReferralOptimization(
    attachDeliveryJobsToReferrals(
      mergeReferralAudit(buildReferrals(leads, tasks), auditMap, auditHistoryMap, leads, tasks),
      deliveryJobs
    ),
    optimizationSummaryMap
  );
  const artifacts = buildArtifactRegistry(playbooks, events, referrals, tasks);

  return {
    summary: buildSummary(tasks, runs, playbooks, events, referrals),
    opsBoard: buildOpsBoard(playbooks, events, referrals, runs),
    artifacts,
    artifactSummary: buildArtifactSummary(artifacts),
    queue: buildQueue(tasks),
    runs,
    playbooks,
    events,
    referrals,
  };
}
