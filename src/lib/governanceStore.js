import { randomUUID } from 'crypto';
import prisma from './prisma';

let storageReadyPromise = null;

function normalizeTimestamp(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function deriveStatusLabel(status) {
  if (status === 'accept') return '已采纳';
  if (status === 'dismiss') return '已忽略';
  if (status === 'launch') return '已执行';
  return '待处理';
}

async function ensureGovernanceStorage() {
  if (!storageReadyPromise) {
    storageReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS optimization_suggestions (
          id TEXT PRIMARY KEY,
          priority TEXT,
          title TEXT NOT NULL,
          owner TEXT,
          expected_impact TEXT,
          reason TEXT,
          next_action TEXT,
          href TEXT,
          status TEXT DEFAULT 'suggested',
          status_label TEXT DEFAULT '待处理',
          action_reason TEXT,
          launch_task_id TEXT,
          launch_task_title TEXT,
          launch_href TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          scope TEXT,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          operator TEXT,
          reason TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    })();
  }

  await storageReadyPromise;
}

function normalizeSuggestionRow(row) {
  return {
    id: row.id,
    priority: row.priority || 'P1',
    title: row.title,
    owner: row.owner || '',
    expectedImpact: row.expected_impact || '',
    reason: row.reason || '',
    nextAction: row.next_action || '',
    href: row.href || '',
    status: row.status || 'suggested',
    statusLabel: row.status_label || deriveStatusLabel(row.status),
    actionReason: row.action_reason || null,
    launchTaskId: row.launch_task_id || null,
    launchTaskTitle: row.launch_task_title || null,
    launchHref: row.launch_href || row.href || null,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function normalizeAuditRow(row) {
  return {
    id: row.id,
    scope: row.scope || 'system',
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    operator: row.operator || 'system',
    reason: row.reason || null,
    metadata: parseJson(row.metadata, {}),
    createdAt: normalizeTimestamp(row.created_at),
  };
}

export async function appendGovernanceAudit({
  scope = 'system',
  entityType,
  entityId,
  action,
  operator = 'system',
  reason = null,
  metadata = {},
}) {
  await ensureGovernanceStorage();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO audit_logs (
        id, scope, entity_type, entity_id, action, operator, reason, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    `audit_${randomUUID()}`,
    scope,
    entityType,
    entityId,
    action,
    operator,
    reason,
    JSON.stringify(metadata || {})
  );
}

export async function listGovernanceAuditLogs({ entityType = null, entityId = null, limit = 50 } = {}) {
  await ensureGovernanceStorage();

  if (entityType && entityId) {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT * FROM audit_logs
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      entityType,
      entityId,
      limit
    );
    return rows.map(normalizeAuditRow);
  }

  if (entityType) {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT * FROM audit_logs
        WHERE entity_type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      entityType,
      limit
    );
    return rows.map(normalizeAuditRow);
  }

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `,
    limit
  );
  return rows.map(normalizeAuditRow);
}

export async function syncOptimizationSuggestions(suggestions = []) {
  await ensureGovernanceStorage();

  for (const item of suggestions) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO optimization_suggestions (
          id, priority, title, owner, expected_impact, reason, next_action, href,
          status, status_label, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'suggested', '待处理', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          priority = excluded.priority,
          title = excluded.title,
          owner = excluded.owner,
          expected_impact = excluded.expected_impact,
          reason = excluded.reason,
          next_action = excluded.next_action,
          href = excluded.href,
          updated_at = CURRENT_TIMESTAMP
      `,
      item.id,
      item.priority || 'P1',
      item.title,
      item.owner || '',
      item.expectedImpact || '',
      item.reason || '',
      item.nextAction || '',
      item.href || ''
    );
  }

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT * FROM optimization_suggestions
      WHERE id IN (${suggestions.map(() => '?').join(', ')})
      ORDER BY created_at ASC
    `,
    ...suggestions.map((item) => item.id)
  );

  const map = rows.reduce((acc, row) => {
    acc[row.id] = normalizeSuggestionRow(row);
    return acc;
  }, {});

  return suggestions.map((item) => ({
    ...item,
    ...map[item.id],
    status: map[item.id]?.status || 'suggested',
    statusLabel: map[item.id]?.statusLabel || '待处理',
    actionReason: map[item.id]?.actionReason || null,
    launchTaskId: map[item.id]?.launchTaskId || null,
    launchTaskTitle: map[item.id]?.launchTaskTitle || null,
    launchHref: map[item.id]?.launchHref || item.href || null,
    updatedAt: map[item.id]?.updatedAt || null,
  }));
}

export async function getOptimizationSuggestionById(id) {
  await ensureGovernanceStorage();
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM optimization_suggestions WHERE id = ? LIMIT 1',
    id
  );
  return rows?.[0] ? normalizeSuggestionRow(rows[0]) : null;
}

export async function updateOptimizationSuggestionRecord(id, {
  status,
  reason = null,
  launchTaskId = null,
  launchTaskTitle = null,
  launchHref = null,
} = {}) {
  await ensureGovernanceStorage();
  const nextStatus = status || 'suggested';
  const nextLabel = deriveStatusLabel(nextStatus);

  await prisma.$executeRawUnsafe(
    `
      UPDATE optimization_suggestions
      SET
        status = ?,
        status_label = ?,
        action_reason = ?,
        launch_task_id = COALESCE(?, launch_task_id),
        launch_task_title = COALESCE(?, launch_task_title),
        launch_href = COALESCE(?, launch_href),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    nextStatus,
    nextLabel,
    reason,
    launchTaskId,
    launchTaskTitle,
    launchHref,
    id
  );

  return getOptimizationSuggestionById(id);
}
