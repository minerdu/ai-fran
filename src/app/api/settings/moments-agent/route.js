import { NextResponse } from 'next/server';

let momentsAgentConfig = {
  enabled: true,
  mode: 'semi_auto',
  accountScope: '总部品牌号 + 区域招商号',
  postingWindow: ['09:30', '12:00', '18:30'],
  weeklyVolume: 9,
  approvalMode: 'required',
  includeCaseStudy: true,
  includeInvitationCTA: true,
  includeMerchantProof: true,
  styleTone: '专业可信',
  forbiddenTopics: '保底收益、私下返利、未审批政策、区域独家口头承诺',
  promptTemplate:
    '围绕品牌实力、标杆加盟商案例、总部赋能、考察邀约和活动预告生成朋友圈内容。避免过度营销和收益承诺，默认附带下一步行动建议。',
  contentThemes: ['品牌势能', '加盟商案例', '总部考察', '招商会预告', '沉默激活'],
  appliedMembers: ['总部品牌号', '华南招商号', '华东招商号'],
};

export async function GET() {
  return NextResponse.json(momentsAgentConfig);
}

export async function PUT(request) {
  try {
    const body = await request.json();
    momentsAgentConfig = {
      ...momentsAgentConfig,
      ...body,
    };
    return NextResponse.json({ success: true, config: momentsAgentConfig });
  } catch (error) {
    console.error('Failed to save moments agent config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
