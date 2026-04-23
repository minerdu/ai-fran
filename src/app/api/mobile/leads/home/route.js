import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileLeadHomePayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';
  const search = searchParams.get('search') || '';
  const data = await buildMobileLeadHomePayload({ filter, search });
  return NextResponse.json(buildMobileEnvelope('leads.home', data, { filter, search }));
}
