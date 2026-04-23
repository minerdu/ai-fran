'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import SystemStatusPanel from '@/components/settings/SystemStatusPanel';
import styles from './page.module.css';

const PersonaSettings = dynamic(() => import('@/components/settings/PersonaSettings'), { ssr: false });
const AiModelSettings = dynamic(() => import('@/components/settings/AiModelSettings'), { ssr: false });
const AutonomousOpsSettings = dynamic(() => import('@/components/settings/AutonomousOpsSettings'), { ssr: false });
const SkillCenterView = dynamic(() => import('@/components/settings/SkillCenterView'), { ssr: false });
const BrandModelingView = dynamic(() => import('@/components/settings/BrandModelingView'), { ssr: false });
const FranchiseDocsView = dynamic(() => import('@/components/settings/FranchiseDocsView'), { ssr: false });
const AccountManagementView = dynamic(() => import('@/components/settings/AccountManagementView'), { ssr: false });
const LoginChoiceView = dynamic(() => import('@/components/settings/LoginChoiceView'), { ssr: false });
const YouzanConfigPanel = dynamic(() => import('@/components/settings/YouzanConfigPanel'), { ssr: false });
const MomentsAgentConfigCard = dynamic(() => import('@/components/settings/MomentsAgentConfigCard'), { ssr: false });
const RedLineConfigCard = dynamic(() => import('@/components/settings/RedLineConfigCard'), { ssr: false });
const FinancialModelView = dynamic(() => import('@/components/settings/FinancialModelView'), { ssr: false });

const DETAIL_VIEWS = {
  persona: { title: 'AI 招商顾问设置', Component: PersonaSettings },
  aiModel: { title: 'AI 大模型与知识库', Component: AiModelSettings },
  autonomousOps: { title: 'AI 自主招商引擎', Component: AutonomousOpsSettings },
  skillCenter: { title: '标杆企业 Skill 中心', Component: SkillCenterView },
  brandModeling: { title: '品牌建模', Component: BrandModelingView },
  financialModel: { title: '财务模型', Component: FinancialModelView },
  franchiseDocs: { title: '招商文档', Component: FranchiseDocsView },
  momentsAgent: { title: '朋友圈智能体', Component: MomentsAgentConfigCard },
  redLineRules: { title: '红线与安全规则', Component: RedLineConfigCard },
  accountManagement: { title: '账号管理', Component: AccountManagementView },
  crmConfig: { title: 'CRM 系统接入', Component: YouzanConfigPanel },
  loginChoice: { title: '登录与安全', Component: LoginChoiceView },
};

// Maps URL ?tab= values to DETAIL_VIEWS keys for deep-linking
const TAB_ALIAS_MAP = {
  skill: 'skillCenter',
  materials: 'franchiseDocs',
  report: 'autonomousOps',
  persona: 'persona',
  aiModel: 'aiModel',
  engine: 'autonomousOps',
  brand: 'brandModeling',
  docs: 'franchiseDocs',
  moments: 'momentsAgent',
  redline: 'redLineRules',
  account: 'accountManagement',
  crm: 'crmConfig',
  login: 'loginChoice',
  financial: 'financialModel',
};

function getRequestedView(searchParams) {
  const tabParam = searchParams.get('tab');
  if (!tabParam) {
    return null;
  }

  const resolvedKey = TAB_ALIAS_MAP[tabParam] || tabParam;
  return DETAIL_VIEWS[resolvedKey] ? resolvedKey : null;
}

function MePageInner() {
  const [viewState, setViewState] = useState('list');
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = getRequestedView(searchParams);
  const activeView = requestedView ?? viewState;

  const handleListAction = (item) => {
    if (item.route) {
      router.push(item.route);
      return;
    }
    setViewState(item.key);
  };

  const handleBack = () => {
    setViewState('list');
    if (requestedView) {
      router.replace('/me');
    }
  };

  // Detail view rendering
  if (activeView !== 'list') {
    const viewDef = DETAIL_VIEWS[activeView];
    if (viewDef) {
      const { title, Component } = viewDef;
      return (
        <div className={styles.settingsPage}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={handleBack}>‹ 返回</button>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <div className={styles.content}>
            <Component onBack={handleBack} />
          </div>
        </div>
      );
    }
    // Unknown view fallback
    return (
      <div className={styles.settingsPage}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={handleBack}>‹ 返回</button>
          <h2 className={styles.title}>设置</h2>
        </div>
        <div className={styles.content}>
          <p style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>此项功能正在开发中...</p>
        </div>
      </div>
    );
  }

  // ====== LIST VIEW ======
  return (
    <div className={styles.settingsPage}>

      <div className={styles.listContent}>
        {/* ① 系统状态面板 */}
        <div className={styles.listGroup}>
          <SystemStatusPanel />
        </div>

        {/* ② AI 智能体配置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>AI 智能体配置</div>
          <div className={styles.groupItems}>
            {[
              { key: 'persona', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, color: '#8b5cf6', label: 'AI 招商顾问设置' },
              { key: 'aiModel', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>, color: '#3b82f6', label: 'AI 大模型与知识库' },
              { key: 'redLineRules', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, color: '#ef4444', label: '红线与安全规则' },
              { key: 'momentsAgent', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>, color: '#ec4899', label: '朋友圈智能体' },
            ].map(item => (
              <div key={item.key} className={styles.listItem} onClick={() => handleListAction(item)}>
                <div className={styles.itemLeft}>
                  <span className={styles.itemIcon} style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
                  <span className={styles.itemName}>{item.label}</span>
                </div>
                <span className={styles.itemArrow}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* ③ 标杆企业 Skill 设置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>标杆企业 Skill 设置</div>
          <div className={styles.groupItems}>
            {[
              { key: 'skillCenter', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, color: '#f59e0b', label: 'Skill 中心' },
              { key: 'brandModeling', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, color: '#14b8a6', label: '品牌建模' },
              { key: 'financialModel', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, color: '#10b981', label: '财务模型' },
            ].map(item => (
              <div key={item.key} className={styles.listItem} onClick={() => handleListAction(item)}>
                <div className={styles.itemLeft}>
                  <span className={styles.itemIcon} style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
                  <span className={styles.itemName}>{item.label}</span>
                </div>
                <span className={styles.itemArrow}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* ④ AI 招商配置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>AI 招商配置</div>
          <div className={styles.groupItems}>
            {[
              { key: 'autonomousOps', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>, color: '#14b8a6', label: 'AI 自主招商引擎' },
              { route: '/reports', key: 'reports', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, color: '#ca8a04', label: '招商报告' },
              { key: 'franchiseDocs', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, color: '#2563eb', label: '招商文档' },
            ].map(item => (
              <div key={item.label} className={styles.listItem} onClick={() => handleListAction(item)}>
                <div className={styles.itemLeft}>
                  <span className={styles.itemIcon} style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
                  <span className={styles.itemName}>{item.label}</span>
                </div>
                <span className={styles.itemArrow}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* ⑤ 系统设置 */}
        <div className={styles.listGroup}>
          <div className={styles.groupHead}>系统设置</div>
          <div className={styles.groupItems}>
            {[
              { key: 'accountManagement', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, color: '#f43f5e', label: '账号管理' },
              { key: 'crmConfig', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, color: '#06b6d4', label: 'CRM 系统接入' },
              { key: 'loginChoice', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, color: '#6b7280', label: '登录与安全' },
            ].map(item => (
              <div key={item.key} className={styles.listItem} onClick={() => handleListAction(item)}>
                <div className={styles.itemLeft}>
                  <span className={styles.itemIcon} style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
                  <span className={styles.itemName}>{item.label}</span>
                </div>
                <span className={styles.itemArrow}>›</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MePage() {
  return (
    <Suspense fallback={null}>
      <MePageInner />
    </Suspense>
  );
}
