import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileMeStatusPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileMeStatusPayload();
  return NextResponse.json(buildMobileEnvelope('me.status', data));
}
