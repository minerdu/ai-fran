import { Suspense } from 'react';
import ReferralsClient from '@/components/workflow/ReferralsClient';

export default function ReferralsPage() {
  return (
    <Suspense fallback={null}>
      <ReferralsClient />
    </Suspense>
  );
}
