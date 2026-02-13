// src/components/icons/ScaffldLogo.jsx
import React from 'react';

/**
 * Scaffld Logo Component
 * Full logo with scaffold icon and wordmark
 */
export default function ScaffldLogo({ size = 'md', className = '', showText = true }) {
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
        <path d="M10 4V32" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 4V32" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M10 10H26" stroke="#0EA5A0" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 20H26" stroke="#0EA5A0" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M10 30H26" stroke="#0EA5A0" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M10 10L26 20" stroke="#F7845E" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <circle cx="10" cy="4" r="2" fill="#F7845E" opacity="0.8" />
        <circle cx="26" cy="4" r="2" fill="#FFAA5C" opacity="0.8" />
      </svg>
      {showText && (
        <span className={`${sizeClasses.text} font-display font-semibold text-slate-100`}>
          scaffld
        </span>
      )}
    </div>
  );
}
