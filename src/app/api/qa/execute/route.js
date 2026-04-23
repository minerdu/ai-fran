import { NextResponse } from 'next/server';
import { runQaExecution } from '@/lib/qaExecutionService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await runQaExecution();
  return NextResponse.json({
    success: payload.smoke.failed === 0,
    ...payload,
  });
}
