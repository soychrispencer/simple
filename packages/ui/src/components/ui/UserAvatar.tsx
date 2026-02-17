import React from 'react';
import { IconUser } from '@tabler/icons-react';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = 'User avatar',
  size = 'md',
  className = ''
}) => {
  const namedSizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };
  const numericSizeClasses: Record<number, string> = {
    24: 'w-6 h-6',
    28: 'w-7 h-7',
    32: 'w-8 h-8',
    36: 'w-9 h-9',
    40: 'w-10 h-10',
    44: 'w-11 h-11',
    48: 'w-12 h-12',
    56: 'w-14 h-14',
    64: 'w-16 h-16',
    72: 'w-[72px] h-[72px]',
    80: 'w-20 h-20',
    96: 'w-24 h-24',
    112: 'w-28 h-28',
    128: 'w-32 h-32',
    160: 'w-40 h-40'
  };
  const wrapperClasses = typeof size === 'number'
    ? (numericSizeClasses[size] || namedSizeClasses.md)
    : namedSizeClasses[size];

  return (
    <div className={`rounded-full overflow-hidden ${wrapperClasses} ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-[var(--field-bg)] border border-[var(--field-border)] flex items-center justify-center">
          <IconUser size={18} stroke={1.5} className="text-lighttext/70 dark:text-darktext/70" />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
