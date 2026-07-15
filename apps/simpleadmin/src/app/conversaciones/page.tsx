'use client';

import { AdminProtectedPage } from '@/components/admin-protected-page';
import { AdminConversationsDashboard } from '@/components/admin-conversations-dashboard';

export default function AdminConversacionesPage() {
    return (
        <AdminProtectedPage>
            {() => <AdminConversationsDashboard />}
        </AdminProtectedPage>
    );
}
