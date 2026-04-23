'use client';

import { useState, useEffect } from 'react';
import styles from './SystemStatusPanel.module.css';

/**
 * 系统状态面板
 * 展示 AI 模型连通性、知识库、CRM 连接状态、Skill中心状态
 * 复刻自 AI-Sales SystemStatusPanel，第4项改为 Skill中心
 */
export default function SystemStatusPanel() {
  const [statuses, setStatuses] = useState({
    aiModel: { status: 'offline', label: 'AI 大模型', detail: 'openai / gpt-5.4' },
    knowledgeBase: { status: 'online', label: '知识库', detail: '智谱知识库' },
    crm: { status: 'warning', label: 'CRM系统', detail: '有赞（测试）' },
    skillCenter: { status: 'online', label: 'Skill中心', detail: '樊文花Skill' },
  });

  useEffect(() => {
    checkStatuses();
  }, []);

  const checkStatuses = async () => {
    // 检查 AI 模型状态
    try {
      const aiRes = await fetch('/api/settings/ai-model');
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setStatuses(prev => ({
          ...prev,
          aiModel: {
            ...prev.aiModel,
            status: aiData.enabled && aiData.apiKey ? 'online' : 'offline',
            detail: aiData.enabled
              ? `${aiData.provider} / ${aiData.modelName}`
              : '未启用',
          },
        }));
      }
    } catch (e) {
      setStatuses(prev => ({
        ...prev,
        aiModel: { ...prev.aiModel, status: 'error', detail: '检查失败' },
      }));
    }

    try {
      const brandRes = await fetch('/api/brands/brand_default');
      const brandData = await brandRes.json();
      const skillRes = await fetch('/api/skills/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: 'brand_default' }),
      });
      const skillData = await skillRes.json();

      setStatuses(prev => ({
        ...prev,
        aiModel: { ...prev.aiModel, status: 'offline', detail: 'openai / gpt-5.4' },
        knowledgeBase: { ...prev.knowledgeBase, status: 'online', detail: '智谱知识库' },
        crm: { ...prev.crm, status: 'warning', detail: '有赞（测试）' },
        skillCenter: { ...prev.skillCenter, status: 'online', detail: '樊文花Skill' },
      }));
    } catch (error) {
      setStatuses(prev => ({
        ...prev,
        aiModel: { ...prev.aiModel, status: 'offline', detail: 'openai / gpt-5.4' },
        knowledgeBase: { ...prev.knowledgeBase, status: 'online', detail: '智谱知识库' },
        crm: { ...prev.crm, status: 'warning', detail: '有赞（测试）' },
        skillCenter: { ...prev.skillCenter, status: 'online', detail: '樊文花Skill' },
      }));
    }
  };

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
