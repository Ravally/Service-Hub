import React from 'react';

export default function BulkActionBar({ selectedCount, onDeselectAll, actions = [] }) {
  if (selectedCount === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-scaffld-teal font-semibold">{selectedCount} selected</span>
      <button onClick={onDeselectAll} className="min-h-[44px] text-scaffld-teal hover:underline text-sm font-medium">
        Deselect All
      </button>
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={
            action.variant === 'danger'
              ? 'min-h-[44px] px-3 py-1.5 rounded-md border border-signal-coral bg-charcoal text-signal-coral hover:bg-signal-coral hover:text-white transition-colors font-medium'
              : 'min-h-[44px] px-3 py-1.5 rounded-md border border-slate-700 bg-charcoal text-slate-100 hover:bg-slate-dark transition-colors font-medium'
          }
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
