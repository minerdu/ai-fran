'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/basePath';
import styles from './SystemStatusPanel.module.css';

const KB_LABELS = {
  zhipu: '智谱知识库',
  dify: 'Dify 知识库',
  custom: '指定知识库',
  default: '默认知识上下文',
  none: '未启用知识库',
};

function formatKnowledgeBaseDetail(aiData) {
  const source = aiData?.kbSource || 'zhipu';
  const label = KB_LABELS[source] || source;
  return aiData?.kbId ? `${label} / ${aiData.kbId}` : label;
}

/**
 * 系统状态面板
 * 展示 AI 模型连通性、知识库、CRM 连接状态、Skill中心状态
 * 复刻自 AI-Sales SystemStatusPanel，第4项改为 Skill中心
 */
export default function SystemStatusPanel() {
  const [statuses, setStatuses] = useState({
    aiModel: { status: 'warning', label: 'AI 大模型', detail: 'OPENAI / gpt-5.4' },
    knowledgeBase: { status: 'online', label: '知识库', detail: '智谱知识库 / franchise-brand-kb' },
    crm: { status: 'warning', label: 'CRM系统', detail: '有赞 CRM / 待授权' },
    skillCenter: { status: 'online', label: 'Skill中心', detail: '已加载 樊文花Skill' },
  });

  const checkStatuses = useCallback(async () => {
    try {
      const [aiRes, readinessRes] = await Promise.all([
        apiFetch('/api/settings/ai-model', { cache: 'no-store' }),
        apiFetch('/api/integrations/readiness', { cache: 'no-store' }),
      ]);

      const aiData = aiRes.ok ? await aiRes.json() : null;
      const readinessData = readinessRes.ok ? await readinessRes.json() : null;
      const crmItem = readinessData?.items?.find((item) => item.channel === 'crm');
      const readyCount = readinessData?.summary?.ready ?? 0;
      const totalCount = readinessData?.summary?.total ?? 0;

      setStatuses((prev) => ({
        ...prev,
        aiModel: {
          ...prev.aiModel,
          status: aiData?.enabled && aiData?.apiKeyMasked ? 'online' : 'offline',
          detail: `${(aiData?.provider || 'openai').toUpperCase()} / ${aiData?.modelName || 'gpt-5.4'}`,
        },
        knowledgeBase: {
          ...prev.knowledgeBase,
          status: aiData?.kbSource && aiData.kbSource !== 'none' ? 'online' : 'warning',
          detail: formatKnowledgeBaseDetail(aiData),
        },
        crm: {
          ...prev.crm,
          status: crmItem?.status?.key === 'ready'
            ? 'online'
            : crmItem?.status?.key === 'partial'
              ? 'warning'
              : 'warning',
          detail: crmItem?.status?.key === 'ready'
            ? '有赞 CRM / 已完成联调'
            : crmItem?.status?.key === 'partial'
              ? '有赞 CRM / 部分配置'
              : '有赞 CRM / 待授权',
        },
        skillCenter: {
          ...prev.skillCenter,
          status: 'online',
          detail: totalCount > 0
            ? `已加载 樊文花Skill · 联调通道 ${readyCount}/${totalCount}`
            : '已加载 樊文花Skill',
        },
      }));
    } catch {
      setStatuses((prev) => ({
        ...prev,
        aiModel: { ...prev.aiModel, status: 'warning', detail: 'OPENAI / gpt-5.4' },
        knowledgeBase: { ...prev.knowledgeBase, status: 'online', detail: '智谱知识库 / franchise-brand-kb' },
        crm: { ...prev.crm, status: 'warning', detail: '有赞 CRM / 待授权' },
      }));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkStatuses();
    }, 0);

    return () => clearTimeout(timer);
  }, [checkStatuses]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'var(--color-success, #07C160)';
      case 'offline': return 'var(--color-error, #FF4D4F)';
      case 'warning': return 'var(--color-warning, #FAAD14)';
      default: return 'var(--color-text-tertiary)';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>📡</span>
        <span className={styles.headerTitle}>系统状态</span>
        <button className={styles.refreshBtn} onClick={checkStatuses}>
          🔄
        </button>
      </div>
      <div className={styles.statusGrid}>
        {Object.entries(statuses).map(([key, item]) => (
          <div key={key} className={styles.statusItem}>
            <div className={styles.statusDot} style={{ background: getStatusColor(item.status) }} />
            <div className={styles.statusInfo}>
              <span className={styles.statusLabel}>{item.label}</span>
              <span className={styles.statusDetail}>{item.detail || '检查中...'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
