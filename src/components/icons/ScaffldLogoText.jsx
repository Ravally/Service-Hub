// src/components/icons/ScaffldLogoText.jsx
import React from 'react';

/**
 * Scaffld Logo Text Only
 * Just the wordmark without icon
 */
export default function ScaffldLogoText({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl'
  };

  const sizeClass = sizes[size] || sizes.md;

  return (
    <span className={`${sizeClass} font-display font-semibold text-slate-100 ${className}`}>
      scaffld
    </span>
  );
}
