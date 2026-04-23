import { NextResponse } from 'next/server';
import { sendWeComMessage, testWeComConnection } from '@/lib/services/wecom-adapter';
import { getWecomConfig, recordWecomTestResult, saveWecomConfig } from '@/lib/wecomConfigService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getWecomConfig();
    return NextResponse.json({
      gateway: config.gateway,
      clientId: config.clientId,
      clientSecret: config.hasSecret ? '••••••••' : '',
      bridgeWxId: config.bridgeWxId,
      wxType: config.wxType,
      bridgeAuth: config.bridgeAuth ? '••••••••' : '',
      testTargetWxId: config.testTargetWxId,
      enabled: config.enabled,
      hasSecret: config.hasSecret,
      hasBridgeAuth: !!config.bridgeAuth,
      lastTestAt: config.lastTestAt,
      lastTestStatus: config.lastTestStatus,
      lastTestMessage: config.lastTestMessage,
    });
  } catch (error) {
    return NextResponse.json({ error: '获取企业微信配置失败' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const config = await saveWecomConfig(body);
    return NextResponse.json({
      success: true,
      message: '企业微信配置已保存',
      gateway: config.gateway,
      clientId: config.clientId,
      bridgeWxId: config.bridgeWxId,
      wxType: config.wxType,
      testTargetWxId: config.testTargetWxId,
      enabled: config.enabled,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '保存企业微信配置失败' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'connection';

    if (mode === 'send') {
      const config = await getWecomConfig();
      const target = body.wechatId || config.testTargetWxId;
      const content = body.content || 'AI-Franchise 企业微信联调测试消息';
      if (!target) {
        return NextResponse.json({ success: false, message: '缺少测试目标微信 ID' }, { status: 400 });
      }
      const result = await sendWeComMessage(target, content, body.msgType || 'text');
      await recordWecomTestResult({ success: true, message: '企业微信测试消息发送成功' });
      return NextResponse.json({
        success: true,
        message: '企业微信测试消息发送成功',
        ...result,
      });
    }

    const result = await testWeComConnection();
    await recordWecomTestResult({ success: !!result.success, message: result.message });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    await recordWecomTestResult({ success: false, message: error.message || '企业微信测试失败' }).catch(() => {});
    return NextResponse.json({
      success: false,
      message: error.message || '企业微信测试失败',
    }, { status: 500 });
  }
}
