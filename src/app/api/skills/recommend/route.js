import { NextResponse } from 'next/server';
import { getBrandById, listKnowledgeDocuments, recommendSkillsForBrand } from '@/lib/brandModelingService';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const brandId = body.brandId || 'brand_default';
    const [brand, documents] = await Promise.all([
      getBrandById(brandId),
      listKnowledgeDocuments(brandId),
    ]);

    const payload = recommendSkillsForBrand(brand, documents);
    return NextResponse.json({
      brand,
      documents,
      ...payload,
    });
  } catch (error) {
    console.error('Failed to recommend skills:', error);
    return NextResponse.json({ error: 'Failed to recommend skills' }, { status: 500 });
  }
}
