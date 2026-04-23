'use client';

import { useMemo } from 'react';

/**
 * LeadStateMachineViz — 线索状态机可视化
 *
 * 展示线索从「线索池」到「已签约」的正向流转路径，
 * 以及 rejected→线索池、no_show→线索池 等回流路径。
 *
 * Props:
 *   currentStage: string — 当前阶段 key
 *   stageHistory: array  — 阶段变更历史 [{fromStage, toStage, reason, createdAt, actor}]
 */

const STAGES = [
  { key: 'pool', label: '线索池', color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'qualified', label: '已建档', color: '#2563eb', bg: '#eff6ff' },
  { key: 'negotiating', label: '谈判中', color: '#d97706', bg: '#fffbeb' },
  { key: 'signed', label: '已签约', color: '#16a34a', bg: '#f0fdf4' },
];

const SIDE_STAGES = [
  { key: 'rejected', label: '暂不匹配', color: '#dc2626', bg: '#fef2f2' },
  { key: 'silent', label: '沉默待激活', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'no_show', label: '未到场', color: '#ea580c', bg: '#fff7ed' },
];

const REFLUX_PATHS = [
  { from: 'rejected', to: 'pool', label: '重新培育', style: 'dashed' },
  { from: 'silent', to: 'pool', label: '激活回流', style: 'dashed' },
  { from: 'no_show', to: 'pool', label: '重新邀约', style: 'dashed' },
  { from: 'negotiating', to: 'silent', label: '沉默', style: 'dotted' },
  { from: 'qualified', to: 'rejected', label: '拒绝', style: 'dotted' },
];

const containerStyle = {
  padding: '16px',
  overflowX: 'auto',
};

const svgWrapStyle = {
  position: 'relative',
  width: '100%',
  minWidth: 480,
};

const nodeBaseStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  border: '2px solid',
  transition: 'all 0.3s ease',
  position: 'absolute',
  minWidth: 76,
  textAlign: 'center',
  zIndex: 2,
};

const currentGlow = {
  boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.18), 0 2px 12px rgba(37, 99, 235, 0.15)',
  transform: 'scale(1.08)',
};

const visitedDot = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22c55e',
  marginTop: 4,
};

export default function LeadStateMachineViz({ currentStage = 'pool', stageHistory = [] }) {
  const visitedStages = useMemo(() => {
    const set = new Set();
    set.add(currentStage);
    (stageHistory || []).forEach((h) => {
      if (h.fromStage) set.add(h.fromStage);
      if (h.toStage) set.add(h.toStage);
    });
    return set;
  }, [currentStage, stageHistory]);

  const hasReflux = useMemo(() => {
    return (stageHistory || []).some(
      (h) =>
        (h.fromStage === 'rejected' && h.toStage === 'pool') ||
        (h.fromStage === 'silent' && h.toStage === 'pool') ||
        (h.fromStage === 'no_show' && h.toStage === 'pool')
    );
  }, [stageHistory]);

  // Layout coordinates (percentage-based for responsive)
  const mainY = 30;
  const sideY = 110;
  const nodeW = 80;
  const nodeH = 40;
  const positions = {
    pool: { x: 20, y: mainY },
    qualified: { x: 140, y: mainY },
    negotiating: { x: 260, y: mainY },
    signed: { x: 380, y: mainY },
    rejected: { x: 80, y: sideY },
    silent: { x: 210, y: sideY },
    no_show: { x: 340, y: sideY },
  };

  const allStages = [...STAGES, ...SIDE_STAGES];

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 6 }}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        线索状态机
        {hasReflux && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#16a34a', fontWeight: 500, background: '#f0fdf4', padding: '2px 8px', borderRadius: 10 }}>
            含回流路径
          </span>
        )}
      </div>

      <div style={{ ...svgWrapStyle, height: 170 }}>
        {/* SVG for arrows */}
        <svg
          width="100%"
          height="170"
          viewBox="0 0 480 170"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          <defs>
            <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#22c55e" />
            </marker>
            <marker id="arrowGray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#94a3b8" />
            </marker>
            <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#dc2626" />
            </marker>
            <marker id="arrowReflux" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#16a34a" />
            </marker>
          </defs>

          {/* Main forward arrows */}
          {STAGES.slice(0, -1).map((stage, i) => {
            const from = positions[stage.key];
            const to = positions[STAGES[i + 1].key];
            return (
              <line
                key={`fwd-${stage.key}`}
                x1={from.x + nodeW}
                y1={from.y + nodeH / 2}
                x2={to.x}
                y2={to.y + nodeH / 2}
                stroke="#22c55e"
                strokeWidth="2"
                markerEnd="url(#arrowGreen)"
              />
            );
          })}

          {/* Side paths: drop-off arrows */}
          <line x1={positions.qualified.x + nodeW / 2} y1={positions.qualified.y + nodeH}
                x2={positions.rejected.x + nodeW / 2} y2={positions.rejected.y}
                stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowRed)" />
          <line x1={positions.negotiating.x + nodeW / 2} y1={positions.negotiating.y + nodeH}
                x2={positions.silent.x + nodeW / 2} y2={positions.silent.y}
                stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowRed)" />

          {/* Reflux arrows (curved) */}
          <path
            d={`M${positions.rejected.x + nodeW / 2},${positions.rejected.y} Q${positions.rejected.x - 20},${mainY + nodeH / 2} ${positions.pool.x + nodeW / 2},${positions.pool.y + nodeH}`}
            fill="none" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#arrowReflux)"
          />
          <path
            d={`M${positions.silent.x},${positions.silent.y} Q${positions.pool.x + nodeW + 10},${sideY - 15} ${positions.pool.x + nodeW},${positions.pool.y + nodeH}`}
            fill="none" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#arrowReflux)"
          />
          <path
            d={`M${positions.no_show.x},${positions.no_show.y} Q${positions.pool.x + nodeW + 40},${sideY + 15} ${positions.pool.x + nodeW / 2},${positions.pool.y + nodeH}`}
            fill="none" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#arrowReflux)"
          />

          {/* Reflux labels */}
          <text x={positions.rejected.x - 18} y={mainY + nodeH + 16} fill="#16a34a" fontSize="9" fontWeight="500">重新培育</text>
          <text x={positions.pool.x + nodeW + 5} y={sideY - 8} fill="#16a34a" fontSize="9" fontWeight="500">激活回流</text>
          <text x={positions.pool.x + nodeW + 30} y={sideY + 22} fill="#16a34a" fontSize="9" fontWeight="500">重新邀约</text>
        </svg>

        {/* Stage nodes */}
        {allStages.map((stage) => {
          const pos = positions[stage.key];
          if (!pos) return null;
          const isCurrent = stage.key === currentStage;
          const isVisited = visitedStages.has(stage.key);
          return (
            <div
              key={stage.key}
              style={{
                ...nodeBaseStyle,
                left: pos.x,
                top: pos.y,
                width: nodeW,
                height: nodeH,
                color: stage.color,
                background: isCurrent ? stage.bg : isVisited ? `${stage.bg}` : '#f8fafc',
                borderColor: isCurrent ? stage.color : isVisited ? `${stage.color}66` : '#e2e8f0',
                opacity: isVisited || isCurrent ? 1 : 0.5,
                ...(isCurrent ? currentGlow : {}),
              }}
            >
              <span>{stage.label}</span>
              {isVisited && !isCurrent && <div style={visitedDot} />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: '#22c55e', label: '正向流转', line: 'solid' },
          { color: '#dc2626', label: '跌出路径', line: 'dashed' },
          { color: '#16a34a', label: '回流路径', line: 'dashed' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            <svg width="20" height="8">
              <line x1="0" y1="4" x2="20" y2="4" stroke={item.color} strokeWidth="2"
                    strokeDasharray={item.line === 'dashed' ? '4 3' : 'none'} />
            </svg>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
