'use client';

import { useState } from 'react';

export default function CounselorAvatar({ src, name, className = 'h-16 w-16', priority = false }: {
  src?: string;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
  return (
    <span className={`ui-avatar ${className}`}>
      {src && src !== failedSrc ? (
        // External counselor portraits have no fixed image-host contract.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={96} height={96} loading={priority ? 'eager' : 'lazy'}
          decoding="async" className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : <span role="img" aria-label={name}>{initials || 'R'}</span>}
    </span>
  );
}
