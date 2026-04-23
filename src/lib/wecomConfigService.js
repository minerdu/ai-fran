import prisma from './prisma';

let storageReadyPromise = null;

function normalizeTimestamp(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

async function ensureWecomStorage() {
  if (!storageReadyPromise) {
    storageReadyPromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS wecom_configs (
        id TEXT PRIMARY KEY,
        gateway TEXT DEFAULT '',
        client_id TEXT DEFAULT '',
        client_secret TEXT DEFAULT '',
        bridge_wx_id TEXT DEFAULT '',
        wx_type INTEGER DEFAULT 2,
        bridge_auth TEXT DEFAULT '',
        test_target_wx_id TEXT DEFAULT '',
        enabled INTEGER DEFAULT 0,
        last_test_at DATETIME,
        last_test_status TEXT DEFAULT '',
        last_test_message TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  await storageReadyPromise;
}

function normalizeRow(row) {
  return {
    id: row.id,
    gateway: row.gateway || '',
    clientId: row.client_id || '',
    clientSecret: row.client_secret || '',
    bridgeWxId: row.bridge_wx_id || '',
    wxType: Number(row.wx_type || 2),
    bridgeAuth: row.bridge_auth || '',
    testTargetWxId: row.test_target_wx_id || '',
    enabled: Boolean(row.enabled),
    hasSecret: !!row.client_secret,
    lastTestAt: normalizeTimestamp(row.last_test_at),
    lastTestStatus: row.last_test_status || '',
    lastTestMessage: row.last_test_message || '',
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

export async function getWecomConfig() {
  await ensureWecomStorage();
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM wecom_configs WHERE id = ? LIMIT 1', 'default');
  if (!rows?.[0]) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO wecom_configs (
          id, gateway, client_id, client_secret, bridge_wx_id, wx_type, bridge_auth, test_target_wx_id, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      'default',
      process.env.WECOM_GATEWAY || 'https://gateway.bilinl.com',
      process.env.OPENAPI_CLIENT_ID || '',
      process.env.OPENAPI_CLIENT_SECRET || '',
      process.env.OPENAPI_BRIDGE_WX_ID || '',
      Number(process.env.WECOM_WX_TYPE || 2),
      process.env.OPENAPI_BRIDGE_AUTH || '',
      process.env.WECOM_TEST_TARGET_WX_ID || '',
      process.env.OPENAPI_CLIENT_ID ? 1 : 0
    );
    const inserted = await prisma.$queryRawUnsafe('SELECT * FROM wecom_configs WHERE id = ? LIMIT 1', 'default');
    return normalizeRow(inserted[0]);
  }
  return normalizeRow(rows[0]);
}

export async function saveWecomConfig(input = {}) {
  await ensureWecomStorage();
  const current = await getWecomConfig();
  const next = {
    gateway: input.gateway ?? current.gateway,
    clientId: input.clientId ?? current.clientId,
    clientSecret: input.clientSecret && input.clientSecret !== '••••••••'
      ? input.clientSecret
      : current.clientSecret,
    bridgeWxId: input.bridgeWxId ?? current.bridgeWxId,
    wxType: Number(input.wxType ?? current.wxType ?? 2),
    bridgeAuth: input.bridgeAuth && input.bridgeAuth !== '••••••••'
      ? input.bridgeAuth
      : current.bridgeAuth,
    testTargetWxId: input.testTargetWxId ?? current.testTargetWxId,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
  };

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO wecom_configs (
        id, gateway, client_id, client_secret, bridge_wx_id, wx_type, bridge_auth, test_target_wx_id, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        gateway = excluded.gateway,
        client_id = excluded.client_id,
        client_secret = excluded.client_secret,
        bridge_wx_id = excluded.bridge_wx_id,
        wx_type = excluded.wx_type,
        bridge_auth = excluded.bridge_auth,
        test_target_wx_id = excluded.test_target_wx_id,
        enabled = excluded.enabled,
        updated_at = CURRENT_TIMESTAMP
    `,
    'default',
    next.gateway,
    next.clientId,
    next.clientSecret,
    next.bridgeWxId,
    next.wxType,
    next.bridgeAuth,
    next.testTargetWxId,
    next.enabled ? 1 : 0
  );

  return getWecomConfig();
}

export async function recordWecomTestResult({ success, message }) {
  await ensureWecomStorage();
  await prisma.$executeRawUnsafe(
    `
      UPDATE wecom_configs
      SET
        last_test_at = CURRENT_TIMESTAMP,
        last_test_status = ?,
        last_test_message = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    success ? 'success' : 'failed',
    message || '',
    'default'
  );
}
