import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileMeSkillsPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileMeSkillsPayload();
  return NextResponse.json(buildMobileEnvelope('me.skills', data));
}
