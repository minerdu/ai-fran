import prisma from './prisma';
import { buildAiOpsAggregate } from './aiOpsAggregate';
import { listApprovals } from './approvalService';
import {
  buildBrandModelingPayload,
  getBrandById,
  listBrands,
  listKnowledgeDocuments,
  recommendSkillsForBrand,
} from './brandModelingService';
import { listGovernanceAuditLogs } from './governanceStore';
import { loadLeadDetail, loadLeadList, loadLeadTimeline } from './leadBff';
import { buildWorkflowSnapshot } from './workflowBff';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function hoursUntil(value) {
  if (!value) return null;
  return Math.round((new Date(value).getTime() - Date.now()) / (60 * 60 * 1000));
}

function buildTypeGroupCounts(approvals) {
  return approvals.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
}

function buildApprovalRiskSummary(approvals) {
  return {
    total: approvals.length,
    highRisk: approvals.filter((item) => item.riskLevel === 'high' && item.status === 'pending').length,
    expiringSoon: approvals.filter((item) => item.status === 'pending' && (hoursUntil(item.expiresAt) ?? 999) <= 24).length,
    byType: buildTypeGroupCounts(approvals.filter((item) => item.status === 'pending')),
  };
}

function matchesObjectName(approval, candidate, labelKeys = ['title', 'name']) {
  const objectName = `${approval?.objectName || ''}`.trim();
  if (!objectName) return false;
  return labelKeys.some((key) => {
    const label = `${candidate?.[key] || ''}`.trim();
    return label && (label === objectName || label.includes(objectName) || objectName.includes(label));
  });
}

function buildLatestSuggestionList(aggregate, limit = 3) {
  return toArray(aggregate?.optimizationSuggestions)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      reason: item.reason,
      nextAction: item.nextAction,
      priority: item.priority,
      status: item.status,
      statusLabel: item.statusLabel,
    }));
}

function resolveLeadWorkflowStatus(leadDetail) {
  const tasks = toArray(leadDetail?.tasks);
  if (tasks.some((task) => task.approvalStatus === 'pending')) {
    return {
      key: 'approval_blocked',
      label: '存在待审批动作',
      pendingApprovals: tasks.filter((task) => task.approvalStatus === 'pending').length,
    };
  }
  if (tasks.some((task) => task.executeStatus === 'scheduled' && task.title.includes('邀约'))) {
    return { key: 'invite_running', label: '会务邀约推进中', pendingApprovals: 0 };
  }
  if (leadDetail?.lifecycleStatus === 'negotiating') {
    return { key: 'negotiating', label: '报价谈判中', pendingApprovals: 0 };
  }
  if (leadDetail?.silentDays >= 7) {
    return { key: 'silent', label: '待沉默激活', pendingApprovals: 0 };
  }
  return { key: 'nurturing', label: '标准培育中', pendingApprovals: 0 };
}

function resolveCrmMappingStatus(leadDetail) {
  const history = toArray(leadDetail?.crmHistory);
  return {
    synced: history.length > 0,
    profileState: leadDetail?.profileState || (history.length > 0 ? 'profiled' : 'pending_profile'),
    latestCompany: history[0]?.company || leadDetail?.company || '待建档企业',
    syncCount: history.length,
  };
}

function buildLeadRecentTouches(timelinePayload) {
  return toArray(timelinePayload?.items).slice(0, 3).map((item) => ({
    id: item.id,
    type: item.type,
    source: item.source,
    content: item.content,
    detail: item.detail,
    timestamp: item.timestamp,
  }));
}

function buildLeadPendingApprovals(leadDetail) {
  return toArray(leadDetail?.tasks)
    .filter((task) => task.approvalStatus === 'pending')
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      createdAt: task.createdAt,
      scheduledAt: task.scheduledAt,
    }));
}

function buildAiBusinessSummary(aggregate, snapshot, approvals) {
  return {
    summaryCards: [
      { key: 'playbooks', label: '招商方案', value: snapshot.summary.readyPlaybooks },
      { key: 'runs', label: '运行中的任务', value: snapshot.summary.activeRuns },
      { key: 'reports', label: '招商报告', value: toArray(aggregate.report?.aiSuggestions).length || buildLatestSuggestionList(aggregate, 99).length },
      { key: 'approvals', label: '待审批', value: approvals.filter((item) => item.status === 'pending').length },
    ],
    risks: toArray(aggregate.anomalies),
    recommendations: toArray(aggregate.optimizationSuggestions),
    autonomousAgents: toArray(aggregate.autonomousAgents),
    manualAgents: toArray(aggregate.manualAgents),
    latestCommands: toArray(aggregate.latestCommands),
    recentPlaybooks: toArray(snapshot.playbooks).slice(0, 4),
  };
}

function flattenGroupedSkills(groupedSkills) {
  return Object.values(groupedSkills || {}).flat();
}

function buildSkillInventory(brand, documents) {
  const payload = recommendSkillsForBrand(brand, documents);
  const allSkills = flattenGroupedSkills(payload.groupedSkills);
  const installed = allSkills.slice(0, 6).map((skill, index) => ({
    ...skill,
    installStatus: index < 3 ? 'active' : 'staged',
    activeVersion: skill.version || 'v1.0',
    latestVersion: index < 2 ? `${skill.version || 'v1.0'}-stable` : skill.version || 'v1.0',
    pendingUpgrade: index < 2,
  }));

  return {
    ...payload,
    installed,
    pendingUpgradeCount: installed.filter((item) => item.pendingUpgrade).length,
    riskHints: [
      '涉及政策、预算、审批的 Skill 建议先在灰度环境验证',
      '新品牌话术与会后催签 Skill 发布前建议同步复核知识库文档版本',
    ],
  };
}

function buildSystemStatuses(aiConfig, brandPayload, skillInventory, aggregate) {
  return {
    aiModel: {
      status: aiConfig?.enabled && aiConfig?.apiKey ? 'online' : 'offline',
      detail: aiConfig?.enabled ? `${aiConfig.provider || 'OpenAI Compatible'} / ${aiConfig.modelName || '待配置模型'}` : '未启用',
    },
    knowledgeBase: {
      status: 'online',
      detail: `${brandPayload.docStats.publishedCount} 份文档 / ${brandPayload.docStats.knowledgeChunkCount} 个知识块`,
    },
    crm: {
      status: 'warning',
      detail: 'CRM 测试接入中',
    },
    skillCenter: {
      status: skillInventory.recommended.length ? 'online' : 'warning',
      detail: `${skillInventory.recommended.length} 个推荐 Skill / ${skillInventory.installed.length} 个已安装`,
    },
    engine: {
      status: 'online',
      detail: `${aggregate.engine.runningCount} 个 Agent 运行中 / ${aggregate.engine.pendingApprovals} 个审批断点`,
    },
  };
}

export function buildMobileEnvelope(section, data, meta = {}) {
  return {
    success: true,
    section,
    generatedAt: new Date().toISOString(),
    data,
    meta,
  };
}

export async function buildMobileLeadHomePayload({ filter = 'all', search = '' } = {}) {
  const [leads, aggregate, approvals] = await Promise.all([
    loadLeadList({ filter, search }),
    buildAiOpsAggregate({}),
    listApprovals(),
  ]);

  return {
    summary: {
      total: leads.length,
      highIntentCount: leads.filter((lead) => (lead.intentScore || 0) >= 4).length,
      pendingInviteCount: leads.filter((lead) => ['pool', 'qualified'].includes(lead.stage) && (lead.intentScore || 0) >= 3.5).length,
      pendingManualCount: leads.filter((lead) => lead.assignedToId === 'manual_followup').length,
      unsyncedCrmCount: leads.filter((lead) => !toArray(lead.crmHistory).length).length,
      pendingApprovals: approvals.filter((item) => item.status === 'pending' && item.objectType === 'lead').length,
    },
    leads,
    latestAiSuggestions: buildLatestSuggestionList(aggregate),
  };
}

export async function buildMobileLeadDetailPayload(leadId) {
  const [detail, timelinePayload] = await Promise.all([
    loadLeadDetail(leadId),
    loadLeadTimeline(leadId),
  ]);

  if (!detail) return null;

  return {
    lead: detail,
    aiSummary: detail.aiSummary,
    workflowStatus: resolveLeadWorkflowStatus(detail),
    crmMappingStatus: resolveCrmMappingStatus(detail),
    recentTouches: buildLeadRecentTouches(timelinePayload),
    requiredApprovals: buildLeadPendingApprovals(detail),
    timeline: timelinePayload,
  };
}

export async function buildMobileWorkflowHomePayload() {
  const snapshot = await buildWorkflowSnapshot();
  const runningRuns = toArray(snapshot.runs).filter((item) => !['completed', 'cancelled'].includes(item.status));
  return {
    summary: {
      pendingTodos: toArray(snapshot.queue).length,
      upcomingEvents: toArray(snapshot.events).filter((item) => ['upcoming', 'active'].includes(item.status)).length,
      runningRuns: runningRuns.length,
      referralPendingItems: toArray(snapshot.referrals).filter((item) => item.status === 'pending_approval').length,
      failedRetries: toArray(snapshot.runs).filter((item) => item.status === 'failed').length,
    },
    todoQueue: snapshot.queue,
    upcomingEvents: snapshot.events,
    runningRuns,
    referrals: snapshot.referrals,
  };
}

export async function buildMobileWorkflowEventsPayload() {
  const snapshot = await buildWorkflowSnapshot();
  const items = toArray(snapshot.events);
  return {
    summary: {
      total: items.length,
      totalRegistered: items.reduce((sum, item) => sum + (item.registered || 0), 0),
      totalConfirmed: items.reduce((sum, item) => sum + (item.confirmed || 0), 0),
      liveDialingWaves: items.reduce((sum, item) => sum + (item.dialingBatches?.length || 0), 0),
      linkedLeadCount: items.reduce((sum, item) => sum + (item.relatedLeads?.length || 0), 0),
    },
    items,
  };
}

export async function buildMobileWorkflowEventDetailPayload(eventId) {
  const snapshot = await buildWorkflowSnapshot();
  return toArray(snapshot.events).find((item) => item.id === eventId) || null;
}

export async function buildMobileWorkflowReferralsPayload() {
  const snapshot = await buildWorkflowSnapshot();
  const items = toArray(snapshot.referrals);
  return {
    summary: {
      total: items.length,
      pendingSettlementCount: items.reduce((sum, item) => sum + toArray(item.settlementLedger).filter((ledger) => ledger.status === 'pending_settlement').length, 0),
      pendingApprovalCount: items.filter((item) => item.status === 'pending_approval').length,
      assetBundleCount: items.reduce((sum, item) => sum + (item.assetJobs?.length || 0), 0),
    },
    items,
  };
}

export async function buildMobileWorkflowReferralDetailPayload(programId) {
  const snapshot = await buildWorkflowSnapshot();
  return toArray(snapshot.referrals).find((item) => item.id === programId) || null;
}

export async function buildMobileWorkflowRunDetailPayload(runId) {
  const snapshot = await buildWorkflowSnapshot();
  return toArray(snapshot.runs).find((item) => item.id === runId) || null;
}

export async function buildMobileAiHomePayload() {
  const [aggregate, snapshot, approvals] = await Promise.all([
    buildAiOpsAggregate({}),
    buildWorkflowSnapshot(),
    listApprovals(),
  ]);

  return buildAiBusinessSummary(aggregate, snapshot, approvals);
}

export async function buildMobileAiPlaybooksPayload() {
  const snapshot = await buildWorkflowSnapshot();
  return {
    summary: {
      total: snapshot.playbooks.length,
      pendingApproval: snapshot.playbooks.filter((item) => item.status === 'pending_approval').length,
      running: snapshot.playbooks.filter((item) => item.status === 'published' || item.status === 'recommended').length,
    },
    items: snapshot.playbooks,
  };
}

export async function buildMobileApprovalsHomePayload() {
  const approvals = await listApprovals();
  return {
    summary: buildApprovalRiskSummary(approvals),
    items: approvals,
  };
}

export async function buildMobileApprovalDetailPayload(approvalId) {
  const [approvals, snapshot] = await Promise.all([
    listApprovals(),
    buildWorkflowSnapshot(),
  ]);
  const approval = approvals.find((item) => item.id === approvalId);
  if (!approval) return null;

  const sourceRun = approval.runId ? toArray(snapshot.runs).find((item) => item.id === approval.runId) || null : null;
  const playbookMatches = toArray(snapshot.playbooks).filter((item) =>
    approval.objectType === 'playbook' && (
      item.id === approval.objectName ||
      matchesObjectName(approval, item, ['title']) ||
      toArray(item.relatedApprovals).includes(approval.id)
    )
  );
  const eventMatches = toArray(snapshot.events).filter((item) =>
    approval.objectType === 'event' && (
      item.id === approval.objectName ||
      matchesObjectName(approval, item, ['title'])
    )
  );
  const referralMatches = toArray(snapshot.referrals).filter((item) =>
    (approval.objectType === 'referral' || approval.objectType === 'referral_program') && (
      item.id === approval.objectName ||
      matchesObjectName(approval, item, ['name', 'title'])
    )
  );
  const impactObjects = [...playbookMatches, ...eventMatches, ...referralMatches];

  return {
    approval,
    sourceRun,
    sourceSkillVersion: approval.sourceSkillVersion,
    primaryObject: impactObjects[0] || null,
    alternatives: approval.alternatives || [],
    impactSummary: {
      objectType: approval.objectType,
      objectName: approval.objectName,
      impact: approval.impact,
      linkedObjects: impactObjects,
    },
  };
}

export async function buildMobileMeHomePayload() {
  const [brandPayload, aggregate, aiConfig, brands] = await Promise.all([
    buildBrandModelingPayload('brand_default'),
    buildAiOpsAggregate({}),
    prisma.aiModelConfig.findUnique({ where: { id: 'default' } }).catch(() => null),
    listBrands(),
  ]);
  const brand = await getBrandById('brand_default');
  const documents = await listKnowledgeDocuments('brand_default');
  const skillInventory = buildSkillInventory(brand, documents);
  const statuses = buildSystemStatuses(aiConfig, brandPayload, skillInventory, aggregate);
  const recentAudits = await listGovernanceAuditLogs({ limit: 6 });

  return {
    statuses,
    engine: aggregate.engine,
    recentReports: toArray(aggregate.reportEntries).slice(0, 3),
    recentAudits,
    brandCount: brands.length,
    skillInventory: {
      recommended: skillInventory.recommended.length,
      installed: skillInventory.installed.length,
      pendingUpgrade: skillInventory.pendingUpgradeCount,
    },
  };
}

export async function buildMobileMeStatusPayload() {
  const [brandPayload, aggregate, aiConfig] = await Promise.all([
    buildBrandModelingPayload('brand_default'),
    buildAiOpsAggregate({}),
    prisma.aiModelConfig.findUnique({ where: { id: 'default' } }).catch(() => null),
  ]);
  const brand = await getBrandById('brand_default');
  const documents = await listKnowledgeDocuments('brand_default');
  const skillInventory = buildSkillInventory(brand, documents);
  return buildSystemStatuses(aiConfig, brandPayload, skillInventory, aggregate);
}

export async function buildMobileMeSkillsPayload() {
  const [brand, documents] = await Promise.all([
    getBrandById('brand_default'),
    listKnowledgeDocuments('brand_default'),
  ]);
  return buildSkillInventory(brand, documents);
}

export async function buildMobileMeSkillDetailPayload(skillId) {
  const payload = await buildMobileMeSkillsPayload();
  const skill = [...payload.recommended, ...payload.installed, ...flattenGroupedSkills(payload.groupedSkills)]
    .find((item) => item.id === skillId);
  return skill ? { skill, riskHints: payload.riskHints } : null;
}

export async function buildMobileBrandModelingPayload() {
  return buildBrandModelingPayload('brand_default');
}
