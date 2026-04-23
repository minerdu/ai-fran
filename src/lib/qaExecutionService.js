import { getQaRegressionMatrix } from './qaRegressionCases';
import { runPerformanceBenchmarks } from './performanceBenchmarks';
import { runQaSmokeChecks } from './qaSmoke';
import { runAgentStabilityCheck } from './agentStabilityService';
import { runFullChainRegression } from './fullChainRegressionService';

export async function runQaExecution() {
  const [smoke, performance, regression, agentStability, fullChain] = await Promise.all([
    runQaSmokeChecks(),
    runPerformanceBenchmarks(),
    Promise.resolve(getQaRegressionMatrix()),
    runAgentStabilityCheck().catch((err) => ({ healthy: false, error: err.message })),
    runFullChainRegression().catch((err) => ({ healthy: false, error: err.message })),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    smoke,
    performance,
    regression,
    agentStability,
    fullChain,
    summary: {
      smokePassed: smoke.passed,
      smokeFailed: smoke.failed,
      dashboardWithinBudget: performance.verdicts.dashboardWithinBudget,
      listWithinBudget: performance.verdicts.listWithinBudget,
      regressionCaseCount:
        regression.smokeFocus.length +
        regression.endToEnd.length +
        (regression.agentStability || []).length +
        (regression.fullChainRegression || []).length +
        regression.nonFunctional.length +
        (regression.uat || []).length,
      agentStabilityHealthy: agentStability.healthy ?? false,
      fullChainHealthy: fullChain.healthy ?? false,
    },
  };
}
