'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './SafetyFilters.module.css';

/**
 * 安全规则/红线配置组件
 *
 * 管理：
 * - 休止关键字（触发后AI立即停止回复）
 * - 财务敏感词（自动路由人工审批）
 * - 旅程级禁止打扰规则
 * - 每日最大发送量
 */
export default function SafetyFilters() {
  const toast = useToast();
  const [rules, setRules] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState({ stop: '', financial: '' });
  const [dailyLimit, setDailyLimit] = useState('100');

  const [aiBehavior, setAiBehavior] = useState('normal');

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/safety-rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
        if (data.daily_limit?.value) {
          setDailyLimit(String(data.daily_limit.value));
        }
      }
    } catch (e) {
      toast.error('加载安全规则失败');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const addRule = async (ruleType, value) => {
    if (!value.trim()) return;
    try {
      const res = await fetch('/api/safety-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleType, value: value.trim() }),
      });
      if (res.ok) {
        toast.success('规则已添加');
        loadRules();
        setNewKeyword(prev => ({ ...prev, [ruleType === 'stop_keyword' ? 'stop' : 'financial']: '' }));
      } else {
        const err = await res.json();
        toast.error(err.error || '添加失败');
      }
    } catch (e) {
      toast.error('网络错误');
    }
  };

  const deleteRule = async (id) => {
    try {
      const res = await fetch(`/api/safety-rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('已删除');
        loadRules();
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const toggleRule = async (id, isActive) => {
    try {
      await fetch('/api/safety-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      loadRules();
    } catch (e) {
      toast.error('更新失败');
    }
  };

  const saveDailyLimit = async () => {
    await addRule('daily_limit', dailyLimit);
  };

  const addJourneyBlock = async (value) => {
    await addRule('journey_block', value);
  };

  if (isLoading || !rules) {
    return <div className={styles.container}><p className={styles.loading}>加载中...</p></div>;
  }

  return (
    <div className={styles.container}>
      {/* 行业通用规则与行业业务规则 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#EF4444' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#DC2626' }}>招商安全红线规则</h3>
            <p className={styles.sectionDesc}>内置资质造假、虚假收益承诺、违规返利、合同与财务敏感话题的系统级拦截。</p>
          </div>
        </div>
        <div className={styles.toggleRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-section)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text-primary)' }}>启用招商通用红线</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>强制拦截</span>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleGeneral" defaultChecked disabled />
            <label htmlFor="toggleGeneral"></label>
          </div>
        </div>

        <div className={styles.sectionHeader} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', marginTop: '24px' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#10B981' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#059669' }}>招商业务规则</h3>
            <p className={styles.sectionDesc}>用于约束 AI 只按总部招商流程推进，不误入 C 端客服和门店消费型话术。</p>
          </div>
        </div>
        <div className={styles.toggleRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-section)', padding: '12px 16px', borderRadius: '8px' }}>
          <div>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text-primary)' }}>启用招商最佳实践</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>辅助 AI 生成邀约、考察与签约话术</span>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleBizRule" defaultChecked />
            <label htmlFor="toggleBizRule"></label>
          </div>
        </div>
      </div>

      {/* 企业专属部分 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#F59E0B' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="9" y1="6" x2="9.01" y2="6"></line><line x1="15" y1="6" x2="15.01" y2="6"></line><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><line x1="9" y1="14" x2="9.01" y2="14"></line><line x1="15" y1="14" x2="15.01" y2="14"></line></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#D97706' }}>企业专属安全红线</h3>
            <p className={styles.sectionDesc}>填入品牌总部绝对禁止的承诺、措辞与行为规范，越线即被拦截。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} placeholder="绝对禁止..." defaultValue="禁止承诺保底回本、禁止口头授予区域独家、禁止泄露底价和未公开加盟政策" />
        
        <div className={styles.sectionHeader} style={{ marginTop: '24px', padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#3B82F6' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#2563EB' }}>企业专属业务规则</h3>
            <p className={styles.sectionDesc}>填入总部建档、邀约、考察、报价、签约、转介绍等标准流程。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} placeholder="总部招商流程规范..." defaultValue="首次接待必须采集城市、预算、行业经验、开店时点、决策角色；未完成建档前不得直接报价；报价、政策、合同相关内容必须先审批。" />

        <div className={styles.sectionHeader} style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: '#8B5CF6' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="18" x2="12" y2="14"></line><line x1="12" y1="6" x2="12" y2="10"></line></svg></span>
          <div>
            <h3 className={styles.sectionTitle} style={{ color: '#7C3AED' }}>企业专属财务规则</h3>
            <p className={styles.sectionDesc}>填入加盟费、保证金、退款及结算规范，AI将自动提取财务红线进行审批控制。</p>
          </div>
        </div>
        <textarea className={styles.addInput} style={{ width: '100%', height: '80px', resize: 'vertical', padding: '12px' }} defaultValue="所有涉及意向金退还、加盟费打款、合同解除的操作，必须由财务确认。严禁招商人员用个人账户接收客户的意向定金或加盟费。" />
        
        <div className={styles.attachmentRow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          上传统合企业规章制度文件（支持 PDF / Word 一键拆解）
        </div>
      </div>

      {/* AI自主跟进选项 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></span>
          <div>
            <h3 className={styles.sectionTitle}>AI自主判断跟进模式</h3>
            <p className={styles.sectionDesc}>决定 AI 在缺乏明确指令时的出击意愿和跟进频率</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button 
            className={`${styles.behaviorCard} ${aiBehavior === 'conservative' ? styles.activeBehavior : styles.inactiveBehavior}`}
            onClick={() => setAiBehavior('conservative')}
          >
            <div className={styles.behaviorTitle}>保守无感</div>
            <div className={styles.behaviorDesc}>无客户主动咨询时，绝不主动发起话题</div>
          </button>
          <button 
            className={`${styles.behaviorCard} ${aiBehavior === 'normal' ? styles.activeBehavior : styles.inactiveBehavior}`}
            onClick={() => setAiBehavior('normal')}
          >
            <div className={styles.behaviorTitle}>常态行进</div>
            <div className={styles.behaviorDesc}>基于招商线索生命周期、重要节假日进行适度关怀推介</div>
          </button>
          <button 
            className={`${styles.behaviorCard} ${aiBehavior === 'aggressive' ? styles.activeBehavior : styles.inactiveBehavior}`}
            onClick={() => setAiBehavior('aggressive')}
          >
            <div className={styles.behaviorTitle}>激进业绩导向</div>
            <div className={styles.behaviorDesc}>紧盯高意向动作，高频发送催单、逼单类话术及限时加盟折扣</div>
          </button>
        </div>
      </div>

      {/* 每日发送上限 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} style={{ display: 'flex', color: 'var(--color-primary)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span>
          <div>
            <h3 className={styles.sectionTitle}>每日最大发送量</h3>
            <p className={styles.sectionDesc}>每天自动发送消息的总量上限，超出后新任务需人工审批</p>
          </div>
        </div>
        <div className={styles.limitRow}>
          <input
            type="range"
            min="1"
            max="200"
            step="1"
            value={dailyLimit}
            onChange={e => setDailyLimit(e.target.value)}
            className={styles.limitRange}
          />
          <span className={styles.limitValue}>{dailyLimit} 条/天</span>
          <button className={styles.addBtn} onClick={saveDailyLimit}>保存</button>
        </div>
      </div>
    </div>
  );
}
