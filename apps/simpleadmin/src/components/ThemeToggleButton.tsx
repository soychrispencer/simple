'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { CircleButton } from '@simple/ui';

export default function ThemeToggleButton() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <CircleButton aria-label="Cambiar tema" onClick={handleToggle} size={40}>
      {mounted ? (isDark ? 'D' : 'L') : 'L'}
    </CircleButton>
  );
}
