import React from 'react';

const Chip = ({ children, onClick, active = false, className = '' }) => (
  <button
    onClick={onClick}
    className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm border ${active ? 'bg-scaffld-teal text-midnight border-scaffld-teal' : 'bg-charcoal text-slate-100 border-slate-700/30'} ${className}`}
  >
    {children}
  </button>
);

export default Chip;
