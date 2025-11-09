import React from "react";
import { IconUser } from '@tabler/icons-react';
import { getAvatarUrl } from "@/lib/supabaseStorage";
import { useSupabase } from "@/lib/supabase/useSupabase";
import Image from 'next/image';

interface AvatarProps {
  path?: string | null; // path en storage
  src?: string | null; // url directa (opcional)
  alt?: string;
  size?: number | string; // px o tailwind (w-24, etc)
  className?: string;
}

export function UserAvatar({ path, src, alt = "avatar", size = 96, className = "" }: AvatarProps) {
  const supabase = useSupabase();
  // Forzar refresco de imagen si el path cambia (por ejemplo, tras subir un nuevo avatar)
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    if (path) setVersion(Date.now());
  }, [path]);
  const url = src || (path ? getAvatarUrl(supabase, path) + (path ? `?v=${version}` : "") : null);
  const sizeStyle = typeof size === "number" ? { width: size, height: size } : undefined;
  const numericSize = typeof size === "number" ? size : undefined;
  const sizesAttr = numericSize ? `${numericSize}px` : "96px";
  const canOptimize = !!url && url.startsWith('https://');
  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center ${className}`}
      style={sizeStyle}
    >
      {url ? (
        canOptimize ? (
          <Image
            src={url}
            alt={alt}
            width={numericSize || 96}
            height={numericSize || 96}
            sizes={sizesAttr}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        ) : (
          <img src={url} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        )
      ) : (
        <IconUser size={typeof size === "number" ? size * 0.5 : 48} stroke={1} />
      )}
    </div>
  );
}
