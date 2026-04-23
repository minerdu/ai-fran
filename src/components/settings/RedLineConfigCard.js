'use client';

import { useEffect, useState } from 'react';
import SafetyFilters from './SafetyFilters';
import styles from '@/app/(dashboard)/me/page.module.css';

export default function RedLineConfigCard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch('/api/safety-rules')
      .then((res) => res.json())
      .then((data) => {
        setSummary({
          stopKeywords: data.stop_keywords?.length || 0,
          financialKeywords: data.financial_keywords?.length || 0,
          journeyBlocks: data.journey_blocks?.length || 0,
          dailyLimit: data.daily_limit?.value || '100',
        });
      })
      .catch(() => {
        setSummary({
          stopKeywords: 0,
          financialKeywords: 0,
          journeyBlocks: 0,
          dailyLimit: '100',
        });
      });
  }, []);

  return (
    <>
      <div className={styles.sectionCard} style={{ flexShrink: 0 }}>
        <div className={styles.sectionTitle}>🚨 红线与安全规则 <span style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'var(--color-primary-bg)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>已更新</span></div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
          统一管理招商政策、收益承诺、财务表述、资料外发和旅程禁止打扰边界。
        </p>
        <div className={styles.reportGrid}>
          <div className={styles.reportCard} style={{ background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)' }}>
            <div className={styles.reportNum} style={{ color: '#DC2626' }}>{summary?.stopKeywords ?? '-'}</div>
            <div className={styles.reportLabel} style={{ color: '#b91c1c' }}>强拦截关键词</div>
          </div>
          <div className={styles.reportCard} style={{ background: 'linear-gradient(135deg, #FFF7E6, #FDE68A)' }}>
            <div className={styles.reportNum} style={{ color: '#D97706' }}>{summary?.financialKeywords ?? '-'}</div>
            <div className={styles.reportLabel} style={{ color: '#b45309' }}>财务敏感词</div>
          </div>
          <div className={styles.reportCard} style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
            <div className={styles.reportNum} style={{ color: '#2563EB' }}>{summary?.journeyBlocks ?? '-'}</div>
            <div className={styles.reportLabel} style={{ color: '#1d4ed8' }}>旅程禁扰规则</div>
          </div>
          <div className={styles.reportCard} style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' }}>
            <div className={styles.reportNum} style={{ color: '#16A34A' }}>{summary?.dailyLimit ?? '-'}</div>
            <div className={styles.reportLabel} style={{ color: '#15803d' }}>日触达上限</div>
          </div>
        </div>
      </div>

      <div className={styles.sectionCard} style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
        <SafetyFilters />
      </div>
    </>
  );
}
