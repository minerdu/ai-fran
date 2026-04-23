'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './SystemStatusPanel.module.css';

/**
 * 系统状态面板
 * 展示 AI 模型连通性、知识库、CRM 连接状态、Skill中心状态
 * 复刻自 AI-Sales SystemStatusPanel，第4项改为 Skill中心
 */
export default function SystemStatusPanel() {
  const [statuses, setStatuses] = useState({
    aiModel: { status: 'offline', label: 'AI 大模型', detail: 'openai / gpt-5.4' },
    knowledgeBase: { status: 'warning', label: '知识库', detail: '待配置' },
    crm: { status: 'warning', label: 'CRM系统', detail: '等待联调' },
    skillCenter: { status: 'online', label: 'Skill中心', detail: '内置 3 个标杆 Skill' },
  });

  const checkStatuses = useCallback(async () => {
    try {
      const [aiRes, readinessRes] = await Promise.all([
        fetch('/api/settings/ai-model', { cache: 'no-store' }),
        fetch('/api/integrations/readiness', { cache: 'no-store' }),
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
          detail: aiData?.enabled
            ? `${aiData.provider || 'openai'} / ${aiData.modelName || '未命名模型'}`
            : '未启用',
        },
        knowledgeBase: {
          ...prev.knowledgeBase,
          status: aiData?.kbSource && aiData.kbSource !== 'default' ? 'online' : 'warning',
          detail: aiData?.kbSource && aiData.kbSource !== 'default'
            ? `${aiData.kbSource}${aiData.kbId ? ` / ${aiData.kbId}` : ''}`
            : '使用默认知识上下文',
        },
        crm: {
          ...prev.crm,
          status: crmItem?.status?.key === 'ready'
            ? 'online'
            : crmItem?.status?.key === 'partial'
              ? 'warning'
              : 'offline',
          detail: crmItem
            ? `${crmItem.status.label} / ${crmItem.name}`
            : '未发现联调配置',
        },
        skillCenter: {
          ...prev.skillCenter,
          status: 'online',
          detail: totalCount > 0 ? `联调通道 ${readyCount}/${totalCount} 已就绪` : prev.skillCenter.detail,
        },
      }));
    } catch {
      setStatuses((prev) => ({
        ...prev,
        aiModel: { ...prev.aiModel, status: 'offline', detail: '状态检查失败' },
        knowledgeBase: { ...prev.knowledgeBase, status: 'warning', detail: '状态检查失败' },
        crm: { ...prev.crm, status: 'warning', detail: '状态检查失败' },
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
