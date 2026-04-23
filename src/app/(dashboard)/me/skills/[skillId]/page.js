import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMobileMeSkillDetailPayload } from '@/lib/mobileBff';
import styles from './page.module.css';

const ENV_META = {
  prod: { label: '生产环境', color: '#166534', bg: '#f0fdf4' },
  staging: { label: '预发环境', color: '#b45309', bg: '#fffbeb' },
  dev: { label: '开发环境', color: '#475569', bg: '#f8fafc' },
  gray: { label: '灰度环境', color: '#2563eb', bg: '#eff6ff' },
};

function buildEnvironmentNarrative(environments = []) {
  return environments.map((env) => ENV_META[env]?.label || env).join('、');
}

export default async function SkillDetailPage({ params }) {
  const payload = await buildMobileMeSkillDetailPayload(params.skillId);
  if (!payload) notFound();

  const { skill, riskHints = [] } = payload;

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroHead}>
          <Link href="/me" className={styles.backLink}>‹ 返回我的</Link>
          <span className={styles.statusBadge}>{skill.status}</span>
        </div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{skill.name}</h1>
          <p className={styles.description}>
            对标来源：{skill.benchmark}。当前版本 {skill.version}，按 {skill.group || '招商体系'} 维度进行管理。
          </p>
        </div>
        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>推荐原因</span>
            <strong>{skill.recommendationReason || '已纳入标准推荐清单'}</strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>环境分布</span>
            <strong>{buildEnvironmentNarrative(skill.environments)}</strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>连接器数量</span>
            <strong>{skill.connectorRequirements?.length || 0} 个</strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>能力项数量</span>
            <strong>{skill.items?.length || 0} 项</strong>
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>环境与发布策略</h2>
        </div>
        <div className={styles.envRow}>
          {(skill.environments || []).map((env) => {
            const meta = ENV_META[env] || { label: env, color: '#475569', bg: '#f8fafc' };
            return (
              <span key={env} className={styles.envTag} style={{ color: meta.color, background: meta.bg }}>
                {meta.label}
              </span>
            );
          })}
        </div>
        <p className={styles.paragraph}>
          当前 Skill 会在 {buildEnvironmentNarrative(skill.environments)} 中复用相同对标规则。生产环境承担正式招商执行，
          预发和灰度环境用于规则验证，开发环境用于总部自定义补充与品牌建模后草稿迭代。
        </p>
      </section>

      <section className={styles.twoColGrid}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>能力项</h2>
          </div>
          <div className={styles.listGrid}>
            {(skill.items || []).map((item) => (
              <div key={item} className={styles.listCard}>
                <strong>{item}</strong>
                <span>用于招商阶段标准动作与提示词编排</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>连接器依赖</h2>
          </div>
          <div className={styles.listGrid}>
            {(skill.connectorRequirements || []).map((item) => (
              <div key={item} className={styles.connectorCard}>
                <strong>{item}</strong>
                <span>启用前需完成接入与可用性校验</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>上线建议与风险提示</h2>
        </div>
        <div className={styles.tipsList}>
          {riskHints.map((hint) => (
            <div key={hint} className={styles.tipItem}>{hint}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
