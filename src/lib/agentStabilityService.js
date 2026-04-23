/**
 * Agent 全链路稳定性服务
 *
 * 负责验证 5 类 Agent（Planner / Lead Scoring / Invite / Referral / Optimization）
 * 的端到端编排闭环：
 *   1. 状态机合法转换校验
 *   2. 审批断点恢复验证
 *   3. 错误重试与降级策略
 *   4. 审计日志完整性检查
 */

import { mockAgentRuns, mockApprovals } from './franchiseData';
import { listGovernanceAuditLogs, appendGovernanceAudit } from './governanceStore';

// ── Agent 状态机定义 ──

const VALID_TRANSITIONS = {
  draft: ['running', 'cancelled'],
  running: ['completed', 'paused_for_approval', 'failed', 'cancelled'],
  paused_for_approval: ['running', 'cancelled', 'failed'],
  failed: ['running', 'cancelled'],        // retry → running
  completed: [],                            // terminal
  cancelled: [],                            // terminal
};

const AGENT_TYPES = [
  { key: 'planner', label: 'Playbook Planner', requiredStages: ['lead_capture', 'policy_match', 'sign_push'] },
  { key: 'lead_scoring', label: 'Lead Scoring', requiredStages: ['qualification', 'nurturing'] },
  { key: 'invite', label: 'Invite Agent', requiredStages: ['visit_invite', 'event_followup'] },
  { key: 'referral', label: 'Referral Design Agent', requiredStages: ['sign_push'] },
  { key: 'optimization', label: 'Optimization Agent', requiredStages: ['silent_wake', 'negotiation'] },
];

// ── 状态机校验 ──

function validateTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return { valid: false, reason: `未知来源状态: ${fromStatus}` };
  if (!allowed.includes(toStatus)) {
    return { valid: false, reason: `不允许从 ${fromStatus} 转换到 ${toStatus}，合法目标: ${allowed.join(', ')}` };
  }
  return { valid: true, reason: null };
}

function validateRunStateMachine(run) {
  const issues = [];

  // Check current status is known
  if (!VALID_TRANSITIONS[run.status]) {
    issues.push({ severity: 'error', message: `Run ${run.id} 存在未知状态: ${run.status}` });
  }

  // Check approval linkage
  if (run.status === 'paused_for_approval' && !run.approvalId) {
    issues.push({ severity: 'warning', message: `Run ${run.id} 处于审批暂停但缺少 approvalId 关联` });
  }

  // Check paused runs have matching pending approval
  if (run.status === 'paused_for_approval' && run.approvalId) {
    const approval = mockApprovals.find((a) => a.id === run.approvalId);
    if (!approval) {
      issues.push({ severity: 'error', message: `Run ${run.id} 关联的审批 ${run.approvalId} 不存在` });
    } else if (approval.status !== 'pending') {
      issues.push({
        severity: 'warning',
        message: `Run ${run.id} 仍在暂停，但关联审批 ${run.approvalId} 状态已为 ${approval.status}，应触发恢复`,
      });
    }
  }

  // Check steps consistency
  if (run.steps && run.currentStep) {
    if (!run.steps.includes(run.currentStep)) {
      issues.push({ severity: 'warning', message: `Run ${run.id} 的 currentStep "${run.currentStep}" 不在 steps 列表中` });
    }
  }

  return issues;
}

// ── 审批断点恢复验证 ──

function validateApprovalRecovery() {
  const issues = [];
  const pausedRuns = mockAgentRuns.filter((r) => r.status === 'paused_for_approval');

  for (const run of pausedRuns) {
    if (!run.approvalId) {
      issues.push({
        severity: 'error',
        runId: run.id,
        message: `暂停的 Run 缺少审批 ID，无法恢复`,
      });
      continue;
    }

    const approval = mockApprovals.find((a) => a.id === run.approvalId);
    if (!approval) {
      issues.push({
        severity: 'error',
        runId: run.id,
        message: `关联审批 ${run.approvalId} 未找到`,
      });
      continue;
    }

    // If approval is decided but run is still paused → recovery not triggered
    if (approval.status === 'approved' || approval.status === 'rejected') {
      issues.push({
        severity: 'critical',
        runId: run.id,
        message: `审批 ${approval.id} 已 ${approval.status}，但 Run ${run.id} 仍处于 paused_for_approval — 恢复链路断裂`,
      });
    }
  }

  return issues;
}

// ── Agent 覆盖度检查 ──

function validateAgentCoverage(runs) {
  const issues = [];
  const coveredStages = new Set();

  runs.forEach((run) => {
    if (run.stage) coveredStages.add(run.stage);
  });

  for (const agentType of AGENT_TYPES) {
    const missingStages = agentType.requiredStages.filter((s) => !coveredStages.has(s));
    if (missingStages.length > 0) {
      issues.push({
        severity: 'info',
        agentType: agentType.label,
        message: `${agentType.label} 未覆盖的旅程环节: ${missingStages.join(', ')}`,
      });
    }
  }

  return issues;
}

// ── 审计日志完整性 ──

async function validateAuditCompleteness() {
  const issues = [];

  const requiredEntityTypes = [
    'workflow_playbook',
    'workflow_event',
    'workflow_referral',
    'workflow_run',
    'approval',
    'ai_command',
  ];

  for (const entityType of requiredEntityTypes) {
    try {
      const logs = await listGovernanceAuditLogs({ entityType, limit: 5 });
      if (logs.length === 0) {
        issues.push({
          severity: 'warning',
          entityType,
          message: `审计日志中缺少 ${entityType} 类型记录 — 可能从未触发过该类操作`,
        });
      }
    } catch (error) {
      issues.push({
        severity: 'error',
        entityType,
        message: `读取 ${entityType} 审计日志失败: ${error.message}`,
      });
    }
  }

  return issues;
}

// ── 重试与降级策略 ──

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // ms

export async function retryWithBackoff(taskFn, label = 'task') {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await taskFn();
    } catch (error) {
      lastError = error;
      console.warn(`[AgentStability] ${label} 第 ${attempt + 1} 次重试失败:`, error.message);

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }

  // All retries exhausted — log to audit and throw
  try {
    await appendGovernanceAudit({
      scope: 'agent_stability',
      entityType: 'agent_retry',
      entityId: label,
      action: 'retry_exhausted',
      operator: 'system',
      reason: `${label} 在 ${MAX_RETRIES} 次重试后仍失败: ${lastError?.message}`,
      metadata: { maxRetries: MAX_RETRIES, lastError: lastError?.message },
    });
  } catch (_auditError) {
    // Swallow audit write errors
  }

  throw lastError;
}

// ── 全链路稳定性验证主入口 ──

export async function runAgentStabilityCheck() {
  const startedAt = Date.now();
  const results = {
    stateMachine: [],
    approvalRecovery: [],
    agentCoverage: [],
    auditCompleteness: [],
  };

  // 1. State machine validation
  for (const run of mockAgentRuns) {
    const issues = validateRunStateMachine(run);
    results.stateMachine.push({
      runId: run.id,
      agentType: run.agentType,
      status: run.status,
      issues,
      healthy: issues.filter((i) => i.severity === 'error' || i.severity === 'critical').length === 0,
    });
  }

  // 2. Approval recovery validation
  results.approvalRecovery = validateApprovalRecovery();

  // 3. Agent coverage check
  results.agentCoverage = validateAgentCoverage(mockAgentRuns);

  // 4. Audit completeness
  results.auditCompleteness = await validateAuditCompleteness();

  // Summary
  const allIssues = [
    ...results.stateMachine.flatMap((r) => r.issues),
    ...results.approvalRecovery,
    ...results.agentCoverage,
    ...results.auditCompleteness,
  ];

  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;

  return {
    healthy: criticalCount === 0 && errorCount === 0,
    summary: {
      totalRuns: mockAgentRuns.length,
      healthyRuns: results.stateMachine.filter((r) => r.healthy).length,
      criticalIssues: criticalCount,
      errorIssues: errorCount,
      warningIssues: warningCount,
      infoIssues: allIssues.filter((i) => i.severity === 'info').length,
    },
    stateMachine: results.stateMachine,
    approvalRecovery: results.approvalRecovery,
    agentCoverage: results.agentCoverage,
    auditCompleteness: results.auditCompleteness,
    validTransitions: VALID_TRANSITIONS,
    agentTypes: AGENT_TYPES,
    durationMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };
}

// ── 状态机转换执行（带守卫） ──

export function guardedTransition(run, toStatus) {
  const validation = validateTransition(run.status, toStatus);
  if (!validation.valid) {
    throw new Error(`[AgentStability] 非法状态转换: Run ${run.id} ${run.status} → ${toStatus}. ${validation.reason}`);
  }
  return { ...run, status: toStatus, previousStatus: run.status, transitionedAt: new Date().toISOString() };
}
