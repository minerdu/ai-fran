import { randomUUID } from 'crypto';
import prisma from './prisma';

let opsStorageReadyPromise = null;
let leadSyncPromise = null;
let leadSyncAt = 0;

const LEAD_SYNC_TTL_MS = 60_000;

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

export async function ensureExecutionOpsStorage() {
  if (!opsStorageReadyPromise) {
    opsStorageReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS lead_scores (
          lead_id TEXT PRIMARY KEY,
          intent_score REAL DEFAULT 0,
          value_score REAL DEFAULT 0,
          satisfaction_score REAL DEFAULT 0,
          composite_score REAL DEFAULT 0,
          source TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS lead_stage_history (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          from_stage TEXT,
          to_stage TEXT NOT NULL,
          reason TEXT,
          actor TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS delivery_jobs (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          job_type TEXT NOT NULL,
          status TEXT NOT NULL,
          artifact_ref TEXT,
          payload TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    })();
  }

  await opsStorageReadyPromise;
}

export async function syncLeadOperationalState() {
  if (leadSyncPromise) {
    await leadSyncPromise;
    return;
  }

  if (Date.now() - leadSyncAt < LEAD_SYNC_TTL_MS) {
    return;
  }

  leadSyncPromise = (async () => {
    await ensureExecutionOpsStorage();
    const [customers, stageRows] = await Promise.all([
      prisma.customer.findMany({
        select: {
          id: true,
          lifecycleStatus: true,
          intentScore: true,
          valueScore: true,
          satisfactionScore: true,
        },
      }),
      prisma.$queryRawUnsafe(`
        SELECT lead_id, to_stage, created_at
        FROM lead_stage_history
        ORDER BY created_at DESC
      `),
    ]);

    const latestStageMap = stageRows.reduce((acc, row) => {
      if (!acc[row.lead_id]) {
        acc[row.lead_id] = row.to_stage || null;
      }
      return acc;
    }, {});

    for (const customer of customers) {
      const compositeScore = Number((((customer.intentScore || 0) * 0.45) + ((customer.valueScore || 0) * 0.35) + ((customer.satisfactionScore || 0) * 0.2)).toFixed(2));
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO lead_scores (
            lead_id, intent_score, value_score, satisfaction_score, composite_score, source, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(lead_id) DO UPDATE SET
            intent_score = excluded.intent_score,
            value_score = excluded.value_score,
            satisfaction_score = excluded.satisfaction_score,
            composite_score = excluded.composite_score,
            source = excluded.source,
            updated_at = CURRENT_TIMESTAMP
        `,
        customer.id,
        customer.intentScore || 0,
        customer.valueScore || 0,
        customer.satisfactionScore || 0,
        compositeScore,
        'customer_sync'
      );

      const lastStage = latestStageMap[customer.id] || null;
      if (lastStage !== customer.lifecycleStatus) {
        await prisma.$executeRawUnsafe(
          `
            INSERT INTO lead_stage_history (
              id, lead_id, from_stage, to_stage, reason, actor, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          `lsh_${randomUUID()}`,
          customer.id,
          lastStage,
          customer.lifecycleStatus,
          lastStage ? `线索状态从 ${lastStage} 进入 ${customer.lifecycleStatus}` : `初始化线索阶段 ${customer.lifecycleStatus}`,
          'system'
        );
      }
    }

    leadSyncAt = Date.now();
  })().finally(() => {
    leadSyncPromise = null;
  });

  await leadSyncPromise;
}

export async function getLeadScoresMap() {
  await syncLeadOperationalState();
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM lead_scores');
  return rows.reduce((acc, row) => {
    acc[row.lead_id] = {
      leadId: row.lead_id,
      intentScore: Number(row.intent_score || 0),
      valueScore: Number(row.value_score || 0),
      satisfactionScore: Number(row.satisfaction_score || 0),
      compositeScore: Number(row.composite_score || 0),
      source: row.source || 'customer_sync',
      updatedAt: normalizeTimestamp(row.updated_at),
    };
    return acc;
  }, {});
}

export async function getLeadStageHistory(leadId) {
  await syncLeadOperationalState();
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM lead_stage_history
      WHERE lead_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `,
    leadId
  );

  return rows.map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    reason: row.reason,
    actor: row.actor,
    createdAt: normalizeTimestamp(row.created_at),
  }));
}

export async function recordLeadStageChange(leadId, fromStage, toStage, reason, actor = 'human') {
  await ensureExecutionOpsStorage();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO lead_stage_history (
        id, lead_id, from_stage, to_stage, reason, actor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    `lsh_${randomUUID()}`,
    leadId,
    fromStage,
    toStage,
    reason,
    actor
  );
}

export async function createDeliveryJob({ entityType, entityId, jobType, status = 'queued', artifactRef = null, payload = null }) {
  await ensureExecutionOpsStorage();
  const id = `job_${randomUUID()}`;
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO delivery_jobs (
        id, entity_type, entity_id, job_type, status, artifact_ref, payload, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    id,
    entityType,
    entityId,
    jobType,
    status,
    artifactRef,
    JSON.stringify(payload || {})
  );
  return { id, entityType, entityId, jobType, status, artifactRef, payload: payload || {} };
}

export async function listDeliveryJobs({ entityType, entityId } = {}) {
  await ensureExecutionOpsStorage();
  const clauses = [];
  const values = [];

  if (entityType) {
    clauses.push('entity_type = ?');
    values.push(entityType);
  }
  if (entityId) {
    clauses.push('entity_id = ?');
    values.push(entityId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM delivery_jobs
      ${where}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 100
    `,
    ...values
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    jobType: row.job_type,
    status: row.status,
    artifactRef: row.artifact_ref,
    payload: parseJson(row.payload, {}),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  }));
}
