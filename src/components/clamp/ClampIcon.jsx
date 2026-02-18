import React from 'react';

export default function ClampIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 4V20" />
      <path d="M7 4H11C13.2091 4 15 5.79086 15 8V8C15 10.2091 13.2091 12 11 12H7" />
      <path d="M17 4V20" />
      <path d="M17 12H13" />
    </svg>
  );
}
