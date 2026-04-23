import { NextResponse } from 'next/server';
import { getQaRegressionMatrix } from '@/lib/qaRegressionCases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = getQaRegressionMatrix();
  return NextResponse.json({
    success: true,
    ...payload,
  });
}
