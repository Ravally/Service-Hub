import React from 'react';
import ClampIcon from './ClampIcon';

export default function ClampActionCard({ card, onNavigate }) {
  if (!card) return null;

  const label = card.label || `Go to ${card.view || 'dashboard'}`;

  return (
    <div className="mt-2 flex items-center gap-2 p-2.5 bg-clamp-soft border border-clamp-border rounded-xl">
      <ClampIcon size={14} className="text-clamp flex-shrink-0" />
      <span className="text-xs text-clamp font-semibold flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={() => onNavigate(card)}
        className="px-3 py-1.5 bg-clamp text-midnight text-xs font-semibold rounded-full hover:bg-clamp-deep transition-colors min-h-[36px]"
      >
        View
      </button>
    </div>
  );
}
