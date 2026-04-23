import { NextResponse } from 'next/server';
import { buildBrandModelingPayload } from '@/lib/brandModelingService';

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const payload = await buildBrandModelingPayload(params.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to load brand detail:', error);
    return NextResponse.json({ error: 'Failed to load brand detail' }, { status: 500 });
  }
}
