import { NextResponse } from 'next/server';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import { cancelWorkflowRun, continueWorkflowRun, retryWorkflowRun } from '@/lib/workflowActions';

export async function GET() {
  const snapshot = await buildWorkflowSnapshot();
  const items = snapshot.runs;

  return NextResponse.json({
    items,
    active: items.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length,
    pausedForApproval: items.filter((item) => item.status === 'paused_for_approval').length,
  });
}

export async function POST(request) {
  try {
    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    if (action === 'continue') {
      await continueWorkflowRun(id);
    } else if (action === 'retry') {
      await retryWorkflowRun(id);
    } else if (action === 'cancel') {
      await cancelWorkflowRun(id);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to handle run action:', error);
    return NextResponse.json({ error: 'Failed to handle run action' }, { status: 500 });
  }
}
