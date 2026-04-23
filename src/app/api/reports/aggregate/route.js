import { NextResponse } from 'next/server';
import { buildAiOpsAggregate } from '@/lib/aiOpsAggregate';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const viewMode = searchParams.get('viewMode') || 'day';

  const payload = await buildAiOpsAggregate({ dateParam, viewMode });
  return NextResponse.json(payload);
}
