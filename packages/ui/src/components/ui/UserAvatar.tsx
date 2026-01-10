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
  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };
    return sizeClasses[size];
  };

  const wrapperStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;
  const wrapperClasses = typeof size === 'number' ? '' : getSizeClasses(size);

  return (
    <div style={wrapperStyle} className={`rounded-full overflow-hidden ${wrapperClasses} ${className}`}>
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