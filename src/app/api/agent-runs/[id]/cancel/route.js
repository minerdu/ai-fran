import { NextResponse } from 'next/server';
import { cancelWorkflowRun } from '@/lib/workflowActions';

export async function POST(_request, { params }) {
  try {
    await cancelWorkflowRun(params.id);
    return NextResponse.json({ success: true, id: params.id, action: 'cancel' });
  } catch (error) {
    console.error('Failed to cancel agent run:', error);
    return NextResponse.json({ error: 'Failed to cancel agent run' }, { status: 500 });
  }
}
