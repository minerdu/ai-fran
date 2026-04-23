import { Suspense } from 'react';
import PlaybooksClient from '@/components/workflow/PlaybooksClient';

export default function PlaybooksPage() {
  return (
    <Suspense fallback={null}>
      <PlaybooksClient />
    </Suspense>
  );
}
