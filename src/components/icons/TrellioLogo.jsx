// src/components/icons/TrellioLogo.jsx
import React from 'react';

/**
 * Trellio Logo Component
 * Full logo with icon and text
 */
export default function TrellioLogo({ size = 'md', className = '', showText = true }) {
  const sizes = {
    sm: { svg: 'h-6', text: 'text-base' },
    md: { svg: 'h-8', text: 'text-xl' },
    lg: { svg: 'h-10', text: 'text-2xl' },
    xl: { svg: 'h-12', text: 'text-3xl' }
  };

  const sizeClasses = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg className={sizeClasses.svg} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      {showText && (
        <span className={`${sizeClasses.text} font-display font-semibold text-slate-100`}>
          Trellio
        </span>
      )}
    </div>
  );
}
