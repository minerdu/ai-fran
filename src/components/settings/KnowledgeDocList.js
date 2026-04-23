'use client';

import styles from './KnowledgeDocList.module.css';

const TYPE_LABELS = {
  handbook: '加盟手册',
  roi_model: 'ROI 模型',
  faq: 'FAQ',
  case_study: '标杆案例',
  policy: '招商政策',
  guide: '单店模型',
  training: '培训体系',
  supply_chain: '供应链',
};

export default function KnowledgeDocList({ documents }) {
  return (
    <div className={styles.list}>
      {documents.map((doc) => (
        <div key={doc.id} className={styles.item}>
          <div className={styles.main}>
            <span className={styles.name}>{doc.name}</span>
            <span className={styles.meta}>
              {(TYPE_LABELS[doc.type] || doc.type)} · {doc.format} · {doc.size} · {doc.sourceType} · {doc.chunkCount} 个知识块
            </span>
            <span className={styles.desc}>{doc.description}</span>
          </div>
          <span className={`${styles.status} ${doc.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
            {doc.status === 'published' ? '已入库' : '待发布'}
          </span>
        </div>
      ))}
    </div>
  );
}
