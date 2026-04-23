import Link from 'next/link';
import RedLineConfigCard from '@/components/settings/RedLineConfigCard';
import styles from '@/app/(dashboard)/me/page.module.css';

export default function SettingsRedlinePage() {
  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <Link href="/me" className={styles.backBtn}>‹ 返回</Link>
        <h2 className={styles.title}>红线与安全规则</h2>
      </div>
      <div className={styles.content}>
        <RedLineConfigCard />
      </div>
    </div>
  );
}
