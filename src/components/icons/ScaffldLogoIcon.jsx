// src/components/icons/ScaffldLogoIcon.jsx
import React from 'react';

/**
 * Scaffld Logo Icon Only
 * Scaffold mark without text
 */
export default function ScaffldLogoIcon({ size = 'md', className = '' }) {
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
      {/* Left vertical */}
      <path d="M10 4V32" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right vertical */}
      <path d="M26 4V32" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round" />
      {/* Top crossbar */}
      <path d="M10 10H26" stroke="#0EA5A0" strokeWidth="2" strokeLinecap="round" />
      {/* Middle crossbar */}
      <path d="M10 20H26" stroke="#0EA5A0" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Bottom crossbar */}
      <path d="M10 30H26" stroke="#0EA5A0" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Diagonal brace (Signal Coral) */}
      <path d="M10 10L26 20" stroke="#F7845E" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Top-left node (Signal Coral) */}
      <circle cx="10" cy="4" r="2" fill="#F7845E" opacity="0.8" />
      {/* Top-right node (Harvest Amber) */}
      <circle cx="26" cy="4" r="2" fill="#FFAA5C" opacity="0.8" />
    </svg>
  );
}
