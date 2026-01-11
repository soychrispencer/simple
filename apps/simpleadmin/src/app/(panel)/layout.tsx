import React from 'react';

import AdminPanelShell from '@/components/AdminPanelShell';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminPanelShell>{children}</AdminPanelShell>;
}
