import { NextResponse } from 'next/server';
import { buildScaledReport } from '@/lib/aiOpsAggregate';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const viewMode = searchParams.get('viewMode') || 'day';
  const report = buildScaledReport({ dateParam, viewMode });

  return NextResponse.json({
    ...report,
    totalCustomers: report.totalLeads,
    newCustomers: report.newLeads,
    keyCustomers: report.keyLeads,
  });
}
