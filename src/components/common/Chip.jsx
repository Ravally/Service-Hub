import React from 'react';

const Chip = ({ children, onClick, active = false, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm border ${active ? 'bg-trellio-teal text-midnight border-trellio-teal' : 'bg-charcoal text-slate-100 border-slate-700/30'} ${className}`}
  >
    {children}
  </button>
);

export default Chip;
