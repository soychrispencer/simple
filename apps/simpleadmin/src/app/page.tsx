'use client';

import { AdminProtectedPage } from '@/components/admin-protected-page';
import { AdminUsersDashboard } from '@/components/admin-users-dashboard';

export default function AdminDashboardPage() {
    return (
        <AdminProtectedPage>
            {() => (
                <AdminUsersDashboard />
            )}
        </AdminProtectedPage>
    );
}
