import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileWorkflowEventDetailPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await buildMobileWorkflowEventDetailPayload(params.eventId);
  if (!data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('workflow.event.detail', data, { eventId: params.eventId }));
}
