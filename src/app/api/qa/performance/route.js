import { NextResponse } from 'next/server';
import { runPerformanceBenchmarks } from '@/lib/performanceBenchmarks';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await runPerformanceBenchmarks();
  return NextResponse.json({
    success: true,
    ...payload,
  });
}
