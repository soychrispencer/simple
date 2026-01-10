import React, { useRef } from 'react';
import { Button } from '../ui';

interface GalleryItem {
  id?: string;
  file?: File;
  dataUrl?: string;
  url?: string;
}

interface GalleryImageUploaderProps {
  value: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  maxImages?: number;
}

export const GalleryImageUploader: React.FC<GalleryImageUploaderProps> = ({
  value = [],
  onChange,
  maxImages = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newItems: GalleryItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file
    }));

    const updatedItems = [...value, ...newItems].slice(0, maxImages);
    onChange(updatedItems);
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    const updatedItems = value.filter((_, i) => i !== index);
    onChange(updatedItems);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {value.map((item, index) => (
          <div key={item.id || index} className="relative group">
            <div className="aspect-square bg-[var(--field-bg)] border border-[var(--field-border)] rounded-lg overflow-hidden">
              {item.dataUrl || item.url ? (
                <img
                  src={item.dataUrl || item.url}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : item.file ? (
                <div className="w-full h-full flex items-center justify-center text-lighttext/70 dark:text-darktext/70">
                  <span className="text-sm">{item.file.name}</span>
                </div>
              ) : null}
            </div>
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-[var(--color-danger)] text-[var(--color-on-primary)] rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <div
            onClick={handleUploadClick}
            className="aspect-square bg-[var(--field-bg)] border-2 border-dashed border-[var(--field-border)] hover:border-[var(--field-border-hover)] rounded-lg flex items-center justify-center cursor-pointer transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl text-lighttext/60 dark:text-darktext/60 mb-1">+</div>
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Agregar imagen</div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="text-sm text-lighttext/70 dark:text-darktext/70">
        {value.length}/{maxImages} imágenes
      </div>
    </div>
  );
};

export default GalleryImageUploader;