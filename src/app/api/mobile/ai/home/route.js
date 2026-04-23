import { NextResponse } from 'next/server';
import { buildMobileAiHomePayload, buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileAiHomePayload();
  return NextResponse.json(buildMobileEnvelope('ai.home', data));
}
