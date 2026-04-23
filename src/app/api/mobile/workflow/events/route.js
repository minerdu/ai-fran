import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileWorkflowEventsPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileWorkflowEventsPayload();
  return NextResponse.json(buildMobileEnvelope('workflow.events', data));
}
