'use client';

import { useState } from 'react';
import {
  FINANCIAL_STORE_MODELS,
} from '@/lib/skillBenchmarkData';
import styles from '@/app/(dashboard)/me/page.module.css';

export default function FinancialModelView() {
  const [selectedModel, setSelectedModel] = useState('standard');
  const model = FINANCIAL_STORE_MODELS.find(m => m.id === selectedModel);

  const getSensitivityData = (m) => {
    const bp = m.roi.paybackMonths;
    const br = parseInt(m.roi.annualROI);
    return [
      { scenario: '乐观', revenueRate: 1.2, costRate: 0.95, color: '#07C160', paybackMonths: Math.round(bp * 0.78), roi: `${Math.round(br * 1.26)}%` },
      { scenario: '中性', revenueRate: 1.0, costRate: 1.0, color: '#2563eb', paybackMonths: bp, roi: `${br}%` },
      { scenario: '保守', revenueRate: 0.8, costRate: 1.1, color: '#ef4444', paybackMonths: Math.round(bp * 1.44), roi: `${Math.round(br * 0.58)}%` },
    ];
  };

  const getCityComparisonData = (m) => {
    const bp = m.roi.paybackMonths;
    return [
      { tier: '一线城市', cities: '北上广深', payback: `${Math.round(bp * 1.11)}-${Math.round(bp * 1.33)}个月` },
      { tier: '新一线', cities: '杭州/成都/武汉', payback: `${Math.round(bp * 0.89)}-${Math.round(bp * 1.11)}个月` },
      { tier: '二线城市', cities: '佛山/东莞/昆明', payback: `${Math.round(bp * 0.78)}-${Math.round(bp * 1.0)}个月` },
      { tier: '三线城市', cities: '惠州/南宁/遵义', payback: `${Math.round(bp * 0.67)}-${Math.round(bp * 0.89)}个月` },
    ];
  };

  return (
    <>
      {/* 顶部：智能算账看板 */}
      <div className={styles.agentFormContainer} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: '1px solid #bfdbfe', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>智能招商测算器（终端辅助）</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', background: '#dbeafe', padding: '4px 10px', borderRadius: '12px' }}>
            AI 算账插件
          </div>
        </div>

        {/* 模型选择 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {FINANCIAL_STORE_MODELS.map(m => {
            const isSelected = selectedModel === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                style={{
                  background: isSelected ? m.color : '#fff',
                  color: isSelected ? '#fff' : '#64748b',
                  borderRadius: '16px',
                  padding: '16px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: isSelected ? `1px solid ${m.color}` : '1px solid #e2e8f0',
                  boxShadow: isSelected ? `0 4px 12px ${m.color}40` : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ fontSize: '20px' }}>{m.icon}</div>
                <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500 }}>{m.name}</div>
              </div>
            );
          })}
        </div>

        {/* 一键生成按钮 */}
        <button style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          一键生成【{model?.name}】对客测算报告并发送
        </button>
      </div>

      {model && (
        <>
          {/* 核心测算看板 */}
          <div className={styles.agentFormContainer} style={{ padding: '20px', borderRadius: '16px', marginTop: '20px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid #bbf7d0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '4px', height: '18px', background: '#166534', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#166534' }}>核心指标拆解向导</span>
            </div>

            {/* 数据指标 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '8px' }}>总投资额（含首批货）</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: model.color }}>{model.totalInvest}<span style={{ fontSize: '14px', marginLeft: '2px' }}>万</span></div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '8px' }}>月均预期营收</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>{model.monthly.revenue}<span style={{ fontSize: '14px', marginLeft: '2px' }}>万</span></div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '8px' }}>预计回本周期</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706' }}>{model.roi.paybackMonths}<span style={{ fontSize: '14px', marginLeft: '2px' }}>个月</span></div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '8px' }}>盈亏平衡点</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ca8a04' }}>{model.roi.breakEvenMonthly}<span style={{ fontSize: '14px', marginLeft: '2px' }}>万/月</span></div>
              </div>
            </div>

            {/* 资金组成条形图 */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginBottom: '16px' }}>前期投入资金占比明细</div>
              <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '20px' }}>
                {model.breakdown.map((item, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
                  return (
                    <div key={item.name} style={{ width: `${item.percent}%`, height: '100%', background: colors[index % colors.length] }} title={`${item.name} ${item.percent}%`} />
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {model.breakdown.map((item, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors[index % colors.length] }} />
                      <div style={{ flex: 1, fontSize: '12px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{item.amount}万</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 敏感性分析 (场景推演) */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #dcfce7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>AI 投资风险推演</div>
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>向客户展示不同市场环境下的抗风险能力与预测结果</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getSensitivityData(model).map(s => (
                  <div key={s.scenario} style={{ padding: '12px', background: `${s.color}08`, border: `1px solid ${s.color}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                        {s.scenario[0]}
                      </span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>{s.scenario}场景</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>营收波动 {s.revenueRate}x · 成本波动 {s.costRate}x</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: s.color }}>{s.paybackMonths}个月回本</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>年化 ROI {s.roi}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 城市级联测算 */}
            <div className={styles.agentFormContainer} style={{ padding: '20px', borderRadius: '16px', marginTop: '20px', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', border: '1px solid #fde68a', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '18px', background: '#d97706', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#b45309' }}>城市化差异自动矫正</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {getCityComparisonData(model).map(city => (
                  <div key={city.tier} style={{ padding: '12px', border: '1px solid #fef3c7', borderRadius: '12px', background: '#fff' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>{city.tier}</div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginBottom: '8px' }}>{city.cities}</div>
                    <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>回本预估：{city.payback}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
