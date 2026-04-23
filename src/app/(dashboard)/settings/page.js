import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab;

  if (tab === 'report' || tab === 'reports') {
    redirect('/reports');
  }

  if (tab) {
    redirect(`/me?tab=${encodeURIComponent(tab)}`);
  }

  redirect('/me');
}
