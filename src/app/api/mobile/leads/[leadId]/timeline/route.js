import { NextResponse } from 'next/server';
import { buildMobileEnvelope } from '@/lib/mobileBff';
import { loadLeadTimeline } from '@/lib/leadBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await loadLeadTimeline(params.leadId);
  if (!data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('leads.timeline', data, { leadId: params.leadId }));
}
