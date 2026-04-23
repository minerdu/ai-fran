import { NextResponse } from 'next/server';
import { getAiCommandCatalog } from '@/lib/aiCommandCatalog';
import { buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    buildMobileEnvelope('ai.catalog', getAiCommandCatalog(), {
      protocolVersion: getAiCommandCatalog().version,
    })
  );
}
