import { NextResponse } from 'next/server';
import { buildMobileEnvelope } from '@/lib/mobileBff';
import { listIntegrationReadiness } from '@/lib/integrationReadinessService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await listIntegrationReadiness();
  return NextResponse.json(buildMobileEnvelope('me.integrations', payload, {
    total: payload.summary.total,
  }));
}
