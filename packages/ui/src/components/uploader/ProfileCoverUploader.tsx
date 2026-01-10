import React, { useRef } from 'react';
import { Button } from '../ui';

interface ProfileCoverUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  cropOpen?: boolean;
  setCropOpen?: (open: boolean) => void;
  className?: string;
}

export const ProfileCoverUploader: React.FC<ProfileCoverUploaderProps> = ({
  value,
  onChange,
  cropOpen,
  setCropOpen,
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

  return (
    <div className={`relative ${className}`}>
      <div
        className="w-full h-32 bg-[var(--field-bg)] border-2 border-dashed border-[var(--field-border)] hover:border-[var(--field-border-hover)] flex items-center justify-center cursor-pointer transition-colors"
        style={{ borderRadius: 'var(--card-radius)' }}
        onClick={handleUploadClick}
      >
        {value ? (
          <img
            src={value}
            alt="Cover"
            className="w-full h-full object-cover"
            style={{ borderRadius: 'var(--card-radius)' }}
          />
        ) : (
          <div className="text-center">
            <div className="text-2xl text-lighttext/60 dark:text-darktext/60 mb-1">+</div>
            <div className="text-sm text-lighttext/70 dark:text-darktext/70">Agregar imagen de portada</div>
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
        <Button
          onClick={() => onChange('')}
          className="absolute top-2 right-2 bg-[var(--color-danger)] hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] px-2 py-1 text-xs"
        >
          Remover
        </Button>
      )}
    </div>
  );
};

export default ProfileCoverUploader;