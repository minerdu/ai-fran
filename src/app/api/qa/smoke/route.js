import { NextResponse } from 'next/server';
import { runQaSmokeChecks } from '@/lib/qaSmoke';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await runQaSmokeChecks();
  return NextResponse.json({
    success: payload.failed === 0,
    ...payload,
  }, {
    status: payload.failed === 0 ? 200 : 500,
  });
}
