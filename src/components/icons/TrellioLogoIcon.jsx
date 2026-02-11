// src/components/icons/TrellioLogoIcon.jsx
import React from 'react';

/**
 * Trellio Logo Icon Only
 * Just the house icon without text
 */
export default function TrellioLogoIcon({ size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12'
  };

  const sizeClass = sizes[size] || sizes.md;

  return (
    <svg
      className={`${sizeClass} ${className}`}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House outline */}
      <path
        d="M6 28V14L18 6L30 14V28"
        stroke="#0EA5A0"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top vertex (Trellio Teal) */}
      <circle cx="18" cy="6" r="2.5" fill="#0EA5A0" />
      {/* Left vertex (Signal Coral) */}
      <circle cx="6" cy="14" r="1.8" fill="#F7845E" opacity="0.8" />
      {/* Right vertex (Harvest Amber) */}
      <circle cx="30" cy="14" r="1.8" fill="#FFAA5C" opacity="0.8" />
    </svg>
  );
}
