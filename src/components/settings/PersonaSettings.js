'use client';

import { useState } from 'react';
import styles from '@/app/(dashboard)/me/page.module.css';

const MEMBERS = ['总部 AI 指挥官', '招商顾问-华南', '招商顾问-华东', '招商顾问-西南'];

const BEST_PRACTICE_PROMPT = `## Role（角色定义）
你是品牌总部的 AI 招商顾问，负责接待加盟线索、判断资质、推进建档、考察、报价、签约与沉默激活。
你的核心任务是：对于未建档的线索，先采集基础信息判断资质；对于已建档的潜在加盟商，持续推进到考察、报价、签约的关键里程碑。

### 核心人设
- **身份**：你是品牌总部招商中心的高级 AI 顾问，具备丰富的加盟招商经验。
- **性格**：专业、克制、可信，不承诺保底回本，不制造焦虑。
- **语言风格**：商务化但不生硬，简洁明了，直击核心价值。
- **语言长度**：每次回复不超过150字，分段输出。
- **回复格式**：仅限纯文本，严禁 Markdown 格式。

## Task（具体任务）
1. 首轮先采集城市、预算、行业经验、预计开店时点、决策角色。
2. 根据招商旅程判断当前应进入建档、考察邀约、报价、审批还是转人工。
3. 涉及加盟政策、区域保护、返利、合同、付款、资料外发时，必须提示进入审批。
4. 对沉默线索优先发送标杆案例、总部赋能和 ROI 证据，不做情绪化催促。

### 特殊情况处理
- **质疑机器身份**："我是总部招商中心的 AI 助手，为确保您的咨询体验，我 24 小时在线为您服务"
- **询问加盟费**："加盟费因区域和店型有所不同，建议我先了解您的城市和预算，为您精准匹配方案"
- **犹豫不决**："理解您的顾虑，建议先来总部实地考察，我们有真实运营数据和标杆门店可以参考"

## Guardrails（护栏）
- 不承诺保底回本，不承诺区域独家，不擅自给出折扣。
- 不输出门店零售式客服话术，不制造消费焦虑。
- 需要明确下一步动作，并把动作落到招商阶段。

## Format（输出格式）
- 每次最多推进一个核心问题。
- 默认短句分段，保持专业、克制、可信。
- 优先输出"当前判断 + 下一步动作 + 是否需要审批"。`;

export default function PersonaSettings({ onBack }) {
  const [form, setForm] = useState({
    personaSource: 'bestPractice',
    quickImportText: '',
    industry: '美容美业加盟',
    position: '总部 AI 招商顾问',
    introduction: '您好，我是总部 AI 招商顾问，负责为您梳理加盟条件、评估资质、安排考察与推进签约。我们品牌在全国拥有数千家连锁门店，致力于为每位加盟商提供全方位的总部赋能支持。',
    promptText: BEST_PRACTICE_PROMPT,
    selectedMembers: ['总部 AI 指挥官', '招商顾问-华南'],
  });
  const [isGenerating, setIsGenerating] = useState({});

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAIGenerate = (field) => {
    setIsGenerating((prev) => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setIsGenerating((prev) => ({ ...prev, [field]: false }));
    }, 2000);
  };

  return (
    <>
      {/* 顾问人设来源 */}
      <div className={styles.agentFormContainer}>
        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            顾问人设来源
          </span>
          <div className={styles.radioGroup}>
            <button
              className={`${styles.radioBtn} ${form.personaSource === 'custom' ? styles.activeFull : ''}`}
              onClick={() => update('personaSource', 'custom')}
            >自行配置</button>
            <button
              className={`${styles.radioBtn} ${form.personaSource === 'bestPractice' ? styles.activeFull : ''}`}
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  personaSource: 'bestPractice',
                  promptText: BEST_PRACTICE_PROMPT,
                }));
              }}
            >招商最佳实践配置</button>
          </div>
        </div>

        {/* 快速导入 */}
        <div className={styles.agentFormSection}>
          <div className={styles.labelRow}>
            <span className={styles.agentFormLabel}>快速导入（粘贴内容一键生成）</span>
            <button className={styles.aiBtn} onClick={() => handleAIGenerate('quickImport')} disabled={isGenerating.quickImport}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              <span>{isGenerating.quickImport ? '生成中...' : 'AI一键生成'}</span>
            </button>
          </div>
          <textarea
            className={styles.textarea}
            rows={3}
            value={form.quickImportText}
            onChange={(e) => update('quickImportText', e.target.value)}
            placeholder="粘贴品牌介绍、招商手册等文本，AI 将自动提取关键信息并生成招商顾问人设..."
          />
        </div>

        <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '4px 0' }}></div>

        {/* 基础信息 */}
        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            基础信息
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className={styles.miniLabel}>行业</label>
              <select
                className={styles.agentFormInput}
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">请选择行业</option>
                <option value="美容美业加盟">美容美业加盟</option>
                <option value="餐饮连锁加盟">餐饮连锁加盟</option>
                <option value="教育培训加盟">教育培训加盟</option>
                <option value="零售连锁加盟">零售连锁加盟</option>
                <option value="服务连锁加盟">服务连锁加盟</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className={styles.miniLabel}>岗位</label>
              <select
                className={styles.agentFormInput}
                value={form.position}
                onChange={(e) => update('position', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">请选择岗位</option>
                <option value="总部 AI 招商顾问">总部 AI 招商顾问</option>
                <option value="区域招商经理">区域招商经理</option>
                <option value="招商总监">招商总监</option>
                <option value="加盟服务顾问">加盟服务顾问</option>
              </select>
            </div>
          </div>
        </div>

        {/* 顾问介绍 */}
        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF2F8', borderRadius: '8px', marginBottom: '16px' }}>
          <div className={styles.labelRow}>
            <span className={styles.agentFormLabel} style={{ color: '#EC4899', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              招商顾问介绍
            </span>
            <button className={styles.aiBtn} onClick={() => handleAIGenerate('introduction')} disabled={isGenerating.introduction}>
              <span>🤖</span>
              <span>{isGenerating.introduction ? '生成中...' : 'AI补全'}</span>
            </button>
          </div>
          <textarea
            className={styles.textarea}
            rows={4}
            value={form.introduction}
            onChange={(e) => update('introduction', e.target.value)}
            placeholder="例如：您好，我是总部 AI 招商顾问，负责为您提供加盟咨询..."
          />
        </div>

        {/* 顾问提示词 */}
        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px', marginBottom: '16px' }}>
          <div className={styles.labelRow}>
            <span className={styles.agentFormLabel} style={{ color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              招商顾问提示词
            </span>
            <button className={styles.aiBtn} onClick={() => handleAIGenerate('promptText')} disabled={isGenerating.promptText}>
              <span>🤖</span>
              <span>{isGenerating.promptText ? '生成中...' : 'AI一键生成'}</span>
            </button>
          </div>
          <textarea
            className={styles.textarea}
            rows={10}
            value={form.promptText}
            onChange={(e) => update('promptText', e.target.value)}
            placeholder="使用 Markdown 格式编写详细的人设提示词..."
          />
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            支持 Markdown 格式 · AI 将根据此提示词理解角色定位并生成对话
          </span>
        </div>

        {/* 成员选择 */}
        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDFA', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#14B8A6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            应用成员
          </span>
          <div className={styles.memberList}>
            {MEMBERS.map((member) => (
              <label key={member} className={styles.memberItem}>
                <input
                  type="checkbox"
                  checked={form.selectedMembers.includes(member)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      update('selectedMembers', [...form.selectedMembers, member]);
                    } else {
                      update('selectedMembers', form.selectedMembers.filter((item) => item !== member));
                    }
                  }}
                />
                <span>{member}</span>
              </label>
            ))}
          </div>
        </div>

        <button className={styles.agentSaveBtn} onClick={onBack}>
          💾 保存设置
        </button>
      </div>
    </>
  );
}
