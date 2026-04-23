import styles from './AssetBundleBoard.module.css';

const CATEGORY_META = {
  handbook: { label: '招商手册', icon: '📖' },
  poster: { label: '海报 / 长图', icon: '🎨' },
  xiaohongshu: { label: '小红书文案', icon: '📱' },
  video_script: { label: '短视频脚本', icon: '🎬' },
  faq: { label: 'FAQ / 异议库', icon: '❓' },
  case_study: { label: '案例资料', icon: '📊' },
  referral_kit: { label: '裂变 / 招募物料', icon: '🎁' },
  other: { label: '其他素材', icon: '📄' },
};

function classifyAsset(name) {
  if (/FAQ|异议|问答/.test(name)) return 'faq';
  if (/手册|流程单|ROI/.test(name)) return 'handbook';
  if (/海报|长图|主视觉/.test(name)) return 'poster';
  if (/小红书|文案/.test(name)) return 'xiaohongshu';
  if (/视频|脚本/.test(name)) return 'video_script';
  if (/案例/.test(name)) return 'case_study';
  if (/裂变|推荐|招募|二维码/.test(name)) return 'referral_kit';
  return 'other';
}

function groupAssets(items = []) {
  const groups = Object.keys(CATEGORY_META).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

  items.forEach((item) => {
    const key = classifyAsset(item);
    groups[key].push(item);
  });

  return Object.entries(groups).filter(([, value]) => value.length > 0);
}

export default function AssetBundleBoard({ assets = [], manifestItems = [] }) {
  const merged = [...assets, ...manifestItems].filter(Boolean);
  const groups = groupAssets(merged);

  return (
    <div className={styles.board}>
      {groups.map(([key, items]) => {
        const meta = CATEGORY_META[key] || CATEGORY_META.other;
        return (
          <div key={key} className={styles.categoryCard}>
            <div className={styles.categoryHeader}>
              <span className={styles.categoryIcon}>{meta.icon}</span>
              <div>
                <strong className={styles.categoryTitle}>{meta.label}</strong>
                <span className={styles.categoryMeta}>{items.length} 项内容</span>
              </div>
            </div>
            <div className={styles.assetList}>
              {items.map((item, index) => (
                <div key={`${key}-${item}-${index}`} className={styles.assetRow}>
                  <span className={styles.assetDot} />
                  <span className={styles.assetName}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
