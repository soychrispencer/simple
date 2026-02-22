import React, { useRef } from 'react';
import { UserAvatar } from '../ui';

interface ProfileAvatarUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  hide?: boolean;
  noBorder?: boolean;
  inline?: boolean;
  className?: string;
}

const ProfileAvatarUploader: React.FC<ProfileAvatarUploaderProps> = ({
  value,
  onChange,
  hide = false,
  noBorder = false,
  inline = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert to data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (hide) return null;

  const containerClasses = inline
    ? `relative inline-block ${className}`
    : `relative flex justify-center ${className}`;

  const avatarClasses = noBorder ? '' : '';

  return (
    <div className={containerClasses}>
      <div
        className="cursor-pointer"
        onClick={handleUploadClick}
      >
        <UserAvatar
          src={value}
          size="lg"
          className={`${avatarClasses} transition-colors`}
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--overlay-scrim-50)] rounded-full">
            <span className="text-[var(--color-on-primary)] text-xs font-medium">+</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute -top-1 -right-1 bg-[var(--color-danger)] hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity"
          title="Remover avatar"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ProfileAvatarUploader;
