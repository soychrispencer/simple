'use client';

import { AdminProtectedPage } from '@/components/admin-protected-page';
import { AdminListingsDashboard } from '@/components/admin-listings-dashboard';

export default function AdminListingsPage() {
    return (
        <AdminProtectedPage>
            {(user) => <AdminListingsDashboard currentUser={user} />}
        </AdminProtectedPage>
    );
}
