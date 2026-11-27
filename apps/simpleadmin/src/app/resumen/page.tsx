'use client';

import { AdminProtectedPage } from '@/components/admin-protected-page';
import { AdminOverviewDashboard } from '@/components/admin-overview-dashboard';

export default function AdminResumenPage() {
    return (
        <AdminProtectedPage>
            {() => <AdminOverviewDashboard />}
        </AdminProtectedPage>
    );
}
