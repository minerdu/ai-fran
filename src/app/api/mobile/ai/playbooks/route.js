import { NextResponse } from 'next/server';
import { buildMobileAiPlaybooksPayload, buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileAiPlaybooksPayload();
  return NextResponse.json(buildMobileEnvelope('ai.playbooks', data));
}
