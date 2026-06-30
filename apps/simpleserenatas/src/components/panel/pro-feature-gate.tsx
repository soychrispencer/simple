'use client';

import type { ReactNode } from 'react';

type ProFeatureGateProps = {
    featureName?: string;
    description?: string;
    children: ReactNode;
};

/** El acceso se controla solo con SubscriptionGate tras la prueba de 30 días. */
export function ProFeatureGate({ children }: ProFeatureGateProps) {
    return <>{children}</>;
}
