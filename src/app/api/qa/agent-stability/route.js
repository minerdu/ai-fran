import { NextResponse } from 'next/server';
import { runAgentStabilityCheck } from '@/lib/agentStabilityService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await runAgentStabilityCheck();
    return NextResponse.json({
      success: result.healthy,
      ...result,
    }, {
      status: result.healthy ? 200 : 500,
    });
  } catch (error) {
    console.error('Agent stability check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
