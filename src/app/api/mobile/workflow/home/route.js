import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileWorkflowHomePayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileWorkflowHomePayload();
  return NextResponse.json(buildMobileEnvelope('workflow.home', data));
}
