'use client';

import { useState } from 'react';

const COMPARE_FIELDS = [
  { key: 'mode', label: '方案模式' },
  { key: 'strategy', label: '执行策略' },
  { key: 'budget', label: '预算' },
  { key: 'predictedROI', label: '预测 ROI' },
  { key: 'targetLeads', label: '目标线索' },
  { key: 'predictedSignRate', label: '预测签约率' },
  { key: 'meetingStrategy', label: '会务策略' },
  { key: 'fissionStrategy', label: '裂变策略' },
  { key: 'storeModelRecommendation', label: '店型推荐' },
  { key: 'policyRecommendation', label: '政策推荐' },
];

export default function PlaybookComparePanel({ playbooks = [], onSelect, onClose }) {
  const [highlighted, setHighlighted] = useState(null);
  const items = playbooks.slice(0, 3);

  if (items.length < 2) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
        至少需要 2 个方案才能对比
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ color: 'var(--color-primary)' }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          方案对比 ({items.length} 套)
        </span>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>✕</button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-light)', width: '120px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>维度</th>
              {items.map((pb, i) => (
                <th key={pb.id || i} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: highlighted === i ? 'var(--color-primary)' : 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', background: highlighted === i ? '#f0fdf4' : '#f8fafc', transition: 'all 0.15s' }}
                  onClick={() => setHighlighted(highlighted === i ? null : i)}
                >
                  {pb.title || `方案 ${i + 1}`}
                  {pb.isRecommended && <span style={{ fontSize: '10px', marginLeft: '4px', padding: '1px 5px', borderRadius: '4px', background: '#07C160', color: '#fff' }}>推荐</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_FIELDS.map((field) => (
              <tr key={field.key}>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-light)', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>{field.label}</td>
                {items.map((pb, i) => {
                  const val = pb[field.key] ?? '--';
                  const isBest = items.length > 1 && field.key === 'predictedROI' && items.every((other, j) => j === i || (parseFloat(val) || 0) >= (parseFloat(other[field.key]) || 0));
                  return (
                    <td key={pb.id || i} style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--color-border-light)', background: highlighted === i ? '#f0fdf4' : 'transparent', color: isBest ? '#07C160' : 'var(--color-text-primary)', fontWeight: isBest ? 700 : 400, transition: 'all 0.15s' }}>
                      {val}
                      {isBest && <span style={{ fontSize: '10px', display: 'block', color: '#07C160' }}>最优</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action */}
      {onSelect && (
        <div style={{ display: 'flex', gap: '8px', padding: '14px 16px', borderTop: '1px solid var(--color-border-light)' }}>
          {items.map((pb, i) => (
            <button key={pb.id || i} onClick={() => onSelect(pb)} style={{
              flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              background: pb.isRecommended ? 'var(--color-primary)' : '#f1f5f9',
              color: pb.isRecommended ? '#fff' : 'var(--color-text-primary)',
              border: 'none',
            }}>
              选择 {pb.title || `方案 ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
