import { NextResponse } from 'next/server';
import { batchDecideApprovals, handleApprovalAction, listApprovals } from '@/lib/approvalService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const items = await listApprovals();
    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to load approvals:', error);
    return NextResponse.json({ error: 'Failed to load approvals' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { ids, id, action, selectedAlternative, thresholdValue, reason } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    let items;
    if (Array.isArray(ids) && ids.length) {
      const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
      if (!nextStatus) {
        return NextResponse.json({ error: 'Unsupported batch action' }, { status: 400 });
      }
      items = await batchDecideApprovals(ids, nextStatus, reason || '');
    } else if (id) {
      const supported = new Set(['approve', 'reject', 'select_alternative', 'change_threshold']);
      if (!supported.has(action)) {
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
      }
      items = await handleApprovalAction(id, action, {
        selectedAlternative: selectedAlternative || '',
        thresholdValue: thresholdValue || '',
        reason: reason || '',
      });
    } else {
      return NextResponse.json({ error: 'id or ids is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('Failed to update approvals:', error);
    return NextResponse.json({ error: 'Failed to update approvals' }, { status: 500 });
  }
}
