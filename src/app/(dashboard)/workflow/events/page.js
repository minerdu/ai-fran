import { Suspense } from 'react';
import EventsClient from '@/components/workflow/EventsClient';

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsClient />
    </Suspense>
  );
}
