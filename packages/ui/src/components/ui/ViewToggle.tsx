import React from 'react';
import { Button } from './Button';
import { IconGridDots, IconList } from '@tabler/icons-react';

interface ViewToggleProps {
  layout: 'vertical' | 'horizontal';
  onLayoutChange: (layout: 'vertical' | 'horizontal') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ layout, onLayoutChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={layout === 'vertical' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onLayoutChange('vertical')}
      >
        <IconGridDots size={16} />
      </Button>
      <Button
        variant={layout === 'horizontal' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onLayoutChange('horizontal')}
      >
        <IconList size={16} />
      </Button>
    </div>
  );
};