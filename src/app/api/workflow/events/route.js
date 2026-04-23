import { NextResponse } from 'next/server';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import { checkInEventLead, launchEventSequence, overrideInviteStatus, triggerEventPostFollowup } from '@/lib/workflowActions';

export async function GET() {
  const snapshot = await buildWorkflowSnapshot();

  return NextResponse.json({
    items: snapshot.events,
    upcoming: snapshot.events.filter((item) => item.status === 'upcoming').length,
  });
}

export async function POST(request) {
  try {
    const { id, action, leadId, status, note } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    if (action === 'launch_sequence') {
      await launchEventSequence(id);
    } else if (action === 'post_followup') {
      await triggerEventPostFollowup(id);
    } else if (action === 'override_status') {
      if (!status) {
        return NextResponse.json({ error: 'status is required for override_status' }, { status: 400 });
      }
      await overrideInviteStatus(id, status, { leadId, note });
    } else if (action === 'check_in') {
      if (!leadId) {
        return NextResponse.json({ error: 'leadId is required for check_in' }, { status: 400 });
      }
      await checkInEventLead(id, leadId);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to handle event action:', error);
    return NextResponse.json({ error: 'Failed to handle event action' }, { status: 500 });
  }
}
