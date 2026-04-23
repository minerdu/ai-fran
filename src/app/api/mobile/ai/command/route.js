import { NextResponse } from 'next/server';
import { POST as aiCommandPost } from '@/app/api/ai-command/route';
import { buildMobileEnvelope } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.command || !String(body.command).trim()) {
    return NextResponse.json({ error: 'command is required' }, { status: 400 });
  }

  const proxyRequest = new Request('http://localhost/api/ai-command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await aiCommandPost(proxyRequest);
  const payload = await response.json();

  return NextResponse.json(
    buildMobileEnvelope('ai.command', payload, {
      currentTab: body.current_tab || null,
      workspaceId: body.workspace_id || null,
      brandId: body.brand_id || null,
    }),
    { status: response.status }
  );
}
