import { NextResponse } from 'next/server';
import { assignLeadToManual, batchCreateInviteTasks, loadLeadList, markLeadException } from '@/lib/leadBff';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const leads = await loadLeadList({ filter, search });
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Failed to load customers:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const { action } = body;

    if (!ids.length || !action) {
      return NextResponse.json({ error: 'ids and action are required' }, { status: 400 });
    }

    if (action === 'mark_exception') {
      for (const id of ids) {
        await markLeadException(id, body.reason || '批量标记例外');
      }
    } else if (action === 'assign_manual') {
      for (const id of ids) {
        await assignLeadToManual(id, body.reason || '批量转人工跟进');
      }
    } else if (action === 'launch_invite') {
      await batchCreateInviteTasks(ids);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Failed to batch update customers:', error);
    return NextResponse.json({ error: 'Failed to batch update customers' }, { status: 500 });
  }
}
