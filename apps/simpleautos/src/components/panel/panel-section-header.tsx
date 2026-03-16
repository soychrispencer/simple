import type { ReactNode } from 'react';
import { PanelPageHeader } from '@simple/ui';

type PanelSectionHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export default function PanelSectionHeader(props: PanelSectionHeaderProps) {
  return <PanelPageHeader {...props} />;
}
