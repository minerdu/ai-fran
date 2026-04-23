import { NextResponse } from 'next/server';
import { runFullChainRegression } from '@/lib/fullChainRegressionService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await runFullChainRegression();
    return NextResponse.json({
      success: result.healthy,
      ...result,
    }, {
      status: result.healthy ? 200 : 500,
    });
  } catch (error) {
    console.error('Full chain regression failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
