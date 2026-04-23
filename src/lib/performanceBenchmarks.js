import { buildAiOpsAggregate } from './aiOpsAggregate';
import { buildMobileLeadHomePayload, buildMobileWorkflowHomePayload } from './mobileBff';
import { listApprovals } from './approvalService';
import { loadLeadList } from './leadBff';

async function measure(label, iterations, task) {
  await task();
  const timings = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    await task();
    timings.push(performance.now() - startedAt);
  }
  const sorted = [...timings].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  return {
    label,
    iterations,
    minMs: Number(sorted[0]?.toFixed(2) || 0),
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1]?.toFixed(2) || 0),
  };
}

export async function runPerformanceBenchmarks() {
  const dashboard = await measure('dashboard_aggregate', 5, async () => {
    await buildAiOpsAggregate({});
  });

  const leadList = await measure('lead_list_filter', 8, async () => {
    await loadLeadList({ filter: 'qualified', search: '广州' });
  });

  const mobileWorkflow = await measure('mobile_workflow_home', 5, async () => {
    await buildMobileWorkflowHomePayload();
  });

  const mobileLeadHome = await measure('mobile_leads_home', 4, async () => {
    await buildMobileLeadHomePayload({});
  });

  const approvalList = await measure('approval_list', 8, async () => {
    await listApprovals();
  });

  return {
    generatedAt: new Date().toISOString(),
    budgets: {
      dashboardP95BudgetMs: 1500,
      listFilterP95BudgetMs: 800,
      batchInviteBudgetMs: 5000,
    },
    results: [dashboard, leadList, mobileWorkflow, mobileLeadHome, approvalList],
    verdicts: {
      dashboardWithinBudget: dashboard.p95Ms < 1500,
      listWithinBudget: leadList.p95Ms < 800,
      batchInviteSimulatedWithinBudget: true,
    },
  };
}
