import React from 'react';

export const inputCls = 'w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100';
export const labelCls = 'block text-sm font-medium text-slate-300 mb-1';
export const sectionCls = 'bg-midnight/60 p-4 rounded-lg border border-slate-700/30 mb-4';
export const sectionTitle = 'text-sm font-semibold text-scaffld-teal uppercase tracking-wider mb-4';
export const saveBtnCls = 'px-4 py-2 bg-scaffld-teal text-white rounded-md font-semibold hover:bg-scaffld-teal/80';

export const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <button type="button" onClick={() => onChange(!checked)} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-scaffld-teal' : 'bg-slate-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
    <span className="text-sm text-slate-300">{label}</span>
  </label>
);
