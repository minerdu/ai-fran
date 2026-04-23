import { buildAiOpsAggregate } from './aiOpsAggregate';
import { listIntegrationReadiness } from './integrationReadinessService';
import { listGovernanceAuditLogs } from './governanceStore';
import {
  buildMobileAiHomePayload,
  buildMobileApprovalsHomePayload,
  buildMobileLeadHomePayload,
  buildMobileMeHomePayload,
  buildMobileWorkflowHomePayload,
} from './mobileBff';
import { buildWorkflowSnapshot } from './workflowBff';

async function runCheck(id, label, task) {
  const startedAt = Date.now();
  try {
    const detail = await task();
    return {
      id,
      label,
      status: 'pass',
      durationMs: Date.now() - startedAt,
      detail,
    };
  } catch (error) {
    return {
      id,
      label,
      status: 'fail',
      durationMs: Date.now() - startedAt,
      detail: error.message,
    };
  }
}

export async function runQaSmokeChecks() {
  const checks = [
    runCheck('mobile_leads_home', '移动端线索首页聚合', async () => {
      const payload = await buildMobileLeadHomePayload({});
      return `线索 ${payload.summary.total} 条，高意向 ${payload.summary.highIntentCount} 条`;
    }),
    runCheck('mobile_workflow_home', '移动端工作流首页聚合', async () => {
      const payload = await buildMobileWorkflowHomePayload();
      return `待办 ${payload.summary.pendingTodos} 条，运行中 ${payload.summary.runningRuns} 条`;
    }),
    runCheck('mobile_ai_home', '移动端 AI 首页聚合', async () => {
      const payload = await buildMobileAiHomePayload();
      return `推荐动作 ${payload.recommendations.length} 条，自主 Agent ${payload.autonomousAgents.length} 个`;
    }),
    runCheck('mobile_approvals_home', '移动端审批首页聚合', async () => {
      const payload = await buildMobileApprovalsHomePayload();
      return `待审批 ${payload.summary.total} 条，高风险 ${payload.summary.highRisk} 条`;
    }),
    runCheck('mobile_me_home', '移动端我的首页聚合', async () => {
      const payload = await buildMobileMeHomePayload();
      return `最近报告 ${payload.recentReports.length} 条，审计 ${payload.recentAudits.length} 条`;
    }),
    runCheck('workflow_snapshot', '工作流快照构建', async () => {
      const snapshot = await buildWorkflowSnapshot();
      return `方案 ${snapshot.playbooks.length} / 活动 ${snapshot.events.length} / 裂变 ${snapshot.referrals.length} / Run ${snapshot.runs.length}`;
    }),
    runCheck('ai_aggregate', 'AI 报告聚合构建', async () => {
      const aggregate = await buildAiOpsAggregate({});
      return `异常 ${aggregate.anomalies.length} 条，优化建议 ${aggregate.optimizationSuggestions.length} 条`;
    }),
    runCheck('governance_audit', '治理审计读取', async () => {
      const logs = await listGovernanceAuditLogs({ limit: 10 });
      return `最近审计 ${logs.length} 条`;
    }),
    runCheck('integration_readiness', '外部渠道联调准备度', async () => {
      const payload = await listIntegrationReadiness();
      return `渠道 ${payload.summary.total} 个，已就绪 ${payload.summary.ready} 个，部分配置 ${payload.summary.partial} 个`;
    }),
  ];

  const results = await Promise.all(checks);
  return {
    passed: results.filter((item) => item.status === 'pass').length,
    failed: results.filter((item) => item.status === 'fail').length,
    results,
    generatedAt: new Date().toISOString(),
  };
}
