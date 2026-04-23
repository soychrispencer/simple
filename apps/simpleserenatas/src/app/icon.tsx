import { ImageResponse } from 'next/og';
import { getSimpleBrandIconTokens } from '@simple/config';

export const runtime = 'edge';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  const tokens = getSimpleBrandIconTokens('simpleserenatas');

  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size.width}
        height={size.height}
        viewBox="0 0 512 512"
      >
        {/* Background */}
        <rect width="512" height="512" fill={tokens.canvas} rx="128" />
        
        {/* Inner tile */}
        <rect x="64" y="64" width="384" height="384" fill={tokens.tile} rx="64" />
        
        {/* Musical note icon */}
        <g transform="translate(128, 128)" fill={tokens.accent}>
          {/* Note head */}
          <ellipse cx="192" cy="208" rx="40" ry="32" />
          {/* Note stem */}
          <rect x="224" y="48" width="16" height="160" />
          {/* Note flag */}
          <path d="M 240 48 Q 280 80 240 112" stroke={tokens.accent} strokeWidth="16" fill="none" />
          {/* Second note head (chord) */}
          <ellipse cx="80" cy="160" rx="40" ry="32" />
          {/* Second note stem */}
          <rect x="112" y="0" width="16" height="160" />
          {/* Beam connecting notes */}
          <rect x="112" y="16" width="128" height="12" />
        </g>
        
        {/* Accent ring */}
        <circle
          cx="256"
          cy="256"
          r="220"
          fill="none"
          stroke={tokens.accent}
          strokeWidth="8"
        />
      </svg>
    ),
    {
      ...size,
    }
  );
}
