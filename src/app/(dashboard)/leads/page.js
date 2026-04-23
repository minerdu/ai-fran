'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '@/lib/store';
import LeadBatchActionBar from '@/components/leads/LeadBatchActionBar';
import WecomGroupCard from '@/components/leads/WecomGroupCard';
import styles from './page.module.css';

const STAGE_LABELS = {
  all: '全部线索',
  pool: '线索池',
  qualified: '已建档',
  negotiating: '谈判中',
  signed: '已签约',
  rejected: '已拒绝',
};

const STAGE_COLORS = {
  pool: '#999',
  qualified: '#2563eb',
  negotiating: '#f59e0b',
  signed: '#07C160',
  rejected: '#ff4d4f',
};

export default function LeadsPage() {
  const router = useRouter();
  const searchTerm = useStore(s => s.searchTerm);
  const setSearchTerm = useStore(s => s.setSearchTerm);
  const activeFilter = useStore(s => s.activeFilter);
  const setActiveFilter = useStore(s => s.setActiveFilter);
  const leads = useStore(s => s.leads);
  const fetchLeads = useStore(s => s.fetchLeads);
  const isLoadingLeads = useStore(s => s.isLoadingLeads);
  const selectLead = useStore(s => s.selectLead);
  const selectedLeadId = useStore(s => s.selectedLeadId);
  const activeWorkspace = useStore(s => s.activeWorkspace);

  const [stageTab, setStageTab] = useState('all');
  const [viewTab, setViewTab] = useState('leads');
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [groupCards, setGroupCards] = useState([]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    fetch('/api/customers/groups', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setGroupCards(Array.isArray(data) ? data : []))
      .catch(() => setGroupCards([]));
  }, []);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => l.isGroup !== true);

    // Workspace filter
    if (activeWorkspace !== 'main') {
      if (activeWorkspace === 'sub_1') {
        result = result.filter(l => l.assignedToId === 'sub_1' || l.region?.includes('华南'));
      } else if (activeWorkspace === 'sub_2') {
        result = result.filter(l => l.assignedToId === 'sub_2' || l.region?.includes('华东'));
      } else if (activeWorkspace === 'sub_3') {
        result = result.filter(l => l.assignedToId === 'sub_3' || l.region?.includes('西南'));
      } else {
        result = result.filter(l => l.assignedToId === activeWorkspace);
      }
    }

    // Stage filter
    if (stageTab !== 'all') {
      result = result.filter(l => l.stage === stageTab);
    }

    // Intent filter
    if (activeFilter === 'high_intent') {
      result = result.filter(l => l.intentScore >= 4.0);
    } else if (activeFilter === 'ai_handling') {
      result = result.filter(l => l.tags?.some(t => t.name === 'AI跟进中' || t.name === 'AI接待'));
    } else if (activeFilter === 'silent') {
      result = result.filter(l => l.silentDays >= 7);
    }


    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name?.toLowerCase().includes(term) ||
        l.company?.toLowerCase().includes(term) ||
        l.city?.toLowerCase().includes(term) ||
        l.tags?.some(t => t.name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [leads, searchTerm, activeFilter, stageTab, activeWorkspace]);

  const filteredGroupCards = useMemo(() => {
    let result = groupCards;
    if (activeWorkspace !== 'main') {
      if (activeWorkspace === 'sub_1') {
        result = result.filter(g => g.region?.includes('华南'));
      } else if (activeWorkspace === 'sub_2') {
        result = result.filter(g => g.region?.includes('华东'));
      } else if (activeWorkspace === 'sub_3') {
        result = result.filter(g => g.region?.includes('西南'));
      }
    }
    return result;
  }, [groupCards, activeWorkspace]);

  const stageCounts = useMemo(() => {
    const counts = { all: leads.length };
    leads.forEach(l => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
    return counts;
  }, [leads]);

  const toggleLead = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const syncBatchAction = async (action) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const response = await fetch('/api/customers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action }),
    });
    if (response.ok) {
      await fetchLeads();
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  return (
    <div className={styles.leadsPage}>
      {/* Sidebar backdrop */}
      <div
        className={`${styles.sidebarBackdrop} ${showGroupMenu ? styles.sidebarBackdropOpen : ''}`}
        onClick={() => setShowGroupMenu(false)}
      />

      {/* Side Menu */}
      <div className={`${styles.groupSidebar} ${showGroupMenu ? styles.groupSidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>线索筛选</span>
          <button className={styles.sidebarCloseBtn} onClick={() => setShowGroupMenu(false)}>✕</button>
        </div>

        <div className={styles.sidebarSectionTitle}>线索阶段</div>
        <div className={styles.sidebarList}>
          {Object.entries(STAGE_LABELS).map(([key, label]) => (
            <div
              key={key}
              className={`${styles.sidebarItem} ${stageTab === key ? styles.sidebarItemActive : ''}`}
              onClick={() => { setStageTab(key); setShowGroupMenu(false); }}
            >
              <span className={styles.sidebarItemIcon} style={{ color: STAGE_COLORS[key] || 'var(--color-primary)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="4"/></svg>
              </span>
              <span className={styles.sidebarItemLabel}>{label}</span>
              {stageCounts[key] > 0 && <span className={styles.sidebarItemCount}>{stageCounts[key]}</span>}
            </div>
          ))}
        </div>

        <div className={styles.sidebarSectionTitle}>AI 跟进状态</div>
        <div className={styles.sidebarList}>
          {[
            { key: 'all', label: '全部', count: leads.length },
            { key: 'high_intent', label: '高意向', count: leads.filter(l => l.intentScore >= 4.0).length },
            { key: 'ai_handling', label: 'AI自动跟进', count: leads.filter(l => l.tags?.some(t => t.name === 'AI跟进中' || t.name === 'AI接待')).length },
            { key: 'silent', label: '沉默待唤醒', count: leads.filter(l => l.silentDays >= 7).length },
          ].map(item => (
            <div
              key={item.key}
              className={`${styles.sidebarItem} ${activeFilter === item.key ? styles.sidebarItemActive : ''}`}
              onClick={() => { setActiveFilter(item.key); setShowGroupMenu(false); }}
            >
              <span className={styles.sidebarItemLabel}>{item.label}</span>
              {item.count > 0 && <span className={styles.sidebarItemCount}>{item.count}</span>}
            </div>
          ))}
        </div>


      </div>

      {/* Main Area */}
      <div className={styles.mainArea}>
        {/* Stage Tabs */}
        <div className={styles.topTabs}>
          {['all', 'pool', 'qualified', 'negotiating', 'signed'].map(key => (
            <div
              key={key}
              className={`${styles.topTab} ${stageTab === key ? styles.topTabActive : ''}`}
              onClick={() => setStageTab(key)}
            >
              {STAGE_LABELS[key]}
              {stageCounts[key] > 0 && <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '2px' }}>({stageCounts[key]})</span>}
            </div>
          ))}
        </div>

        <div className={styles.profileTabs}>
          {[
            { key: 'leads', label: '负责人线索' },
            { key: 'groups', label: '招商群' },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              className={`${styles.profileTab} ${viewTab === item.key ? styles.profileTabActive : ''}`}
              onClick={() => setViewTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <button className={styles.menuToggleBtn} onClick={() => setShowGroupMenu(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="搜索线索（姓名/公司/城市）"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>✕</button>
            ) : (
              <svg className={styles.searchIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </div>
          <button
            type="button"
            className={styles.selectionModeBtn}
            onClick={() => {
              setSelectionMode((current) => !current);
              setSelectedIds(new Set());
            }}
          >
            {selectionMode ? '退出批量' : '批量操作'}
          </button>
        </div>

        {viewTab === 'groups' ? (
          <section className={styles.groupSection} style={{ padding: '0 24px' }}>
            <div className={styles.groupSectionHead}>
              <strong>招商群管理</strong>
              <span>按城市 / 区域快速进入招商沟通群</span>
            </div>
            <div className={styles.groupGrid}>
              {filteredGroupCards.map((group) => (
                <WecomGroupCard key={group.id} group={group} onClick={() => selectLead(group.id)} />
              ))}
              {filteredGroupCards.length === 0 && (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>暂无招商群</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className={styles.customerList}>
            {isLoadingLeads ? (
              <div className={styles.emptyState}><p>加载中...</p></div>
            ) : filteredLeads.length > 0 ? (
              filteredLeads.map((lead, index) => (
                <div
                  key={lead.id}
                  className={`${styles.leadCard} animate-fadeInUp`}
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => {
                    if (selectionMode) {
                      toggleLead(lead.id);
                      return;
                    }
                    selectLead(lead.id);
                  }}
                >
                  <div className={styles.leadCardHeader}>
                    {selectionMode ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        readOnly
                      />
                    ) : null}
                    <div className={styles.leadAvatar} style={{ background: `linear-gradient(135deg, ${STAGE_COLORS[lead.stage] || '#2563eb'}, #0f172a)` }}>
                      {lead.name.slice(-2)}
                    </div>
                    <div className={styles.leadInfo}>
                      <div className={styles.leadNameRow}>
                        <span className={styles.leadName}>{lead.name}</span>
                        <span className={styles.leadStage} style={{ color: STAGE_COLORS[lead.stage], background: `${STAGE_COLORS[lead.stage]}15` }}>
                          {STAGE_LABELS[lead.stage] || lead.stage}
                        </span>
                      </div>
                      <span className={styles.leadCompany}>{lead.company} · {lead.city}</span>
                    </div>
                    {lead.silentDays === 0 && (
                      <span className={styles.onlineDot} />
                    )}
                  </div>

                  <div className={styles.leadScores}>
                    <span className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>意向</span>
                      <span className={styles.scoreValue} style={{ color: lead.intentScore >= 4 ? '#07C160' : lead.intentScore >= 3 ? '#f59e0b' : '#999' }}>
                        {lead.intentScore.toFixed(1)}
                      </span>
                    </span>
                    <span className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>投资力</span>
                      <span className={styles.scoreValue}>{lead.investCapability.toFixed(1)}</span>
                    </span>
                    <span className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>契合度</span>
                      <span className={styles.scoreValue}>{lead.industryFit.toFixed(1)}</span>
                    </span>
                    <span className={styles.scoreItem}>
                      <span className={styles.scoreLabel}>预算</span>
                      <span className={styles.scoreValue} style={{ color: '#2563eb' }}>{lead.investBudget}</span>
                    </span>
                  </div>

                  <p className={styles.leadSummary}>{lead.aiSummary?.slice(0, 80)}...</p>

                  <div className={styles.leadTags}>
                    {(lead.tags || []).slice(0, 4).map(tag => (
                      <span key={tag.name} className={styles.tagChip} style={{ color: tag.color, borderColor: `${tag.color}30`, background: `${tag.color}10` }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <div className={styles.leadFooter}>
                    <span className={styles.leadTime}>
                      {lead.silentDays > 0 ? `沉默 ${lead.silentDays} 天` : '活跃中'}
                    </span>
                    <span className={styles.leadRegion}>{lead.region} · {lead.source}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span style={{ fontSize: 32 }}>📋</span>
                <p className={styles.emptyText}>暂无匹配的招商线索</p>
              </div>
            )}
          </div>
        )}
      </div>
      {selectionMode && selectedIds.size > 0 ? (
        <LeadBatchActionBar
          count={selectedIds.size}
          onInvite={() => syncBatchAction('launch_invite')}
          onAssignManual={() => syncBatchAction('assign_manual')}
          onMarkException={() => syncBatchAction('mark_exception')}
        />
      ) : null}
    </div>
  );
}
