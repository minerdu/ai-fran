'use client';

import { useState } from 'react';
import {
  BENCHMARK_BRANDS,
  FRANCHISE_STAGES,
  FANWENHUA_SKILLS,
} from '@/lib/skillBenchmarkData';
import styles from '@/app/(dashboard)/me/page.module.css';

// 奈瑞儿和美丽田园的 Skill 数据（简化版，结构与樊文花一致）
const NAIRUIER_SKILLS = Object.fromEntries(FRANCHISE_STAGES.map(s => [s.key, {
  rules: ['VIP客户优先接待', '48小时内完成高端画像建档', '医美关联需求识别'],
  scripts: ['欢迎关注奈瑞儿，我们是高端美容SPA品牌...', '请问您更关注面部抗衰还是身体SPA项目？'],
  metrics: { responseRate: '88%', firstCallRate: '80%', leadToQualified: '38%' },
  objections: [{ q: '投入太高', a: '高端定位带来高客单价，单客年消费可达3-5万' }],
  materials: ['品牌画册', 'VIP服务体系介绍', '会员储值方案'],
}]));

const MEILITIANYUAN_SKILLS = Object.fromEntries(FRANCHISE_STAGES.map(s => [s.key, {
  rules: ['城市合伙人优先审核', '多店型灵活匹配', '线上线下双渠道获客'],
  scripts: ['感谢关注美丽田园，我们提供灵活的加盟方案...', '您可以从社区店起步，后续升级为标准店或旗舰店'],
  metrics: { responseRate: '90%', firstCallRate: '82%', leadToQualified: '42%' },
  objections: [{ q: '品牌定位不够高端', a: '我们的多品牌矩阵覆盖各层级客群，综合竞争力强' }],
  materials: ['多店型对比手册', '城市合伙人方案', '品牌矩阵介绍'],
}]));

const BRAND_SKILL_MAP = {
  bench_fanwenhua: FANWENHUA_SKILLS,
  bench_nairuier: NAIRUIER_SKILLS,
  bench_meilitianyuan: MEILITIANYUAN_SKILLS,
};

const LINEAR_ICONS = {
  lead_capture: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  qualification: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  nurturing: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  policy_match: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  visit_invite: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  event_followup: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  negotiation: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  sign_push: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  silent_wake: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};

const SECTION_ICONS = {
  rules: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  scripts: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  metrics: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  objections: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  materials: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
};

export default function SkillCenterView() {
  const [selectedBrand, setSelectedBrand] = useState(BENCHMARK_BRANDS[0].id);
  const [selectedStage, setSelectedStage] = useState(FRANCHISE_STAGES[0].key);
  const [expandedSection, setExpandedSection] = useState('rules');

  const brand = BENCHMARK_BRANDS.find(b => b.id === selectedBrand);
  const skills = BRAND_SKILL_MAP[selectedBrand] || {};
  const stageSkill = skills[selectedStage] || {};
  const stageMeta = FRANCHISE_STAGES.find(s => s.key === selectedStage);

  const DETAIL_SECTIONS = [
    { key: 'rules', label: '环节规则', icon: SECTION_ICONS.rules },
    { key: 'scripts', label: '话术模板', icon: SECTION_ICONS.scripts },
    { key: 'metrics', label: '关键数据', icon: SECTION_ICONS.metrics },
    { key: 'objections', label: '异议处理', icon: SECTION_ICONS.objections },
    { key: 'materials', label: '物料清单', icon: SECTION_ICONS.materials },
  ];

  return (
    <>
      {/* 标杆企业选择 */}
      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#f59e0b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span>标杆企业</span>
        </div>
        <div className={styles.skillMeta} style={{ marginBottom: 12 }}>选择一个行业标杆企业，查看其招商全链路的规则、话术、数据和物料拆解。</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BENCHMARK_BRANDS.map(b => (
            <div
              key={b.id}
              className={styles.skillItem}
              onClick={() => { setSelectedBrand(b.id); setSelectedStage(FRANCHISE_STAGES[0].key); }}
              style={{
                cursor: 'pointer',
                border: selectedBrand === b.id ? `2px solid ${b.color}` : '2px solid transparent',
                background: selectedBrand === b.id ? `${b.color}08` : undefined,
                padding: 14,
                borderRadius: 12,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: 28 }}>{b.logo}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={styles.skillName} style={{ fontSize: 15 }}>{b.name}</span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 6, background: `${b.color}15`, color: b.color, fontWeight: 600 }}>
                      {b.storeCount}门店
                    </span>
                  </div>
                  <div className={styles.skillMeta}>{b.tagline}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {b.highlights.slice(0, 3).map(h => (
                      <span key={h} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>{h}</span>
                    ))}
                  </div>
                </div>
              </div>
              <span className={styles.skillStatus} style={{
                background: selectedBrand === b.id ? `${b.color}18` : '#f1f5f9',
                color: selectedBrand === b.id ? b.color : '#94a3b8',
              }}>
                {selectedBrand === b.id ? '当前选择' : '查看'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 9大招商环节选择 */}
      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <span style={{ fontSize: 16 }}>{brand?.logo}</span>
          <span>{brand?.name} — 招商环节拆解</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {FRANCHISE_STAGES.map(s => {
            const isSelected = selectedStage === s.key;
            return (
              <div
                key={s.key}
                onClick={() => setSelectedStage(s.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 8px',
                  borderRadius: '12px',
                  background: isSelected ? `${s.color}10` : '#f8fafc',
                  border: `1px solid ${isSelected ? s.color : 'transparent'}`,
                  color: isSelected ? s.color : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 2px 8px ${s.color}20` : 'none'
                }}
              >
                <div style={{ 
                  color: isSelected ? s.color : '#94a3b8',
                  background: isSelected ? '#fff' : 'transparent',
                  padding: isSelected ? '6px' : '0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? `0 1px 3px ${s.color}30` : 'none',
                  transition: 'all 0.2s'
                }}>
                  {LINEAR_ICONS[s.key]}
                </div>
                <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* 当前环节详情 - 瀑布流/Feed式展示 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
             <div style={{ width: '4px', height: '18px', background: stageMeta?.color, borderRadius: '2px' }}></div>
             <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
               {stageMeta?.label} <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '13px', marginLeft: '4px' }}>| {brand?.name}执行标准</span>
             </span>
          </div>

          {/* 规则 */}
          {(stageSkill.rules?.length > 0) && (
            <div style={{ background: '#f0f9ff', borderRadius: '16px', border: '1px solid #e0f2fe', padding: '20px', boxShadow: '0 2px 8px rgba(2,132,199,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#0369a1', marginBottom: '16px' }}>
                <span style={{ color: '#0284c7' }}>{SECTION_ICONS.rules}</span> 环节规则
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {stageSkill.rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f0f9ff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '14.5px', color: '#1e293b', lineHeight: 1.6 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 话术模板 */}
          {(stageSkill.scripts?.length > 0) && (
            <div style={{ background: '#f5f3ff', borderRadius: '16px', border: '1px solid #ede9fe', padding: '20px', boxShadow: '0 2px 8px rgba(124,58,237,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#5b21b6', marginBottom: '20px' }}>
                <span style={{ color: '#7c3aed' }}>{SECTION_ICONS.scripts}</span> 话术模板
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '4px' }}>
                {stageSkill.scripts.map((script, i) => (
                  <div key={i} style={{ position: 'relative', padding: '16px 20px', background: '#ffffff', borderRadius: '0 16px 16px 16px', borderLeft: `4px solid #8b5cf6`, fontSize: '14.5px', color: '#1e293b', lineHeight: 1.6, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ position: 'absolute', top: '-14px', left: '12px', background: '#ffffff', padding: '2px 10px', fontSize: '12px', color: '#6d28d9', fontWeight: 700, border: '1px solid #ede9fe', borderRadius: '8px' }}>话术 {i + 1}</div>
                    "{script}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 关键数据 */}
          {stageSkill.metrics && Object.keys(stageSkill.metrics).length > 0 && (
            <div style={{ background: '#f0fdf4', borderRadius: '16px', border: '1px solid #dcfce7', padding: '20px', boxShadow: '0 2px 8px rgba(16,185,129,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#047857', marginBottom: '16px' }}>
                <span style={{ color: '#10b981' }}>{SECTION_ICONS.metrics}</span> 关键数据
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {Object.entries(stageSkill.metrics).map(([k, v]) => {
                  const labelMap = { responseRate: '响应率', firstCallRate: '首次通话率', leadToQualified: '建档转化率', qualificationRate: '通过率', avgAssessTime: '平均评估时间', dropRate: '流失率', nurtureToVisit: '培育→考察', avgNurtureDays: '平均培育天数', contentOpenRate: '内容打开率', policyMatchRate: '政策匹配率', avgNegotiationRounds: '平均谈判轮次', discountUsage: '优惠使用率', visitToSign: '考察→签约', avgVisitDuration: '平均考察时长', satisfactionRate: '满意度', postEventFollowRate: '会后跟进率', eventToVisit: '会务→考察', noShowRecovery: '未到场挽回', negotiationToSign: '谈判→签约', avgNegotiationDays: '平均谈判天数', priceAcceptRate: '价格接受率', signCompletionRate: '签约完成率', avgSignToOpenDays: '签约→开业', contractDisputeRate: '合同争议率', wakeUpRate: '唤醒成功率', reactivationToSign: '激活→签约', avgSilentDays: '平均沉默天数' };
                  return (
                    <div key={k} style={{ padding: '16px 8px', background: '#ffffff', borderRadius: '14px', textAlign: 'center', border: '1px solid #ecfdf5', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>{v}</div>
                      <div style={{ fontSize: '12px', color: '#047857', marginTop: '6px', fontWeight: 600 }}>{labelMap[k] || k}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 异议处理 */}
          {(stageSkill.objections?.length > 0) && (
            <div style={{ background: '#fff1f2', borderRadius: '16px', border: '1px solid #ffe4e6', padding: '20px', boxShadow: '0 2px 8px rgba(225,29,72,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#be123c', marginBottom: '16px' }}>
                <span style={{ color: '#e11d48' }}>{SECTION_ICONS.objections}</span> 常见异议处理
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {stageSkill.objections.map((obj, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#ffffff', borderRadius: '14px', border: '1px solid #ffe4e6', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '14.5px', fontWeight: 700, color: '#e11d48' }}>
                      <span style={{ marginRight: '8px', flexShrink: 0, marginTop: '2px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </span>
                      {obj.q}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '14px', color: '#1e293b', lineHeight: 1.6 }}>
                      <span style={{ marginRight: '8px', flexShrink: 0, marginTop: '2px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      {obj.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 物料清单 */}
          {(stageSkill.materials?.length > 0) && (
            <div style={{ background: '#fffbeb', borderRadius: '16px', border: '1px solid #fef3c7', padding: '20px', boxShadow: '0 2px 8px rgba(217,119,6,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#92400e', marginBottom: '16px' }}>
                <span style={{ color: '#d97706' }}>{SECTION_ICONS.materials}</span> 物料清单
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stageSkill.materials.map((mat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                      <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#78350f' }}>{mat}</span>
                    </div>
                    <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '8px', background: '#dcfce7', color: '#059669', fontWeight: 700 }}>可用</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skill 使用说明 */}
      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2563eb' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>使用说明</span>
        </div>
        <div className={styles.skillMeta} style={{ lineHeight: 1.8 }}>
          Skill 中心是行业标杆企业的招商拆解与数据中心。选择标杆企业后，可查看其在9大招商环节的执行规则、话术、关键数据、异议处理和物料清单。您可以在「品牌建模」中基于这些标杆内容进行本地化改造，生成适合自己企业的招商体系。
        </div>
      </div>
    </>
  );
}
