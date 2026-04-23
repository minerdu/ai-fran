import { NextResponse } from 'next/server';
import { assignLeadToManual, loadLeadDetail, markLeadException, updateLeadLifecycleStage } from '@/lib/leadBff';
import { mockLeads, mockMessages } from '@/lib/franchiseData';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const lead = await loadLeadDetail(params.id);
    if (!lead) {
      const mockLead = mockLeads.find(l => l.id === params.id);
      if (mockLead) {
        return NextResponse.json({
          ...mockLead,
          lifecycleStatus: mockLead.stage,
          valueScore: mockLead.investCapability,
          demandScore: mockLead.urgency,
          satisfactionScore: mockLead.industryFit,
          messages: mockMessages[mockLead.id] || [],
          tasks: [],
          stageHistory: [],
          suggestedActions: ['安排面谈', '发送最新资料'],
        });
      }
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error) {
    console.error('Failed to load lead detail:', error);
    return NextResponse.json({ error: 'Failed to load lead detail' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { action, reason, nextStage } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'mark_exception') {
      await markLeadException(params.id, reason || '人工标记例外');
    } else if (action === 'assign_manual') {
      await assignLeadToManual(params.id, reason || '转人工跟进');
    } else if (action === 'update_stage') {
      if (!nextStage) {
        return NextResponse.json({ error: 'nextStage is required' }, { status: 400 });
      }
      await updateLeadLifecycleStage(params.id, nextStage, reason || `人工更新线索阶段为 ${nextStage}`);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update lead detail:', error);
    return NextResponse.json({ error: 'Failed to update lead detail' }, { status: 500 });
  }
}
