import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileLeadDetailPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await buildMobileLeadDetailPayload(params.leadId);
  if (!data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('leads.detail', data, { leadId: params.leadId }));
}
