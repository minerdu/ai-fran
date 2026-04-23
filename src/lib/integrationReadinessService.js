import prisma from './prisma';
import { testConnection as testCrmConnection } from './youzanService';
import { getWecomConfig } from './wecomConfigService';

function hasAll(values = []) {
  return values.every((value) => typeof value === 'string' && value.trim().length > 0);
}

function maskValue(value) {
  if (!value) return '未配置';
  if (value.length <= 8) return '已配置';
  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

function normalizeStatus(requiredCount, configuredCount, canTest = false) {
  if (configuredCount === 0) {
    return {
      key: 'unconfigured',
      label: '未配置',
      tone: 'neutral',
      canTest: false,
    };
  }
  if (configuredCount < requiredCount) {
    return {
      key: 'partial',
      label: '部分配置',
      tone: 'warning',
      canTest: false,
    };
  }
  return {
    key: canTest ? 'ready' : 'configured',
    label: canTest ? '可测试' : '已配置',
    tone: canTest ? 'success' : 'neutral',
    canTest,
  };
}

async function getCrmItem() {
  const config = await prisma.youzanConfig.findUnique({ where: { id: 'default' } }).catch(() => null);
  const fields = [
    { key: 'appId', label: 'App ID', value: config?.appId || '' },
    { key: 'appSecret', label: 'App Secret', value: config?.appSecret || '' },
    { key: 'shopId', label: '租户 / 空间 ID', value: config?.shopId || '' },
  ];
  const configuredCount = fields.filter((item) => item.value).length;
  const status = normalizeStatus(fields.length, configuredCount, configuredCount === fields.length);

  return {
    channel: 'crm',
    name: 'CRM / 渠道导入',
    description: '当前复用有赞配置，承接招商线索导入与同步。',
    status,
    fields: fields.map((field) => ({
      ...field,
      preview: maskValue(field.value),
      configured: !!field.value,
    })),
    lastSyncAt: config?.lastSyncAt?.toISOString?.() || config?.lastSyncAt || null,
  };
}

function buildEnvItem(channel, name, description, fields, canTest = false) {
  const configuredCount = fields.filter((item) => item.value).length;
  const status = normalizeStatus(fields.length, configuredCount, canTest && configuredCount === fields.length);
  return {
    channel,
    name,
    description,
    status,
    fields: fields.map((field) => ({
      ...field,
      preview: maskValue(field.value),
      configured: !!field.value,
    })),
  };
}

async function getWecomItem() {
  const config = await getWecomConfig().catch(() => null);
  return buildEnvItem('wecom', '企业微信', '用于企微好友、群聊、客户联系与回执回写。', [
    { key: 'gateway', label: 'Gateway', value: config?.gateway || process.env.WECOM_GATEWAY || '' },
    { key: 'clientId', label: 'OpenAPI Client ID', value: config?.clientId || process.env.OPENAPI_CLIENT_ID || '' },
    { key: 'clientSecret', label: 'OpenAPI Client Secret', value: config?.clientSecret || process.env.OPENAPI_CLIENT_SECRET || '' },
    { key: 'bridgeWxId', label: 'Bridge Wx ID', value: config?.bridgeWxId || process.env.OPENAPI_BRIDGE_WX_ID || '' },
  ], true);
}

function getPhoneItem() {
  return buildEnvItem('phone', '电话外呼', '用于邀约拨号、总部考察确认与会后跟进。', [
    { key: 'provider', label: '服务商', value: process.env.PHONE_PROVIDER || '' },
    { key: 'apiKey', label: 'API Key / SID', value: process.env.PHONE_API_KEY || process.env.TWILIO_ACCOUNT_SID || '' },
    { key: 'secret', label: 'API Secret / Token', value: process.env.PHONE_API_SECRET || process.env.TWILIO_AUTH_TOKEN || '' },
  ]);
}

function getSmsItem() {
  return buildEnvItem('sms', '短信通道', '用于资料外发确认、审批提醒与会务通知。', [
    { key: 'provider', label: '服务商', value: process.env.SMS_PROVIDER || '' },
    { key: 'keyId', label: 'Access Key', value: process.env.SMS_ACCESS_KEY_ID || '' },
    { key: 'secret', label: 'Access Secret', value: process.env.SMS_ACCESS_KEY_SECRET || '' },
    { key: 'signName', label: '短信签名', value: process.env.SMS_SIGN_NAME || '' },
  ]);
}

function getEmailItem() {
  return buildEnvItem('email', '邮件通道', '用于加盟资料、ROI 测算表与报告外发。', [
    { key: 'provider', label: '服务商', value: process.env.EMAIL_PROVIDER || '' },
    { key: 'from', label: '发件地址', value: process.env.EMAIL_FROM || '' },
    { key: 'apiKey', label: 'API Key / SMTP Host', value: process.env.RESEND_API_KEY || process.env.SMTP_HOST || '' },
    { key: 'auth', label: 'SMTP 账号 / 密钥', value: process.env.SMTP_USER || process.env.SMTP_PASS || '' },
  ]);
}

export async function listIntegrationReadiness() {
  const items = [
    await getCrmItem(),
    await getWecomItem(),
    getPhoneItem(),
    getSmsItem(),
    getEmailItem(),
  ];

  return {
    items,
    summary: {
      total: items.length,
      ready: items.filter((item) => item.status.key === 'ready').length,
      partial: items.filter((item) => item.status.key === 'partial').length,
      unconfigured: items.filter((item) => item.status.key === 'unconfigured').length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function testIntegrationReadiness(channel) {
  if (channel === 'crm') {
    const result = await testCrmConnection();
    return {
      channel,
      success: !!result.success,
      message: result.message,
      detail: result,
    };
  }

  const matrix = await listIntegrationReadiness();
  const item = matrix.items.find((entry) => entry.channel === channel);
  if (!item) {
    throw new Error('Unknown integration channel');
  }

  if (item.status.key === 'unconfigured') {
    return {
      channel,
      success: false,
      message: `${item.name} 尚未配置，无法发起联调测试`,
      detail: item,
    };
  }

  if (item.status.key === 'partial') {
    return {
      channel,
      success: false,
      message: `${item.name} 仅完成部分配置，需补齐凭证字段后再测试`,
      detail: item,
    };
  }

  return {
    channel,
    success: true,
    message: `${item.name} 配置完整，待真实联调环境可直接接入测试`,
    detail: item,
  };
}
