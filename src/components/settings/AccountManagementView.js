'use client';

import styles from './AccountManagementView.module.css';

export default function AccountManagementView() {
  const qwData = [
    { name: '品牌招商总部', role: '全局线索分配与审核', id: 'hq_admin_01', count: '12,500', status: '在线', latency: '12ms' },
    { name: '招商顾问-华南', role: '华南大区拓展与签单', id: 'zhaoshang_sc_01', count: '3,450', status: '在线', latency: '24ms' },
    { name: '招商顾问-华东', role: '华东大区拓展与签单', id: 'zhaoshang_ec_02', count: '2,208', status: '在线', latency: '32ms' },
    { name: '招商顾问-西南', role: '西南大区拓展与签单', id: 'zhaoshang_sw_03', count: '1,100', status: '离线', latency: '-' },
  ];

  return (
    <div className={styles.container}>
      {/* Main Account Section */}
      <div className={styles.card}>
        <div className={styles.mainHeader}>
          <div className={styles.avatar}>蔚</div>
          <div>
            <h3 className={styles.mainTitle}>品牌招商总部</h3>
            <div className={styles.tags}>
              <span className={styles.tagId}>ID: 88204911</span>
              <span className={styles.tagVerify}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                企业实名认证
              </span>
            </div>
          </div>
        </div>

        <div className={styles.infoList}>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>注册时间</label>
            <div className={styles.infoContent}>
              <input type="text" value="2024-01-01 10:00:00" readOnly className={`${styles.infoBox} ${styles.infoBoxReadOnly}`} />
              <div style={{ width: 34 }}></div>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>登录名</label>
            <div className={styles.infoContent}>
              <input type="text" value="admin_franchise" readOnly className={styles.infoBox} />
              <button className={styles.editBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>所属行业</label>
            <div className={styles.infoContent}>
              <input type="text" value="美容美业" readOnly className={styles.infoBox} />
              <div style={{ width: 34 }}></div>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>联系手机号</label>
            <div className={styles.infoContent}>
              <input type="text" value="138****8000" readOnly className={styles.infoBox} />
              <button className={styles.editBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>登录邮箱</label>
            <div className={styles.infoContent}>
              <input type="text" value="admin@franchise.com" readOnly className={styles.infoBox} />
              <button className={styles.editBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
          </div>
          <div className={styles.infoRow}>
            <label className={styles.infoLabel}>登录状态</label>
            <div className={styles.infoContent}>
              <span className={styles.badgeGreen}>正常</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Accounts Section */}
      <div>
        <h2 className={styles.sectionTitle}>子账号管理</h2>

        {/* Enterprise WeChat */}
        <div className={styles.subSectionTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          企业微信矩阵 (4)
        </div>
        <div className={styles.wechatGrid}>
          {qwData.map((d) => (
            <div key={d.id} className={styles.wechatCard}>
              <div className={styles.wcHeader}>
                <div className={styles.wcIconQw}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <div>
                  <div className={styles.wcName}>{d.name}</div>
                  <div className={styles.wcRole}>{d.role}</div>
                </div>
              </div>
              <div className={styles.wcDetails}>
                <div className={styles.wcDetailRow}>
                  <span>企微ID:</span>
                  <span className={styles.wcId}>{d.id}</span>
                </div>
                <div className={styles.wcDetailRow}>
                  <span>客户数:</span>
                  <span className={styles.wcCount}>{d.count}</span>
                </div>
                <div className={styles.wcDetailRow}>
                  <span>状态:</span>
                  <div className={styles.wcStatusBox}>
                    <span className={styles.wcStatusText} style={{ color: d.status === '在线' ? '#16A34A' : '#9CA3AF' }}>● {d.status}</span>
                    <div className={styles.wcLatency}>{d.latency}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
