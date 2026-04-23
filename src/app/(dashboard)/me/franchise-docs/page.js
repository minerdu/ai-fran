import FranchiseDocsView from '@/components/settings/FranchiseDocsView';
import styles from '../page.module.css';

export default function FranchiseDocsPage() {
  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <h2 className={styles.title}>招商文档</h2>
      </div>
      <div className={styles.content}>
        <FranchiseDocsView />
      </div>
    </div>
  );
}
