'use client';

import { AdminProtectedPage } from '@/components/admin-protected-page';
import { AdminWhatsAppSetup } from '@/components/admin-whatsapp-setup';

export default function AdminWhatsAppPage() {
    return (
        <AdminProtectedPage>
            {(user) => <AdminWhatsAppSetup user={user} />}
        </AdminProtectedPage>
    );
}
