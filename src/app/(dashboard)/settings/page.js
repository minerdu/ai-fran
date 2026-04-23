import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SettingsPage({ searchParams }) {
  const tab = searchParams?.tab;

  if (tab === 'report' || tab === 'reports') {
    redirect('/reports');
  }

  if (tab) {
    redirect(`/me?tab=${encodeURIComponent(tab)}`);
  }

  redirect('/me');
}
