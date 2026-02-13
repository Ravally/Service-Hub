import React from 'react';
import { REPORT_PERIOD_OPTIONS } from '../../constants';

export default function PeriodSelector({ period, onChange, customRange, onCustomChange, onExport }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="flex flex-wrap gap-1.5 flex-1">
        {REPORT_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === opt.key
                ? 'bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/30'
                : 'bg-charcoal border border-slate-700/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customRange.from || ''}
            onChange={(e) => onCustomChange({ ...customRange, from: e.target.value })}
            className="px-2 py-1.5 bg-midnight border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-scaffld-teal/50"
          />
          <span className="text-slate-500 text-sm">to</span>
          <input
            type="date"
            value={customRange.to || ''}
            onChange={(e) => onCustomChange({ ...customRange, to: e.target.value })}
            className="px-2 py-1.5 bg-midnight border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-scaffld-teal/50"
          />
        </div>
      )}

      {onExport && (
        <button
          onClick={onExport}
          className="px-3 py-1.5 bg-charcoal border border-slate-700/30 rounded-lg text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      )}
    </div>
  );
}
