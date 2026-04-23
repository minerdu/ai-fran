import { NextResponse } from 'next/server';
import { listGovernanceAuditLogs } from '@/lib/governanceStore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const limit = Number(searchParams.get('limit') || 50);

  const items = await listGovernanceAuditLogs({
    entityType: entityType || null,
    entityId: entityId || null,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
  });

  return NextResponse.json({
    success: true,
    items,
  });
}
