import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileWorkflowReferralDetailPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await buildMobileWorkflowReferralDetailPayload(params.programId);
  if (!data) {
    return NextResponse.json({ error: 'Referral program not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('workflow.referral.detail', data, { programId: params.programId }));
}
