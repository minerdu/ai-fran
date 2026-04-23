import { NextResponse } from 'next/server';
import { buildMobileApprovalDetailPayload, buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await buildMobileApprovalDetailPayload(params.approvalId);
  if (!data) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('approvals.detail', data, { approvalId: params.approvalId }));
}
