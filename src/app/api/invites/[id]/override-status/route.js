import { NextResponse } from 'next/server';
import { overrideInviteStatus } from '@/lib/workflowActions';

export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    await overrideInviteStatus(params.id, body.status, {
      leadId: body.leadId,
      note: body.note,
    });

    return NextResponse.json({ success: true, inviteId: params.id, status: body.status });
  } catch (error) {
    console.error('Failed to override invite status:', error);
    return NextResponse.json({ error: 'Failed to override invite status' }, { status: 500 });
  }
}
