import './globals.css';
import type { Metadata } from 'next';
import { ClientProviders } from '../components/providers/ClientProviders';
import { Header } from '@simple/ui';
import LogoutButton from '../components/LogoutButton';
import { createServerClient } from '../lib/supabase/serverSupabase';
import AdminNotificationsBell from '../components/AdminNotificationsBell';
import { getStaffGate } from '../lib/admin/auth';

export const metadata: Metadata = {
  title: 'Simple Admin',
  description: 'Panel administrativo global',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const hasUser = Boolean(data.user);
  const gate = await getStaffGate();
  const isStaff = gate.status === 'staff';

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-lightbg text-lighttext dark:bg-darkbg dark:text-darktext font-sans simpleadmin-app" suppressHydrationWarning>
        <ClientProviders>
          <Header
            vertical="admin"
            loading={false}
            user={undefined}
            showNotifications={false}
            showPublishButton={false}
            showAuthButton={false}
            rightActions={
              hasUser ? (
                <div className="flex items-center gap-2">
                  {isStaff ? <AdminNotificationsBell /> : null}
                  <LogoutButton />
                </div>
              ) : null
            }
          />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
