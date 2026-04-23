import { NextResponse } from 'next/server';
import { buildBrandModelingPayload, createKnowledgeDocument, listBrands, upsertBrand } from '@/lib/brandModelingService';

export async function GET() {
  try {
    const brands = await listBrands();
    return NextResponse.json({ items: brands });
  } catch (error) {
    console.error('Failed to load brands:', error);
    return NextResponse.json({ error: 'Failed to load brands' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || 'save_brand';
    const brandId = body.brandId || body.id || 'brand_default';

    if (action === 'add_document') {
      if (!body.document?.name) {
        return NextResponse.json({ error: 'document name is required' }, { status: 400 });
      }
      await createKnowledgeDocument(brandId, body.document);
    } else {
      await upsertBrand(body);
    }

    const payload = await buildBrandModelingPayload(brandId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to save brand modeling payload:', error);
    return NextResponse.json({ error: 'Failed to save brand modeling payload' }, { status: 500 });
  }
}
