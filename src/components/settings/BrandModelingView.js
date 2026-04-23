'use client';

import { useEffect, useState } from 'react';
import { BRAND_MODEL_SECTIONS, BRAND_MODEL_COMPLETION } from '@/lib/skillBenchmarkData';
import styles from '@/app/(dashboard)/me/page.module.css';

const SCRIPT_STAGES = [
  { key: 'lead_capture', label: '线索接待' },
  { key: 'qualification', label: '资格评估' },
  { key: 'nurturing', label: '线索培育' },
  { key: 'policy_match', label: '政策匹配' },
  { key: 'visit_invite', label: '总部考察' },
  { key: 'negotiation', label: '报价谈判' },
  { key: 'sign_push', label: '签约推进' },
  { key: 'silent_wake', label: '沉默激活' },
];

const SAMPLE_SCRIPTS = {
  lead_capture: [
    '您好！这里是樊文花面部护理总部招商中心。恭喜您通过了我们初步的品牌关注筛选。樊文花深耕美业30余年，目前全国门店已突破6000家，是面部护理领域的绝对头部品牌。',
    '请问您之前是否有从事过美业相关的经营管理经验？或者您目前是否有已经看好的意向店面或商圈资源？'
  ],
  qualification: [
    '王总您好，为了给您提供最精准的区域盈利测算，我们需要了解一下您的资金规划。咱们在目标城市开店的初始预备金大概是多少呢？',
    '另外，樊文花非常看重加盟伙伴的经营理念。您对『重服务、轻推销』的面部护理模式有什么自己的看法吗？我们需要确保双方的长期发展目标一致。'
  ],
  nurturing: [
    '【捷报】王总，与您情况非常类似的李姐，上个月新开的社区店，通过总部的拓客支持，首月业绩已经突破了20万！我把她从选址到开业的详细复盘报告发您看看。',
    '明天晚上8点，我们的招商总监会在内部直播间详细拆解最新的《樊文花单店盈利模型》，里面讲到了很多避坑指南，我帮您申请了一个VIP观摩名额，记得准时来看看哦。'
  ],
  policy_match: [
    '王总，根据您所在城市的级别和您的资金情况，我为您匹配了『标准社区店』模型。目前针对您所在的区域有『首批物料全额补贴』的限时政策，可以直接为您省下约3万元的前期投入。',
    '考虑到您的选址在大型社区周边，我们会给您匹配额外3公里的独家经营保护圈，这部分协议我们会直接写进合同里，保障您的长期利益。'
  ],
  visit_invite: [
    '百闻不如一见，王总，我们诚挚地邀请您下周来广州总部进行为期1.5天的实地考察。期间不仅会带您参观总部的研发中心和商学院，还会去两家真实的盈利门店做深度暗访。',
    '为了表达诚意，您此次考察的落地交通和住宿由我们全权安排。您看下周四或者周五，哪天对您来说更方便出行？'
  ],
  negotiation: [
    '关于加盟费的问题，王总。市场上确实有几万元就能加盟的牌子，但樊文花提供的是从找店、装修、培训、拓客到后期督导的全生命周期托管服务。这15万的加盟费对应的是6000家店验证过的盈利系统，也就是为您买了一份『确定性』。',
    '如果您对前期的资金压力有顾虑，我们可以帮您申请『保证金分期』或者『装修补贴直接抵扣』的方案，最大限度降低您的启动门槛。'
  ],
  sign_push: [
    '王总，合同的核心条款刚才法务已经为您逐条解读过了，包括区域保护、违约责任和总部的扶持承诺都白纸黑字写得很清楚。如果没有其他疑问，我们今天就走线上电子签流转。',
    '一旦签约，总部的选址团队和商学院的培训老师明天就会正式拉群启动您的开店筹建工作，我们争取在45天内让您的店面顺利开业迎客！'
  ],
  silent_wake: [
    '王总好久不见！最近有一个好消息必须跟您同步一下：公司刚推出了针对下沉市场的『微型门店』新政策，整体投资门槛直接降到了20万以内，之前您担心的资金问题现在完全不是问题了。',
    '就在上周，您之前看好的那个商圈，有个点位被其他加盟商拿下了。如果您现在还有想法，我立刻帮您查询一下周边还有没有未锁定的优质点位资源。'
  ],
};

const SECTION_COLORS = {
  profile: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe', activeBg: '#3b82f6' },
  storeModels: { bg: '#fdf4ff', text: '#c026d3', border: '#fae8ff', activeBg: '#d946ef' },
  policies: { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5', activeBg: '#f97316' },
  enablement: { bg: '#f0fdf4', text: '#16a34a', border: '#dcfce7', activeBg: '#22c55e' },
  risks: { bg: '#fef2f2', text: '#dc2626', border: '#fee2e2', activeBg: '#ef4444' },
  scripts: { bg: '#f0fdfa', text: '#0d9488', border: '#ccfbf1', activeBg: '#14b8a6' },
};

const SECTION_ICONS = {
  profile: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  storeModels: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  policies: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  enablement: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  risks: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  scripts: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const STAGE_ICONS = {
  lead_capture: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  qualification: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  nurturing: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  policy_match: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  visit_invite: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  negotiation: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  sign_push: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
  silent_wake: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
};

export default function BrandModelingView() {
  const [activeSection, setActiveSection] = useState('profile');
  const [editingField, setEditingField] = useState(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);

  const currentSection = BRAND_MODEL_SECTIONS.find(s => s.key === activeSection);
  const overallCompletion = Math.round(BRAND_MODEL_COMPLETION.reduce((s, c) => s + c.percent, 0) / BRAND_MODEL_COMPLETION.length);

  const handleAIAnalyze = () => {
    setIsAIAnalyzing(true);
    setTimeout(() => setIsAIAnalyzing(false), 3000);
  };

  return (
    <>
      {/* 建模完成度 */}
      <div className={styles.agentFormContainer} style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>建模完成度</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: overallCompletion >= 80 ? '#059669' : '#d97706', lineHeight: 1 }}>{overallCompletion}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '2px' }}>%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {BRAND_MODEL_COMPLETION.map(item => (
            <div key={item.section} style={{ background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{item.section}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: item.percent >= 90 ? '#059669' : item.percent >= 70 ? '#d97706' : '#ef4444' }}>{item.percent}%</span>
              </div>
              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${item.percent}%`, height: '100%', borderRadius: '3px', background: item.percent >= 90 ? '#10b981' : item.percent >= 70 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleAIAnalyze} disabled={isAIAnalyzing} style={{ marginTop: '20px', width: '100%', padding: '12px', background: 'linear-gradient(to right, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isAIAnalyzing ? 'not-allowed' : 'pointer', opacity: isAIAnalyzing ? 0.8 : 1, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(124,58,237,0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          {isAIAnalyzing ? 'AI 深度分析中...' : 'AI 自动补全缺失项'}
        </button>
      </div>

      {/* 分区切换 (Grid layout) */}
      <div className={styles.agentFormContainer} style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <div style={{ width: '4px', height: '18px', background: '#14b8a6', borderRadius: '2px' }}></div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>品牌数据中心</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[...BRAND_MODEL_SECTIONS, { key: 'scripts', title: '招商话术库' }].map(s => {
            const isSelected = activeSection === s.key;
            const colors = SECTION_COLORS[s.key] || SECTION_COLORS.profile;
            return (
              <div
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                style={{
                  background: isSelected ? colors.activeBg : '#fff',
                  color: isSelected ? '#fff' : colors.text,
                  borderRadius: '16px',
                  padding: '16px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: isSelected ? `1px solid ${colors.activeBg}` : `1px solid ${colors.border}`,
                  boxShadow: isSelected ? `0 4px 16px ${colors.activeBg}40` : '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ color: isSelected ? '#fff' : colors.activeBg, transform: 'scale(0.9)' }}>{SECTION_ICONS[s.key]}</div>
                <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 600 }}>{s.title}</div>
              </div>
            );
          })}
        </div>

        {/* 下方内容区 */}
        {activeSection === 'scripts' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: `linear-gradient(to right, ${SECTION_COLORS.scripts.bg}, #ffffff)`, padding: '12px 16px', borderRadius: '16px', border: `1px solid ${SECTION_COLORS.scripts.border}` }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>全流程话术库</div>
                  <button style={{ padding: '6px 12px', background: SECTION_COLORS.scripts.activeBg, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', boxShadow: `0 2px 6px ${SECTION_COLORS.scripts.activeBg}40` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    AI 自动补全
                  </button>
               </div>
               <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>包含从线索接待到签约推进的8个关键转化节点</div>
            </div>

            {SCRIPT_STAGES.map(stage => {
              const scripts = SAMPLE_SCRIPTS[stage.key] || [];
              if (scripts.length === 0) return null;
              return (
                <div key={stage.key} style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#0f766e', fontWeight: 700, fontSize: '14px' }}>
                    <span style={{ color: SECTION_COLORS.scripts.activeBg }}>{STAGE_ICONS[stage.key]}</span> {stage.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scripts.map((script, i) => (
                      <div key={i} style={{ background: SECTION_COLORS.scripts.bg, borderRadius: '0 12px 12px 12px', borderLeft: `4px solid ${SECTION_COLORS.scripts.activeBg}`, padding: '12px 16px' }}>
                        <div style={{ fontSize: '11px', color: SECTION_COLORS.scripts.activeBg, fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          话术 {i + 1}（已本地化）
                        </div>
                        <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.6 }}>
                          {script}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : currentSection ? (() => {
          const activeColors = SECTION_COLORS[currentSection.key] || SECTION_COLORS.profile;
          return (
          /* 结构化字段视图 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentSection.fields.map(field => (
              <div key={field.key} style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: `1px solid ${activeColors.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: activeColors.text, marginBottom: '12px' }}>{field.label}</div>

                {field.type === 'tags' ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Array.isArray(field.value) ? field.value : []).map(tag => (
                      <span key={tag} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', background: activeColors.bg, color: activeColors.activeBg, fontWeight: 600 }}>{tag}</span>
                    ))}
                    <button style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', background: '#f8fafc', color: '#64748b', border: '1px dashed #cbd5e1', cursor: 'pointer', fontWeight: 500 }}>+ 添加</button>
                  </div>
                ) : field.type === 'card' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Object.entries(field.value).map(([k, v]) => {
                      const labelMap = { area: '面积要求', invest: '预估投资额', staff: '人员配置', revenue: '预期月营收' };
                      return (
                        <div key={k} style={{ padding: '12px', background: activeColors.bg, borderRadius: '12px', textAlign: 'center', border: `1px solid ${activeColors.border}` }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{v}</div>
                          <div style={{ fontSize: '12px', color: activeColors.text, marginTop: '4px', fontWeight: 600 }}>{labelMap[k] || k}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.6, background: activeColors.bg, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${activeColors.border}` }}>{field.value}</div>
                )}
              </div>
            ))}
          </div>
          );
        })() : null}
      </div>



      {/* 保存 */}
      <button className={styles.agentSaveBtn}>💾 保存品牌建模</button>
    </>
  );
}
