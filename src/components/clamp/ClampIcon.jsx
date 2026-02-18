import React from 'react';

export default function ClampIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Cross tubes */}
      <line x1="1" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Right jaw */}
      <path d="M16.5 7 A6.5 6.5 0 0 1 16.5 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Left jaw */}
      <path d="M7.5 17 A6.5 6.5 0 0 1 7.5 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Center bolt */}
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
