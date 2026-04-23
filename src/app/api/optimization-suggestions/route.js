import { NextResponse } from 'next/server';
import { buildAiOpsAggregate } from '@/lib/aiOpsAggregate';
import { updateOptimizationSuggestionState } from '@/lib/optimizationActions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const viewMode = searchParams.get('viewMode') || 'day';
  const payload = await buildAiOpsAggregate({ dateParam, viewMode });

  return NextResponse.json({
    reportDate: payload.report.reportDate,
    anomalies: payload.anomalies,
    optimizationSuggestions: payload.optimizationSuggestions,
    attribution: payload.attribution,
    stageAttribution: payload.stageAttribution,
  });
}

export async function POST(request) {
  try {
    const { id, action, reason } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    const supportedActions = new Set(['accept', 'dismiss', 'launch']);
    if (!supportedActions.has(action)) {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const result = await updateOptimizationSuggestionState(id, action, reason);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Failed to update optimization suggestion:', error);
    return NextResponse.json({ error: 'Failed to update optimization suggestion' }, { status: 500 });
  }
}
