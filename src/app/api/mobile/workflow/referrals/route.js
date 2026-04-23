import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileWorkflowReferralsPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileWorkflowReferralsPayload();
  return NextResponse.json(buildMobileEnvelope('workflow.referrals', data));
}
