'use client';

const METRICS = [
  { key: 'targetLeads', label: '目标线索', unit: '条', color: '#2563eb' },
  { key: 'predictedAttendanceRate', label: '预测到会率', unit: '', color: '#07C160' },
  { key: 'predictedSignRate', label: '预测签约率', unit: '', color: '#f59e0b' },
  { key: 'predictedROI', label: '预测 ROI', unit: '', color: '#8b5cf6' },
  { key: 'budget', label: '预算投入', unit: '', color: '#ef4444' },
  { key: 'predictedContractRate', label: '预测合同转化率', unit: '', color: '#14b8a6' },
];

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (parseFloat(value) / max) * 100));
  return (
    <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: color, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function StrategyForecastCard({ playbook, style }) {
  if (!playbook) return null;

  const metrics = METRICS.map(m => ({
    ...m,
    value: playbook[m.key] ?? '--',
  })).filter(m => m.value !== '--' && m.value !== undefined && m.value !== null);

  return (
    <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', ...style }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ color: '#f59e0b' }}><path d="M21 3L14.5 21a.55.55 0 0 1-1 0L10 14 3 10.5a.55.55 0 0 1 0-1L21 3z"/></svg>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>策略预测 · {playbook.title || '当前方案'}</span>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {metrics.map(m => (
          <div key={m.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{m.label}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: m.color }}>{m.value}{m.unit}</span>
            </div>
            {typeof m.value === 'number' || (typeof m.value === 'string' && !isNaN(parseFloat(m.value))) ? (
              <ProgressBar value={parseFloat(m.value)} max={m.key.includes('Rate') ? 1 : m.key === 'predictedROI' ? 5 : 200} color={m.color} />
            ) : null}
          </div>
        ))}
      </div>

      {/* Risk & Opportunities */}
      {(playbook.risks?.length > 0 || playbook.opportunities?.length > 0) && (
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: '10px' }}>
          {playbook.risks?.length > 0 && (
            <div style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#fef2f2' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>⚠ 风险</div>
              {playbook.risks.slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#b91c1c' }}>· {r}</div>
              ))}
            </div>
          )}
          {playbook.opportunities?.length > 0 && (
            <div style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#f0fdf4' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#07C160', marginBottom: '4px' }}>✦ 机会</div>
              {playbook.opportunities.slice(0, 3).map((o, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#15803d' }}>· {o}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
