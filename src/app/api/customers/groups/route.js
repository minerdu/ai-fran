import { NextResponse } from 'next/server';
import { loadLeadGroups } from '@/lib/leadBff';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || '';
    const region = searchParams.get('region') || '';
    const groups = await loadLeadGroups({ city, region });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Failed to load lead groups:', error);
    return NextResponse.json({ error: 'Failed to load lead groups' }, { status: 500 });
  }
}
