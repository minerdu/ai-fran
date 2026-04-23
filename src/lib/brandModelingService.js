import { randomUUID } from 'crypto';
import prisma from './prisma';
import { mockFranchiseDocs } from './franchiseData';
import {
  BENCHMARK_SKILLS,
  DEFAULT_BRAND,
  DEFAULT_BRAND_ID,
  FACT_FIELD_META,
  SKILL_GROUP_ORDER,
} from './brandModelingCatalog';

let storageReadyPromise = null;
let seedReadyPromise = null;

function parseJsonField(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeTimestamp(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeBrand(row) {
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.website_url || '',
    benchmarkCompany: row.benchmark_company || '',
    oneLiner: row.one_liner || '',
    industry: row.industry || '',
    storeModels: row.store_models || '',
    targetPersona: row.target_persona || '',
    coreSellingPoints: row.core_selling_points || '',
    investmentThreshold: row.investment_threshold || '',
    enablementPoints: row.enablement_points || '',
    riskPoints: row.risk_points || '',
    missingContext: parseJsonField(row.missing_context),
    sourceSummary: parseJsonField(row.source_summary),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function normalizeDocument(row) {
  return {
    id: row.id,
    brandId: row.brand_id,
    name: row.name,
    type: row.type,
    format: row.format,
    size: row.size_label,
    status: row.status,
    sourceType: row.source_type,
    sourceUri: row.source_uri,
    description: row.description || '',
    chunkCount: Number(row.chunk_count || 0),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function chunkTemplateForDoc(doc) {
  const focusMap = {
    handbook: ['品牌定位与加盟优势', '加盟流程与投资门槛', '门店运营与总部赋能'],
    roi_model: ['单店模型与 ROI 假设', '城市级成本结构', '回本周期与敏感因素'],
    faq: ['加盟常见问题', '政策解释与异议处理', '签约前后关键说明'],
    case_study: ['标杆案例摘要', '经营指标亮点', '适用人群与落地方式'],
    policy: ['加盟政策摘要', '区域保护规则', '预算与审批边界'],
    guide: ['选址与门店模型', '总部流程规范', '执行清单'],
    training: ['培训体系结构', '总部赋能路径', '开业与复训安排'],
    supply_chain: ['供应链时效', '订货流程', '物料支持边界'],
  };

  const topics = focusMap[doc.type] || ['资料摘要', '执行要点', '适用范围'];
  return topics.map((topic, index) => ({
    id: `chunk_${doc.id}_${index + 1}`,
    title: topic,
    content: `${doc.name}：${topic}。${doc.description || '该文档已纳入招商知识库，用于品牌建模、Skill 推荐和招商执行。'}`,
    tokenEstimate: 160 + index * 24,
    chunkIndex: index,
  }));
}

async function ensureBrandStorage() {
  if (!storageReadyPromise) {
    storageReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS brands (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          website_url TEXT,
          benchmark_company TEXT,
          one_liner TEXT,
          industry TEXT,
          store_models TEXT,
          target_persona TEXT,
          core_selling_points TEXT,
          investment_threshold TEXT,
          enablement_points TEXT,
          risk_points TEXT,
          missing_context TEXT,
          source_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS knowledge_documents (
          id TEXT PRIMARY KEY,
          brand_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          format TEXT NOT NULL,
          size_label TEXT,
          status TEXT NOT NULL,
          source_type TEXT,
          source_uri TEXT,
          description TEXT,
          chunk_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          brand_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          title TEXT,
          content TEXT NOT NULL,
          token_estimate INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    })();
  }

  await storageReadyPromise;
}

export async function createKnowledgeDocument(brandId = DEFAULT_BRAND_ID, payload) {
  await ensureBrandStorage();
  const id = payload.id || `doc_${randomUUID()}`;
  const nextDoc = {
    id,
    name: payload.name,
    type: payload.type || 'guide',
    format: payload.format || 'PDF',
    size: payload.size || '待估算',
    status: payload.status || 'draft',
    sourceType: payload.sourceType || 'PDF 手册',
    sourceUri: payload.sourceUri || '',
    description: payload.description || '新导入的招商知识文档',
  };
  const chunks = chunkTemplateForDoc(nextDoc);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO knowledge_documents (
        id, brand_id, name, type, format, size_label, status, source_type, source_uri, description, chunk_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        brand_id = excluded.brand_id,
        name = excluded.name,
        type = excluded.type,
        format = excluded.format,
        size_label = excluded.size_label,
        status = excluded.status,
        source_type = excluded.source_type,
        source_uri = excluded.source_uri,
        description = excluded.description,
        chunk_count = excluded.chunk_count,
        updated_at = CURRENT_TIMESTAMP
    `,
    nextDoc.id,
    brandId,
    nextDoc.name,
    nextDoc.type,
    nextDoc.format,
    nextDoc.size,
    nextDoc.status,
    nextDoc.sourceType,
    nextDoc.sourceUri,
    nextDoc.description,
    chunks.length
  );

  for (const chunk of chunks) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO knowledge_chunks (
          id, document_id, brand_id, chunk_index, title, content, token_estimate, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          document_id = excluded.document_id,
          brand_id = excluded.brand_id,
          chunk_index = excluded.chunk_index,
          title = excluded.title,
          content = excluded.content,
          token_estimate = excluded.token_estimate
      `,
      chunk.id,
      nextDoc.id,
      brandId,
      chunk.chunkIndex,
      chunk.title,
      chunk.content,
      chunk.tokenEstimate
    );
  }

  return nextDoc;
}

async function seedDefaultBrandData() {
  if (!seedReadyPromise) {
    seedReadyPromise = (async () => {
      await ensureBrandStorage();
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO brands (
            id, name, website_url, benchmark_company, one_liner, industry, store_models, target_persona,
            core_selling_points, investment_threshold, enablement_points, risk_points, missing_context, source_summary,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            website_url = excluded.website_url,
            benchmark_company = excluded.benchmark_company,
            one_liner = excluded.one_liner,
            industry = excluded.industry,
            store_models = excluded.store_models,
            target_persona = excluded.target_persona,
            core_selling_points = excluded.core_selling_points,
            investment_threshold = excluded.investment_threshold,
            enablement_points = excluded.enablement_points,
            risk_points = excluded.risk_points,
            missing_context = excluded.missing_context,
            source_summary = excluded.source_summary,
            updated_at = CURRENT_TIMESTAMP
        `,
        DEFAULT_BRAND.id,
        DEFAULT_BRAND.name,
        DEFAULT_BRAND.websiteUrl,
        DEFAULT_BRAND.benchmarkCompany,
        DEFAULT_BRAND.oneLiner,
        DEFAULT_BRAND.industry,
        DEFAULT_BRAND.storeModels,
        DEFAULT_BRAND.targetPersona,
        DEFAULT_BRAND.coreSellingPoints,
        DEFAULT_BRAND.investmentThreshold,
        DEFAULT_BRAND.enablementPoints,
        DEFAULT_BRAND.riskPoints,
        JSON.stringify(DEFAULT_BRAND.missingContext),
        JSON.stringify(DEFAULT_BRAND.sourceSummary)
      );

      for (const doc of mockFranchiseDocs) {
        await createKnowledgeDocument(DEFAULT_BRAND_ID, {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          format: doc.format,
          size: doc.size,
          status: doc.status,
          sourceType: doc.format === 'PDF' ? 'PDF 手册' : doc.type === 'faq' ? 'FAQ 文档' : '官网 URL',
          sourceUri: '',
          description: doc.description,
        });
      }
    })().finally(() => {
      seedReadyPromise = null;
    });
  }

  await seedReadyPromise;
}

export async function getBrandById(brandId = DEFAULT_BRAND_ID) {
  await seedDefaultBrandData();
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM brands WHERE id = ? LIMIT 1', brandId);
  return rows?.[0] ? normalizeBrand(rows[0]) : { ...DEFAULT_BRAND, id: brandId };
}

export async function listBrands() {
  await seedDefaultBrandData();
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM brands ORDER BY updated_at DESC');
  return rows.map(normalizeBrand);
}

export async function upsertBrand(payload) {
  await seedDefaultBrandData();
  const brand = { ...DEFAULT_BRAND, ...payload, id: payload.id || DEFAULT_BRAND_ID };
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO brands (
        id, name, website_url, benchmark_company, one_liner, industry, store_models, target_persona,
        core_selling_points, investment_threshold, enablement_points, risk_points, missing_context, source_summary,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        website_url = excluded.website_url,
        benchmark_company = excluded.benchmark_company,
        one_liner = excluded.one_liner,
        industry = excluded.industry,
        store_models = excluded.store_models,
        target_persona = excluded.target_persona,
        core_selling_points = excluded.core_selling_points,
        investment_threshold = excluded.investment_threshold,
        enablement_points = excluded.enablement_points,
        risk_points = excluded.risk_points,
        missing_context = excluded.missing_context,
        source_summary = excluded.source_summary,
        updated_at = CURRENT_TIMESTAMP
    `,
    brand.id,
    brand.name,
    brand.websiteUrl,
    brand.benchmarkCompany,
    brand.oneLiner,
    brand.industry,
    brand.storeModels,
    brand.targetPersona,
    brand.coreSellingPoints,
    brand.investmentThreshold,
    brand.enablementPoints,
    brand.riskPoints,
    JSON.stringify(brand.missingContext || []),
    JSON.stringify(brand.sourceSummary || [])
  );

  return getBrandById(brand.id);
}

export async function listKnowledgeDocuments(brandId = DEFAULT_BRAND_ID) {
  await seedDefaultBrandData();
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM knowledge_documents WHERE brand_id = ? ORDER BY updated_at DESC, created_at DESC',
    brandId
  );
  return rows.map(normalizeDocument);
}

export async function getKnowledgeChunkCount(brandId = DEFAULT_BRAND_ID) {
  await seedDefaultBrandData();
  const rows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) AS count FROM knowledge_chunks WHERE brand_id = ?',
    brandId
  );
  return Number(rows?.[0]?.count || 0);
}

export async function buildBrandModelingPayload(brandId = DEFAULT_BRAND_ID) {
  const [brand, documents, knowledgeChunkCount] = await Promise.all([
    getBrandById(brandId),
    listKnowledgeDocuments(brandId),
    getKnowledgeChunkCount(brandId),
  ]);
  const skillPayload = recommendSkillsForBrand(brand, documents);

  return {
    brand,
    factCards: FACT_FIELD_META.map((field) => ({
      key: field.key,
      title: field.title,
      value: brand[field.key] || '待补充',
    })),
    missingItems: brand.missingContext || [],
    documents,
    recommendedSkills: skillPayload.recommended,
    docStats: {
      total: documents.length,
      publishedCount: documents.filter((item) => item.status === 'published').length,
      draftCount: documents.filter((item) => item.status !== 'published').length,
      knowledgeChunkCount,
      byType: documents.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

export function recommendSkillsForBrand(brand, documents) {
  const sourceTokens = `${brand.name} ${brand.industry} ${brand.benchmarkCompany} ${(brand.missingContext || []).join(' ')} ${documents.map((item) => `${item.type} ${item.name}`).join(' ')}`;
  const groups = SKILL_GROUP_ORDER.reduce((acc, group) => {
    acc[group] = [];
    return acc;
  }, {});

  const enrichedSkills = BENCHMARK_SKILLS.map((skill) => {
    let score = 0;
    if (/樊文花/i.test(sourceTokens) && /樊文花/.test(skill.name + skill.benchmark)) score += 5;
    if (/美容|美业/.test(sourceTokens) && skill.tags.includes('美容美业')) score += 3;
    if (/政策|区域保护|审批/.test(sourceTokens) && /签约|规则|总部自定义/.test(skill.name)) score += 2;
    if (/案例|沉默|唤醒/.test(sourceTokens) && /沉默激活/.test(skill.name)) score += 3;
    if (/FAQ|手册|培训/.test(sourceTokens) && /考察|招商|加盟/.test(skill.name + skill.benchmark)) score += 2;

    const recommendationReason = score >= 5
      ? '与当前品牌资料、行业标签和标杆案例高度匹配'
      : score >= 3
        ? '可用于补齐当前品牌建模和招商执行链路'
        : '可作为后续灰度验证或总部自定义补充';

    const enriched = { ...skill, score, recommendationReason };
    groups[skill.group].push(enriched);
    return enriched;
  });

  return {
    groupedSkills: groups,
    recommended: [...enrichedSkills].sort((a, b) => b.score - a.score).slice(0, 4),
  };
}
