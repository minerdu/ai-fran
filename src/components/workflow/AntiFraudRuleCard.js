import styles from './AntiFraudRuleCard.module.css';

function inferRuleTone(rule) {
  if (/暂停|冻结|黑名单|复核/i.test(rule)) return 'high';
  if (/去重|同法人|同地址|同手机号/i.test(rule)) return 'medium';
  return 'low';
}

function inferRuleLabel(rule) {
  if (/去重|同法人|同地址|同手机号/i.test(rule)) return '身份去重';
  if (/复核|人工/i.test(rule)) return '人工复核';
  if (/暂停|冻结/i.test(rule)) return '资格限制';
  return '规则约束';
}

const TONE_META = {
  high: { label: '高风险', color: '#b91c1c', bg: '#fef2f2' },
  medium: { label: '中风险', color: '#b45309', bg: '#fffbeb' },
  low: { label: '常规', color: '#166534', bg: '#f0fdf4' },
};

export default function AntiFraudRuleCard({ rules = [], thresholdText = '' }) {
  const items = (rules || []).map((rule, index) => {
    const tone = inferRuleTone(rule);
    return {
      id: `${index}_${rule}`,
      text: rule,
      tone,
      label: inferRuleLabel(rule),
      meta: TONE_META[tone],
    };
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>反作弊规则</span>
          <h3 className={styles.title}>裂变风险控制矩阵</h3>
        </div>
        <span className={styles.summary}>{items.length} 条生效规则</span>
      </div>

      {thresholdText ? <p className={styles.threshold}>{thresholdText}</p> : null}

      <div className={styles.ruleList}>
        {items.map((item) => (
          <div key={item.id} className={styles.ruleItem}>
            <div className={styles.ruleMain}>
              <span className={styles.ruleLabel}>{item.label}</span>
              <strong className={styles.ruleText}>{item.text}</strong>
            </div>
            <span className={styles.ruleTone} style={{ color: item.meta.color, background: item.meta.bg }}>
              {item.meta.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
