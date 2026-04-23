import { NextResponse } from 'next/server';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import { approveLaunchPlaybook, launchPlaybook, publishPlaybookVersion, submitPlaybookApproval } from '@/lib/workflowActions';

export async function GET() {
  const snapshot = await buildWorkflowSnapshot();

  return NextResponse.json({
    items: snapshot.playbooks,
    recommendedId: snapshot.playbooks.find((item) => item.status === 'recommended')?.id || snapshot.playbooks[0]?.id || null,
  });
}

export async function POST(request) {
  try {
    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    if (action === 'submit_approval') {
      await submitPlaybookApproval(id);
    } else if (action === 'approve_launch') {
      await approveLaunchPlaybook(id);
    } else if (action === 'launch') {
      await launchPlaybook(id);
    } else if (action === 'publish_version') {
      await publishPlaybookVersion(id);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to handle playbook action:', error);
    return NextResponse.json({ error: 'Failed to handle playbook action' }, { status: 500 });
  }
}
