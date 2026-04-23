'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

const CHANNEL_TABS = ['全部', '企微好友', '招商群', '资料外发'];

const MOCK_FRIENDS = [
  { id: 'f1', name: '张明远', wxAlias: 'zhangmy_01', city: '广州', status: 'online', addedAt: '2026-04-15', lastMsg: '您好，想了解加盟政策', unread: 2 },
  { id: 'f2', name: '李婷', wxAlias: 'liting_biz', city: '深圳', status: 'online', addedAt: '2026-04-14', lastMsg: '考察时间确认了吗', unread: 0 },
  { id: 'f3', name: '王海涛', wxAlias: 'wht_invest', city: '成都', status: 'offline', addedAt: '2026-04-12', lastMsg: '收到，我再考虑下', unread: 0 },
  { id: 'f4', name: '刘芳', wxAlias: 'liufang88', city: '上海', status: 'offline', addedAt: '2026-04-10', lastMsg: '加盟费可以分期吗', unread: 1 },
  { id: 'f5', name: '陈志强', wxAlias: 'czq_fr', city: '武汉', status: 'online', addedAt: '2026-04-08', lastMsg: '方案发我看看', unread: 0 },
];

const MOCK_GROUPS = [
  { id: 'g1', name: '广州代理商沟通群', city: '广州', members: 38, type: 'city', lastActive: '5分钟前', unread: 5 },
  { id: 'g2', name: '华南区招商交流群', city: '华南', members: 126, type: 'region', lastActive: '12分钟前', unread: 0 },
  { id: 'g3', name: '深圳意向客户群', city: '深圳', members: 22, type: 'city', lastActive: '30分钟前', unread: 3 },
  { id: 'g4', name: '成都招商顾问群', city: '成都', members: 15, type: 'city', lastActive: '1小时前', unread: 0 },
  { id: 'g5', name: '西南区加盟交流群', city: '西南', members: 89, type: 'region', lastActive: '2小时前', unread: 0 },
];

const MOCK_DELIVERIES = [
  { id: 'd1', leadName: '张明远', type: '加盟手册', sentAt: '2026-04-20 14:30', status: 'delivered', channel: '企微' },
  { id: 'd2', leadName: '李婷', type: 'ROI测算表', sentAt: '2026-04-19 10:15', status: 'read', channel: '邮件' },
  { id: 'd3', leadName: '王海涛', type: '标杆案例PPT', sentAt: '2026-04-18 16:45', status: 'delivered', channel: '企微' },
  { id: 'd4', leadName: '刘芳', type: '区域政策说明', sentAt: '2026-04-17 09:30', status: 'pending_approval', channel: '邮件' },
  { id: 'd5', leadName: '陈志强', type: '合同样本', sentAt: '2026-04-16 11:00', status: 'pending_approval', channel: '企微' },
];

const DELIVERY_STATUS = {
  delivered: { label: '已送达', color: '#07C160' },
  read: { label: '已读', color: '#2563eb' },
  pending_approval: { label: '待审批', color: '#f59e0b' },
  failed: { label: '发送失败', color: '#ef4444' },
};

export default function LeadsChannelsPage() {
  const [activeTab, setActiveTab] = useState('全部');
  const [friends, setFriends] = useState(MOCK_FRIENDS);
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/customers/groups', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setGroups(data); })
      .catch(() => {});
  }, []);

  const filteredFriends = friends.filter(f =>
    !searchTerm || f.name.includes(searchTerm) || f.city.includes(searchTerm)
  );

  return (
    <div className={styles.leadsPage}>
      <div className={styles.mainArea}>
        {/* Header */}
        <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link href="/leads" style={{ color: '#007aff', fontSize: '15px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>
              线索
            </Link>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>渠道与群沟通</h1>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {CHANNEL_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: activeTab === tab ? 600 : 400,
                  background: activeTab === tab ? 'var(--color-primary)' : '#f1f5f9',
                  color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{tab}</button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder="搜索好友/群名/城市"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <svg className={styles.searchIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        <div className={styles.customerList}>
          {/* 企微好友 */}
          {(activeTab === '全部' || activeTab === '企微好友') && (
            <section style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#07C160" strokeWidth="2" width="16" height="16" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  企微好友 ({filteredFriends.length})
                </span>
                <button style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>+ 添加好友</button>
              </div>
              {filteredFriends.map(friend => (
                <div key={friend.id} className={styles.leadCard} style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #07C160, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                      {friend.name.slice(-2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{friend.name}</span>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: friend.status === 'online' ? '#07C160' : '#ccc' }}/>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{friend.city}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.lastMsg}</div>
                    </div>
                    {friend.unread > 0 && (
                      <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{friend.unread}</span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 招商群 */}
          {(activeTab === '全部' || activeTab === '招商群') && (
            <section style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="16" height="16" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  招商群 ({groups.length})
                </span>
                <button style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>+ 建群</button>
              </div>
              {groups.filter(g => !searchTerm || g.name.includes(searchTerm) || g.city.includes(searchTerm)).map(group => (
                <div key={group.id} className={styles.leadCard} style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: group.type === 'region' ? 'linear-gradient(135deg, #2563eb, #0f172a)' : 'linear-gradient(135deg, #07C160, #1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                      {group.type === 'region' ? '区' : '城'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{group.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{group.members}人</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>最近活跃 {group.lastActive}</div>
                    </div>
                    {group.unread > 0 && (
                      <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{group.unread}</span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 资料外发记录 */}
          {(activeTab === '全部' || activeTab === '资料外发') && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" width="16" height="16" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  资料外发记录 ({deliveries.length})
                </span>
              </div>
              {deliveries.map(d => {
                const st = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.delivered;
                return (
                  <div key={d.id} className={styles.leadCard} style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{d.leadName} · {d.type}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{d.sentAt} · {d.channel}</div>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600, background: `${st.color}15`, color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
