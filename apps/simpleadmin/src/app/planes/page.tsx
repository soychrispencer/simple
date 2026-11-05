'use client';

import { AdminProtectedPage } from '@/components/admin-protected-page';
import { AdminAgendaPlansDashboard } from '@/components/admin-agenda-plans-dashboard';

export default function AdminPlansPage() {
    return (
        <AdminProtectedPage>
            {(user) => <AdminAgendaPlansDashboard user={user} />}
        </AdminProtectedPage>
    );
}
