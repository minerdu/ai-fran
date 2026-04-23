import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileWorkflowRunDetailPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await buildMobileWorkflowRunDetailPayload(params.runId);
  if (!data) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('workflow.run.detail', data, { runId: params.runId }));
}
