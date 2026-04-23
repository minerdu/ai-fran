'use client';

import styles from './FranchiseDocsView.module.css';

const TYPE_CONFIG = {
  handbook: { name: '加盟手册', section: 'core', theme: 'iconBoxBlue', source: 'sourceDify', sourceLabel: 'Dify 知识库' },
  roi_model: { name: 'ROI 模型', section: 'core', theme: 'iconBoxIndigo', source: 'sourceZhipu', sourceLabel: '智谱 GLM' },
  policy: { name: '招商政策', section: 'core', theme: 'iconBoxTeal', source: 'sourceLocal', sourceLabel: '本地私有' },
  guide: { name: '单店模型', section: 'core', theme: 'iconBoxOrange', source: 'sourceDify', sourceLabel: 'Dify 知识库' },
  
  faq: { name: 'FAQ', section: 'support', theme: 'iconBoxYellow', source: 'sourceZhipu', sourceLabel: '智谱 GLM' },
  case_study: { name: '标杆案例', section: 'support', theme: 'iconBoxPurple', source: 'sourceSpecified', sourceLabel: '指定知识库' },
  training: { name: '培训体系', section: 'support', theme: 'iconBoxPink', source: 'sourceLocal', sourceLabel: '本地私有' },
  supply_chain: { name: '供应链', section: 'support', theme: 'iconBoxBlue', source: 'sourceSpecified', sourceLabel: '指定知识库' },
};

const MOCK_FILES = {
  handbook: [
    { id: 'h1', name: '2025版品牌加盟手册正本', format: 'pdf', size: '12.4 MB', date: '2025-01-10' },
    { id: 'h2', name: '品牌发展历程及愿景介绍', format: 'pptx', size: '8.1 MB', date: '2025-01-12' },
    { id: 'h3', name: '招商加盟宣传画册_高清版', format: 'pdf', size: '24.5 MB', date: '2025-01-15' },
    { id: 'h4', name: '核心优势与竞品对比分析', format: 'docx', size: '2.3 MB', date: '2025-01-18' },
    { id: 'h5', name: '品牌授权使用规范手册', format: 'pdf', size: '5.6 MB', date: '2025-01-20' },
    { id: 'h6', name: '店面形象设计VI标准手册', format: 'pdf', size: '35.0 MB', date: '2025-01-22' },
  ],
  roi_model: [
    { id: 'r1', name: '旗舰店投资回报率测算表', format: 'xlsx', size: '1.2 MB', date: '2025-01-11' },
    { id: 'r2', name: '标准店回本周期分析模型', format: 'xlsx', size: '1.1 MB', date: '2025-01-11' },
    { id: 'r3', name: '盈亏平衡点推算说明', format: 'docx', size: '0.8 MB', date: '2025-01-14' },
    { id: 'r4', name: '各区域人工与租金成本核算', format: 'xlsx', size: '2.4 MB', date: '2025-01-16' },
    { id: 'r5', name: '三年财务预测及现金流规划', format: 'xlsx', size: '1.5 MB', date: '2025-01-19' },
    { id: 'r6', name: '成本压缩与利润优化指南', format: 'pdf', size: '4.2 MB', date: '2025-01-21' },
  ],
  policy: [
    { id: 'p1', name: '2025第一季度招商加盟政策', format: 'pdf', size: '3.4 MB', date: '2025-01-05' },
    { id: 'p2', name: '区域代理阶梯返利政策细则', format: 'docx', size: '1.2 MB', date: '2025-01-06' },
    { id: 'p3', name: '首批进货补贴申请说明', format: 'pdf', size: '2.1 MB', date: '2025-01-08' },
    { id: 'p4', name: '装修补贴及开业支持标准', format: 'xlsx', size: '0.9 MB', date: '2025-01-12' },
    { id: 'p5', name: '违约处理与保证金退还规定', format: 'docx', size: '1.5 MB', date: '2025-01-15' },
  ],
  guide: [
    { id: 'g1', name: '100平米标准店人员配置指南', format: 'docx', size: '1.1 MB', date: '2025-01-09' },
    { id: 'g2', name: '店长每日工作SOP手册', format: 'pdf', size: '6.7 MB', date: '2025-01-10' },
    { id: 'g3', name: '门店动线设计及商品陈列', format: 'pptx', size: '15.2 MB', date: '2025-01-13' },
    { id: 'g4', name: '外卖与堂食双主线运营模型', format: 'pdf', size: '4.5 MB', date: '2025-01-16' },
    { id: 'g5', name: '开业首月营销拓客方案', format: 'pptx', size: '12.8 MB', date: '2025-01-18' },
    { id: 'g6', name: '收银与点单系统操作手册', format: 'pdf', size: '8.4 MB', date: '2025-01-20' },
  ],
  faq: [
    { id: 'f1', name: '加盟商常见问题100答', format: 'pdf', size: '3.8 MB', date: '2025-01-02' },
    { id: 'f2', name: '签约前核心疑虑话术拆解', format: 'docx', size: '1.4 MB', date: '2025-01-04' },
    { id: 'f3', name: '费用相关问题标准口径', format: 'xlsx', size: '0.6 MB', date: '2025-01-07' },
    { id: 'f4', name: '选址与装修阶段高频问题', format: 'docx', size: '2.1 MB', date: '2025-01-10' },
    { id: 'f5', name: '售后及供应链客诉处理话术', format: 'docx', size: '1.8 MB', date: '2025-01-14' },
  ],
  case_study: [
    { id: 'c1', name: '华南大区销冠店成功经验拆解', format: 'pptx', size: '18.5 MB', date: '2025-01-08' },
    { id: 'c2', name: '三线城市单月破百万门店复盘', format: 'pdf', size: '5.2 MB', date: '2025-01-11' },
    { id: 'c3', name: '标杆加盟商视频专访记录', format: 'mp4', size: '125.0 MB', date: '2025-01-14' },
    { id: 'c4', name: '校园店场景业绩倍增案例', format: 'docx', size: '3.1 MB', date: '2025-01-16' },
    { id: 'c5', name: '扭亏为盈实战指导案例集', format: 'pdf', size: '7.8 MB', date: '2025-01-19' },
    { id: 'c6', name: '优秀店长管理心得分享', format: 'pptx', size: '14.2 MB', date: '2025-01-23' },
  ],
  training: [
    { id: 't1', name: '零基础加盟商7天集训大纲', format: 'xlsx', size: '1.5 MB', date: '2025-01-03' },
    { id: 't2', name: '产品制作工艺标准视频教程', format: 'mp4', size: '345.2 MB', date: '2025-01-07' },
    { id: 't3', name: '服务礼仪与话术规范视频', format: 'mp4', size: '188.4 MB', date: '2025-01-12' },
    { id: 't4', name: '门店突发事件应急演练', format: 'pptx', size: '11.6 MB', date: '2025-01-15' },
    { id: 't5', name: '员工绩效考核及激励方案', format: 'docx', size: '2.7 MB', date: '2025-01-18' },
    { id: 't6', name: '理论+实操结业考试题库', format: 'pdf', size: '4.9 MB', date: '2025-01-21' },
  ],
  supply_chain: [
    { id: 's1', name: '核心原材料订货周期及标准', format: 'xlsx', size: '2.2 MB', date: '2025-01-04' },
    { id: 's2', name: '仓储物流配送范围及费用明细', format: 'pdf', size: '3.7 MB', date: '2025-01-09' },
    { id: 's3', name: '临期产品处理及损耗报备流程', format: 'docx', size: '1.6 MB', date: '2025-01-13' },
    { id: 's4', name: '设备采购及维修保养服务手册', format: 'pdf', size: '8.1 MB', date: '2025-01-17' },
    { id: 's5', name: '包装耗材统一订购价目表', format: 'xlsx', size: '1.1 MB', date: '2025-01-20' },
    { id: 's6', name: '旺季备货指导及预警机制', format: 'docx', size: '2.4 MB', date: '2025-01-24' },
  ],
};

const TypeIcon = ({ type }) => {
  const props = { width: 32, height: 32, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case 'handbook': return <svg {...props}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>;
    case 'roi_model': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'policy': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case 'guide': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
    case 'faq': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'case_study': return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'training': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'supply_chain': return <svg {...props}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    default: return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  }
};

const FileFormatIcon = ({ format }) => {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { flexShrink: 0 } };
  const str = (format || '').toLowerCase();
  if (str.includes('pdf')) return <svg {...props} color="#ef4444"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (str.includes('doc') || str.includes('word')) return <svg {...props} color="#3b82f6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (str.includes('xls') || str.includes('excel')) return <svg {...props} color="#10b981"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (str.includes('ppt')) return <svg {...props} color="#f97316"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (str.includes('mp4') || str.includes('video')) return <svg {...props} color="#8b5cf6"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>;
  if (str.includes('png') || str.includes('jpg') || str.includes('jpeg')) return <svg {...props} color="#ec4899"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  return <svg {...props} color="#6b7280"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
};

export default function FranchiseDocsView() {
  const coreTypes = ['handbook', 'roi_model', 'policy', 'guide'];
  const supportTypes = ['faq', 'case_study', 'training', 'supply_chain'];

  const renderCard = (type) => {
    const config = TYPE_CONFIG[type];
    const files = MOCK_FILES[type] || [];
    if (!config) return null;

    return (
      <div key={type} className={styles.kbCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconBox} ${styles[config.theme]}`}>
            <TypeIcon type={type} />
          </div>
          <div className={styles.metaBox}>
            <span className={`${styles.sourceTag} ${styles[config.source]}`}>
              {config.sourceLabel}
            </span>
            <div className={styles.docCount}>{files.length} 个文件</div>
          </div>
        </div>
        <h3 className={styles.cardTitle}>{config.name}</h3>
        
        {/* Directly show files instead of agent tags */}
        <div className={styles.fileList}>
          {files.map((f) => (
            <div key={f.id} className={styles.fileItem}>
              <FileFormatIcon format={f.format} />
              <span className={styles.fileName} title={f.name}>{f.name}</span>
              <span className={styles.fileMeta}>{f.size}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.kbContainer}>
        <div className={styles.kbSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.bluePill}></span> 核心招商体系
          </h2>
          <div className={styles.grid}>
            {coreTypes.map(renderCard)}
          </div>
        </div>

        <div className={styles.kbSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.orangePill}></span> 辅助支持材料
          </h2>
          <div className={styles.grid}>
            {supportTypes.map(renderCard)}
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
