import { NextResponse } from 'next/server';
import { getQuickActions } from '@/lib/phase2WorkflowData';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';

export async function GET() {
  const snapshot = await buildWorkflowSnapshot();

  return NextResponse.json({
    summary: snapshot.summary,
    opsBoard: snapshot.opsBoard,
    artifacts: snapshot.artifacts,
    artifactSummary: snapshot.artifactSummary,
    queue: snapshot.queue,
    quickActions: getQuickActions(),
    playbooks: snapshot.playbooks,
    events: snapshot.events,
    referrals: snapshot.referrals,
    runs: snapshot.runs,
  });
}
