'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SettingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (tab === 'report' || tab === 'reports') {
      router.replace('/reports');
      return;
    }

    if (tab) {
      router.replace(`/me?tab=${encodeURIComponent(tab)}`);
      return;
    }

    router.replace('/me');
  }, [router, tab]);

  return <div style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>跳转中...</div>;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>跳转中...</div>}>
      <SettingsRedirect />
    </Suspense>
  );
}
