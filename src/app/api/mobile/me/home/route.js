import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileMeHomePayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileMeHomePayload();
  return NextResponse.json(buildMobileEnvelope('me.home', data));
}
