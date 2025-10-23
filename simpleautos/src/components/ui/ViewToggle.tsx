import React from 'react';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';
import { CircleButton } from './CircleButton';

interface ViewToggleProps {
  layout: 'vertical' | 'horizontal';
  onLayoutChange: (layout: 'vertical' | 'horizontal') => void;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  layout,
  onLayoutChange,
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CircleButton
        type="button"
        variant={layout === 'vertical' ? 'primary' : 'default'}
        size={40}
        onClick={() => onLayoutChange('vertical')}
        title="Vista vertical"
        aria-label="Vista vertical"
      >
        <IconLayoutGrid size={20} stroke={1.5} />
      </CircleButton>
      <CircleButton
        type="button"
        variant={layout === 'horizontal' ? 'primary' : 'default'}
        size={40}
        onClick={() => onLayoutChange('horizontal')}
        title="Vista horizontal"
        aria-label="Vista horizontal"
      >
        <IconLayoutList size={20} stroke={1.5} />
      </CircleButton>
    </div>
  );
};
