import React from 'react';

export default function ClampQuickChips({ chips = [], onSelect, disabled = false }) {
  if (chips.length === 0) return null;

  return (
    <div className="px-3 pb-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs rounded-full bg-clamp-soft text-clamp border border-clamp-border font-semibold hover:bg-clamp-hover hover:text-clamp-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
