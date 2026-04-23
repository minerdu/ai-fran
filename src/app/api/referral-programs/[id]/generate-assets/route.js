import { NextResponse } from 'next/server';
import { generateReferralAssets } from '@/lib/workflowActions';

export async function POST(_request, { params }) {
  try {
    const result = await generateReferralAssets(params.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to generate referral assets:', error);
    return NextResponse.json({ error: 'Failed to generate referral assets' }, { status: 500 });
  }
}
