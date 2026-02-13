import React from 'react';

const UpArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const DownArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function ReportCard({ title, value, subtitle, change }) {
  const showChange = change !== undefined && change !== null;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4">
      <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-slate-100 font-display">{value}</p>
        {showChange && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold mb-0.5 ${
              isPositive ? 'text-green-500' : isNegative ? 'text-signal-coral' : 'text-slate-500'
            }`}
          >
            {isPositive ? <UpArrow /> : isNegative ? <DownArrow /> : null}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
