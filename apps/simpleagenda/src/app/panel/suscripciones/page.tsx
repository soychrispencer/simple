import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubscriptionWrapper from './subscription-wrapper';

export const metadata: Metadata = {
  title: 'Suscripciones - SimpleAgenda',
  description: 'Gestiona tu plan de suscripción mensual',
};

function SubscriptionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: 'var(--bg-muted)' }} />
      <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
      <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <section className="panel-content-frame">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Suscripciones</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
          Gestiona tu plan de suscripción y pagos
        </p>
      </div>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionWrapper />
      </Suspense>
    </section>
  );
}
