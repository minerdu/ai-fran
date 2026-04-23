import { NextResponse } from 'next/server';

const MOCK_MATERIALS = [
  {
    id: 'mock-1',
    title: '华南招商说明会主视觉海报',
    type: 'image',
    content: '适用于广州/深圳区域招商说明会的主视觉海报，突出品牌势能、单店模型、总部赋能和会务时间地点。',
    tags: '招商会,海报,华南',
  },
  {
    id: 'mock-2',
    title: '加盟手册话术摘要',
    type: 'text',
    content: '这份手册重点覆盖品牌定位、加盟模式、选址标准、供应链体系、培训赋能和开业支持，适合在破冰完成后发送给高意向代理商。',
    tags: '加盟手册,话术,破冰后外发',
  },
  {
    id: 'mock-3',
    title: '总部考察邀约文案',
    type: 'text',
    content: '王总，结合您目前的预算区间和区域资源，我们建议您来总部做一次完整考察。当天会安排品牌展厅、标杆门店、供应链与培训负责人对接，方便您把开店模型一次看透。',
    tags: '总部考察,邀约,高意向',
  },
  {
    id: 'mock-4',
    title: 'ROI 测算模板（标准店）',
    type: 'file',
    content: '标准店投资结构、回本周期、坪效预估、单店模型与敏感项说明，可配合政策报价审批后外发。',
    tags: 'ROI,测算表,报价',
  },
  {
    id: 'mock-5',
    title: '小红书品牌种草长图',
    type: 'image',
    content: '用于公域获客的长图素材，包含品牌故事、门店模型、加盟商画像和总部支持点。',
    tags: '小红书,公域,长图',
  },
  {
    id: 'mock-6',
    title: '转介绍激励发布文案',
    type: 'moments',
    content: '面向已签约加盟商发布的转介绍激励内容，突出推荐奖励、有效推荐条件和总部审核规则。',
    tags: '转介绍,裂变,已签约加盟商',
  },
];

export async function GET() {
  return NextResponse.json(
    MOCK_MATERIALS.map((item) => ({
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
  );
}
