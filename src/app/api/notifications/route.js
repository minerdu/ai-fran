import { NextResponse } from 'next/server';

const mockNotifications = [
  {
    id: 'n1',
    type: 'alert',
    title: 'SOP 执行提醒',
    content: '沉默线索重启培育 SOP 刚为 14 位代理商负责人推入待审批队列，请及时处理，避免错过重新建立联系的窗口。',
    time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    isRead: false,
    link: '/tasks'
  },
  {
    id: 'n2',
    type: 'message',
    title: '高意向异动',
    content: '高意向线索【王志远】刚发来长图文消息，疑似在比较加盟政策与供应链细节，AI 因触发审批规则未直接回复，请前往查看。',
    time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    isRead: false,
    link: '/leads'
  },
  {
    id: 'n3',
    type: 'system',
    title: '系统播报',
    content: '您的 AI 招商顾问底模已完成上周招商话术与审批规则微调更新。',
    time: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    isRead: true,
  }
];

export async function GET() {
  return NextResponse.json(mockNotifications);
}
