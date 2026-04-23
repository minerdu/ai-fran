import { NextResponse } from 'next/server';
import { buildWorkflowSnapshot } from '@/lib/workflowBff';
import { generateReferralAssets, publishReferralProgram, settleReferralReward, submitReferralApproval } from '@/lib/workflowActions';

export async function GET() {
  const snapshot = await buildWorkflowSnapshot();

  return NextResponse.json({
    items: snapshot.referrals,
    active: snapshot.referrals.filter((item) => item.status === 'active').length,
    pendingApproval: snapshot.referrals.filter((item) => item.status === 'pending_approval').length,
  });
}

export async function POST(request) {
  try {
    const { id, action, leadId } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    if (action === 'submit_approval') {
      await submitReferralApproval(id);
    } else if (action === 'publish') {
      await publishReferralProgram(id);
    } else if (action === 'generate_assets') {
      await generateReferralAssets(id);
    } else if (action === 'settle_reward') {
      if (!leadId) {
        return NextResponse.json({ error: 'leadId is required for settle_reward' }, { status: 400 });
      }
      await settleReferralReward(id, leadId);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to handle referral action:', error);
    return NextResponse.json({ error: 'Failed to handle referral action' }, { status: 500 });
  }
}
