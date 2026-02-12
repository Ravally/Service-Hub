import React from 'react';

const KpiCard = ({ title, sub, value, money, delta, deltaText, positive, deltaPositive }) => {
  const showDelta = typeof delta === 'string' || typeof deltaText === 'string';
  const deltaLabel = delta || deltaText;
  const isPositive = positive ?? deltaPositive ?? true;

  return (
    <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="text-xs text-slate-400 mb-2">{sub}</div>
      <div className="text-3xl font-bold text-slate-100">{value}</div>
      {typeof money === 'string' && <div className="text-xs text-slate-400">{money}</div>}
      {showDelta && (
        <div className={`inline-flex items-center mt-2 text-xs font-medium ${isPositive ? 'text-trellio-teal' : 'text-signal-coral'}`}>
          <span className={`inline-block h-2 w-2 rounded-full mr-1 ${isPositive ? 'bg-trellio-teal' : 'bg-signal-coral'}`} />
          {deltaLabel}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
