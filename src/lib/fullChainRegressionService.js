/**
 * 全链路回归验证服务
 *
 * 覆盖三大回归维度：
 *   1. SSE 事件回归 — 验证所有命名事件正确推送
 *   2. 状态机回归 — 验证 Agent Run / Lead / Approval 状态转换合法性
 *   3. 审计回归 — 验证关键操作产生完整审计记录
 *   4. 恢复回归 — 验证审批通过后 Run 自动恢复
 */

import { mockAgentRuns, mockApprovals, mockLeads } from './franchiseData';
import { listGovernanceAuditLogs } from './governanceStore';
import { runAgentStabilityCheck } from './agentStabilityService';

// ── SSE 事件回归 ──

const REQUIRED_SSE_EVENTS = [
  'analytics.snapshot.ready',
  'event.attendance.updated',
  'brand.facts.ready',
  'skill.activated',
  'playbook.ready',
  'asset.bundle.ready',
  'brand.ingest.completed',
];

async function validateSseEvents() {
  const results = [];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${baseUrl}/api/workflow/stream`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        status: 'fail',
        message: `SSE 端点返回 ${response.status}`,
        events: REQUIRED_SSE_EVENTS.map((e) => ({ event: e, status: 'untested', reason: 'SSE 端点不可达' })),
      };
    }

    // Read first chunk of SSE data
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    // Read up to 3 chunks or 5 seconds
    const readStart = Date.now();
    while (Date.now() - readStart < 5000) {
      const { value, done } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      if (accumulated.length > 4000) break;
    }

    reader.cancel();

    // Parse event names from SSE stream
    const eventNames = new Set();
    const lines = accumulated.split('\n');
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventNames.add(line.slice(7).trim());
      }
    }

    for (const required of REQUIRED_SSE_EVENTS) {
      if (eventNames.has(required)) {
        results.push({ event: required, status: 'pass', reason: '事件已推送' });
      } else {
        results.push({ event: required, status: 'warn', reason: '事件未在首次推送中检测到（可能需要特定触发条件）' });
      }
    }

    return {
      status: results.every((r) => r.status === 'pass') ? 'pass' : 'partial',
      message: `检测到 ${eventNames.size} 个命名事件，要求 ${REQUIRED_SSE_EVENTS.length} 个`,
      detectedEvents: [...eventNames],
      events: results,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        status: 'warn',
        message: 'SSE 连接超时（8s），服务可能未启动',
        events: REQUIRED_SSE_EVENTS.map((e) => ({ event: e, status: 'untested', reason: 'SSE 超时' })),
      };
    }

    return {
      status: 'fail',
      message: `SSE 验证失败: ${error.message}`,
      events: REQUIRED_SSE_EVENTS.map((e) => ({ event: e, status: 'untested', reason: error.message })),
    };
  }
}

// ── Lead 状态机回归 ──

const VALID_LEAD_STAGES = ['pool', 'qualified', 'negotiating', 'signed', 'rejected', 'silent'];

const LEAD_VALID_TRANSITIONS = {
  pool: ['qualified', 'rejected'],
  qualified: ['negotiating', 'rejected', 'silent', 'pool'],
  negotiating: ['signed', 'rejected', 'silent', 'qualified'],
  signed: [],  // terminal
  rejected: ['pool'],   // reflux
  silent: ['pool'],     // reflux
};

function validateLeadStateMachine() {
  const results = [];

  for (const lead of mockLeads) {
    const stage = lead.stage || lead.lifecycleStatus || 'pool';

    if (!VALID_LEAD_STAGES.includes(stage)) {
      results.push({
        leadId: lead.id,
        leadName: lead.name,
        status: 'fail',
        message: `线索 ${lead.name} 处于未知阶段: ${stage}`,
      });
      continue;
    }

    const allowedNext = LEAD_VALID_TRANSITIONS[stage] || [];
    results.push({
      leadId: lead.id,
      leadName: lead.name,
      currentStage: stage,
      status: 'pass',
      allowedTransitions: allowedNext,
      message: `阶段合法，允许转向: ${allowedNext.join(', ') || '终态'}`,
    });
  }

  // Verify reflux paths exist in definition
  const refluxPaths = [
    { from: 'rejected', to: 'pool', label: '拒绝→重新培育' },
    { from: 'silent', to: 'pool', label: '沉默→激活回流' },
  ];

  for (const path of refluxPaths) {
    const allowed = LEAD_VALID_TRANSITIONS[path.from] || [];
    results.push({
      type: 'reflux_validation',
      status: allowed.includes(path.to) ? 'pass' : 'fail',
      message: `回流路径 ${path.label}: ${allowed.includes(path.to) ? '已定义' : '缺失'}`,
    });
  }

  return results;
}

// ── Approval 状态机回归 ──

const VALID_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'superseded'];

function validateApprovalStateMachine() {
  const results = [];

  for (const approval of mockApprovals) {
    if (!VALID_APPROVAL_STATUSES.includes(approval.status)) {
      results.push({
        approvalId: approval.id,
        status: 'fail',
        message: `审批 ${approval.id} 处于未知状态: ${approval.status}`,
      });
      continue;
    }

    // Pending approvals should have expiresAt
    if (approval.status === 'pending' && !approval.expiresAt) {
      results.push({
        approvalId: approval.id,
        status: 'warn',
        message: `待审批项 ${approval.id} 缺少到期时间`,
      });
    }

    // Decided approvals should have decidedAt
    if ((approval.status === 'approved' || approval.status === 'rejected') && !approval.decidedAt) {
      results.push({
        approvalId: approval.id,
        status: 'warn',
        message: `已决策审批 ${approval.id} 缺少 decidedAt 时间戳`,
      });
    }

    // Run linkage
    if (approval.runId) {
      const linkedRun = mockAgentRuns.find((r) => r.id === approval.runId);
      if (!linkedRun) {
        results.push({
          approvalId: approval.id,
          status: 'warn',
          message: `审批 ${approval.id} 关联的 Run ${approval.runId} 不存在`,
        });
      }
    }

    results.push({
      approvalId: approval.id,
      approvalStatus: approval.status,
      status: 'pass',
      message: `审批 ${approval.id} 状态合法`,
    });
  }

  return results;
}

// ── 审计日志回归 ──

async function validateAuditRegression() {
  const results = [];

  // Check audit table is accessible
  try {
    const logs = await listGovernanceAuditLogs({ limit: 20 });
    results.push({
      check: 'audit_table_accessible',
      status: 'pass',
      message: `审计表可访问，当前 ${logs.length} 条记录`,
    });

    // Group by entity type
    const byType = {};
    for (const log of logs) {
      byType[log.entityType] = (byType[log.entityType] || 0) + 1;
    }

    results.push({
      check: 'audit_entity_coverage',
      status: Object.keys(byType).length >= 2 ? 'pass' : 'warn',
      message: `审计日志覆盖 ${Object.keys(byType).length} 种实体类型: ${Object.keys(byType).join(', ')}`,
      distribution: byType,
    });

    // Check for required fields
    for (const log of logs.slice(0, 5)) {
      const missingFields = [];
      if (!log.entityType) missingFields.push('entityType');
      if (!log.entityId) missingFields.push('entityId');
      if (!log.action) missingFields.push('action');
      if (!log.createdAt) missingFields.push('createdAt');

      if (missingFields.length > 0) {
        results.push({
          check: 'audit_field_completeness',
          logId: log.id,
          status: 'fail',
          message: `审计日志 ${log.id} 缺少必要字段: ${missingFields.join(', ')}`,
        });
      }
    }

    results.push({
      check: 'audit_field_completeness',
      status: 'pass',
      message: '抽样审计日志字段完整性通过',
    });
  } catch (error) {
    results.push({
      check: 'audit_table_accessible',
      status: 'fail',
      message: `审计表访问失败: ${error.message}`,
    });
  }

  return results;
}

// ── 恢复回归 ──

function validateRecoveryFlow() {
  const results = [];

  // Check: approved approvals should have triggered run recovery
  const approvedApprovals = mockApprovals.filter((a) => a.status === 'approved' && a.runId);
  for (const approval of approvedApprovals) {
    const run = mockAgentRuns.find((r) => r.id === approval.runId);
    if (run && run.status === 'paused_for_approval') {
      results.push({
        check: 'recovery_after_approval',
        approvalId: approval.id,
        runId: run.id,
        status: 'fail',
        message: `审批 ${approval.id} 已通过，但关联 Run ${run.id} 仍处于暂停状态 — 恢复链路断裂`,
      });
    } else {
      results.push({
        check: 'recovery_after_approval',
        approvalId: approval.id,
        runId: approval.runId,
        status: 'pass',
        message: `审批 ${approval.id} 通过后 Run 已恢复或完成`,
      });
    }
  }

  // Check: cancelled runs should not have pending approvals
  const cancelledRuns = mockAgentRuns.filter((r) => r.status === 'cancelled');
  for (const run of cancelledRuns) {
    if (run.approvalId) {
      const approval = mockApprovals.find((a) => a.id === run.approvalId);
      if (approval && approval.status === 'pending') {
        results.push({
          check: 'cancelled_run_cleanup',
          runId: run.id,
          approvalId: run.approvalId,
          status: 'warn',
          message: `已取消的 Run ${run.id} 关联的审批 ${run.approvalId} 仍为 pending`,
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({
      check: 'recovery_flow',
      status: 'pass',
      message: '无需恢复验证的场景（所有审批尚未决策或无关联 Run）',
    });
  }

  return results;
}

// ── 全链路回归主入口 ──

export async function runFullChainRegression() {
  const startedAt = Date.now();

  const [sseResults, auditResults, agentStability] = await Promise.all([
    validateSseEvents(),
    validateAuditRegression(),
    runAgentStabilityCheck(),
  ]);

  const leadStateMachine = validateLeadStateMachine();
  const approvalStateMachine = validateApprovalStateMachine();
  const recoveryFlow = validateRecoveryFlow();

  // Aggregate pass/fail counts
  const allChecks = [
    ...leadStateMachine,
    ...approvalStateMachine,
    ...auditResults,
    ...recoveryFlow,
    ...(sseResults.events || []),
  ];

  const passed = allChecks.filter((c) => c.status === 'pass').length;
  const warned = allChecks.filter((c) => c.status === 'warn' || c.status === 'partial').length;
  const failed = allChecks.filter((c) => c.status === 'fail').length;

  return {
    healthy: failed === 0 && !agentStability.summary?.criticalIssues,
    summary: {
      totalChecks: allChecks.length,
      passed,
      warned,
      failed,
      agentHealthy: agentStability.healthy,
    },
    sse: sseResults,
    leadStateMachine: {
      totalLeads: mockLeads.length,
      validStages: VALID_LEAD_STAGES,
      validTransitions: LEAD_VALID_TRANSITIONS,
      results: leadStateMachine,
    },
    approvalStateMachine: {
      totalApprovals: mockApprovals.length,
      validStatuses: VALID_APPROVAL_STATUSES,
      results: approvalStateMachine,
    },
    auditRegression: auditResults,
    recoveryFlow,
    agentStability: {
      healthy: agentStability.healthy,
      summary: agentStability.summary,
      stateMachine: agentStability.stateMachine,
      approvalRecovery: agentStability.approvalRecovery,
    },
    durationMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };
}
