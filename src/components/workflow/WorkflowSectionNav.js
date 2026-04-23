import Link from 'next/link';
import styles from './WorkflowSectionNav.module.css';

const sections = [
  { href: '/workflow', label: '总览' },
  { href: '/workflow/playbooks', label: '招商方案' },
  { href: '/workflow/events', label: '会议中心' },
  { href: '/workflow/referrals', label: '裂变中心' },
  { href: '/workflow/runs', label: '执行中心' },
];

export default function WorkflowSectionNav({ current }) {
  return (
    <div className={styles.nav}>
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className={`${styles.link} ${current === section.href ? styles.active : ''}`}
        >
          {section.label}
        </Link>
      ))}
    </div>
  );
}
