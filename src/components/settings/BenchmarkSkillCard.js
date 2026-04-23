'use client';

import Link from 'next/link';
import styles from './BenchmarkSkillCard.module.css';

const ENV_META = {
  prod: { label: '生产', color: '#166534', bg: '#f0fdf4' },
  staging: { label: '预发', color: '#b45309', bg: '#fffbeb' },
  dev: { label: '开发', color: '#475569', bg: '#f8fafc' },
  gray: { label: '灰度', color: '#2563eb', bg: '#eff6ff' },
};

export default function BenchmarkSkillCard({ skill, detailHref = null }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{skill.name}</div>
          <div className={styles.meta}>对标来源：{skill.benchmark} · {skill.version}</div>
        </div>
        <span className={styles.status}>{skill.status}</span>
      </div>

      <div className={styles.envRow}>
        {skill.environments.map((env) => {
          const meta = ENV_META[env];
          return (
            <span key={`${skill.id}-${env}`} className={styles.envTag} style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>能力项</span>
        <div className={styles.chips}>
          {skill.items.map((item) => (
            <span key={`${skill.id}-${item}`} className={styles.chip}>{item}</span>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>连接器依赖</span>
        <div className={styles.connectorRow}>
          {skill.connectorRequirements.map((item) => (
            <span key={`${skill.id}-${item}`} className={styles.connector}>{item}</span>
          ))}
        </div>
      </div>

      <div className={styles.reason}>{skill.recommendationReason}</div>

      {detailHref ? (
        <Link href={detailHref} className={styles.detailLink}>
          查看 Skill 详情
        </Link>
      ) : null}
    </div>
  );
}
