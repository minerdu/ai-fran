import { NextResponse } from 'next/server';
import { buildMobileBrandModelingPayload, buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildMobileBrandModelingPayload();
  return NextResponse.json(buildMobileEnvelope('me.brand-modeling', data));
}
