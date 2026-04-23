import { NextResponse } from 'next/server';
import { loadLeadTimeline } from '@/lib/leadBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const payload = await loadLeadTimeline(params.id);
    if (!payload) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to load lead timeline:', error);
    return NextResponse.json({ error: 'Failed to load lead timeline' }, { status: 500 });
  }
}
