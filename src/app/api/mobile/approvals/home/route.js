import { NextResponse } from 'next/server';
import { buildMobileApprovalsHomePayload, buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileApprovalsHomePayload();
  return NextResponse.json(buildMobileEnvelope('approvals.home', data));
}
