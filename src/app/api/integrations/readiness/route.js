import { NextResponse } from 'next/server';
import { listIntegrationReadiness, testIntegrationReadiness } from '@/lib/integrationReadinessService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await listIntegrationReadiness();
  return NextResponse.json({
    success: true,
    ...payload,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.channel) {
    return NextResponse.json({ success: false, message: 'channel is required' }, { status: 400 });
  }

  try {
    const result = await testIntegrationReadiness(body.channel);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message || 'integration test failed',
    }, { status: 500 });
  }
}
