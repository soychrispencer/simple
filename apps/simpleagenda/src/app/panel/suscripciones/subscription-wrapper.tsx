'use client';

import dynamic from 'next/dynamic';

const SubscriptionManager = dynamic(
  () => import('@/components/panel/subscription-manager'),
  { ssr: false }
);

export default function SubscriptionWrapper() {
  return <SubscriptionManager />;
}
