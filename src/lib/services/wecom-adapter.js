/**
 * 企业微信消息通道适配器 (Real OpenAPI Integration)
 */

import { getWecomConfig } from '@/lib/wecomConfigService';

// Token Cache
let tokenCache = {
  value: '',
  expiresAt: 0
};

async function loadWecomRuntimeConfig() {
  const stored = await getWecomConfig().catch(() => null);
  return {
    gateway: stored?.gateway || process.env.WECOM_GATEWAY || 'https://gateway.bilinl.com',
    clientId: stored?.clientId || process.env.OPENAPI_CLIENT_ID || '',
    clientSecret: stored?.clientSecret || process.env.OPENAPI_CLIENT_SECRET || '',
    bridgeWxId: stored?.bridgeWxId || process.env.OPENAPI_BRIDGE_WX_ID || '',
    wxType: stored?.wxType || (process.env.WECOM_WX_TYPE ? parseInt(process.env.WECOM_WX_TYPE) : 2),
    enabled: stored ? stored.enabled : !!process.env.OPENAPI_CLIENT_ID,
  };
}

async function getAccessToken() {
  const runtime = await loadWecomRuntimeConfig();
  if (!runtime.clientId || !runtime.clientSecret) {
    throw new Error("Missing OPENAPI_CLIENT_ID or OPENAPI_CLIENT_SECRET in .env");
  }

  const now = Date.now();
  if (tokenCache.value && now < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const url = `${runtime.gateway}/thirdparty/user/login/client`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: runtime.clientId,
      clientSecret: runtime.clientSecret
    })
  });

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`OpenAPI login failed: [${json.code}] ${json.message}`);
  }

  const data = json.data || {};
  tokenCache.value = data.value;
  tokenCache.expiresAt = data.expiredTime ? Number(data.expiredTime) - 60000 : now + 1800000;

  return tokenCache.value;
}

export async function sendWeComMessage(wechatId, content, msgType = 'text') {
  const runtime = await loadWecomRuntimeConfig();
  console.log(`\n================ WECOM ADAPTER =================`);
  console.log(`[发送通道]: WeCom OpenAPI (Direct)`);
  console.log(`[目标客户]: ${wechatId}`);
  console.log(`[发送主账号]: ${runtime.bridgeWxId}`);
  console.log(`[消息内容]:\n${content}`);
  
  if (!runtime.clientId) {
    console.warn(`[WARNING]: OPENAPI_CLIENT_ID not set! Using dry-run mode.`);
    await new Promise(r => setTimeout(r, 800));
    return { success: true, externalMsgId: `wx-msg-dry-${Date.now()}` };
  }

  try {
    const token = await getAccessToken();
    const endpoint = '/thirdparty/personal/privateMessage';
    
    // Mapping msgType to OpenAPI type codes
    // 2001: Text, 2010: File/Image
    let apiMsgType = 2001; 
    let msgContent = content;

    if (msgType === 'image' || msgType === 'file') {
      apiMsgType = 2010;
      // For files, content should be the file URL, we'll prefix it if needed
      // Note: the supplier API expects vcHref for files
    }

    const payload = {
      freWxId: wechatId,
      wxId: runtime.bridgeWxId,
      wxType: runtime.wxType,
      data: [
        {
          msgContent: msgContent,
          msgType: apiMsgType,
          msgNum: 1,
          vcHref: (apiMsgType === 2010) ? msgContent : undefined
        }
      ]
    };

    const res = await fetch(`${runtime.gateway}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log(`[供应商响应]:`, JSON.stringify(json));
    
    if (json.code !== 0) {
      throw new Error(`Send message failed: code=${json.code} message=${json.message}`);
    }

    if (json.data && json.data.resultCode !== 0 && json.data.resultCode !== "0") {
      throw new Error(`Business failed: resultCode=${json.data.resultCode} resultMsg=${json.data.resultMsg}`);
    }

    console.log(`================================================\n`);
    
    return {
      success: true,
      externalMsgId: `openapi-${Date.now()}`
    };

  } catch (err) {
    console.error(`[WECOM ADAPTER ERROR]:`, err.message);
    throw err;
  }
}

export async function testWeComConnection() {
  try {
    const token = await getAccessToken();
    const runtime = await loadWecomRuntimeConfig();
    return {
      success: true,
      message: `企业微信桥接已连接：${runtime.bridgeWxId || '主账号待配置'}`,
      tokenValid: true,
      tokenPreview: token.substring(0, 8) + '...',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '企业微信连接失败',
      tokenValid: false,
    };
  }
}
