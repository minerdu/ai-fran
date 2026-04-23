import { NextResponse } from 'next/server';
import { buildMobileEnvelope, buildMobileMeSkillDetailPayload } from '@/lib/mobileBff';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const data = await buildMobileMeSkillDetailPayload(params.skillId);
  if (!data) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  }
  return NextResponse.json(buildMobileEnvelope('me.skill.detail', data, { skillId: params.skillId }));
}
