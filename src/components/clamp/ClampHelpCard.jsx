import React from 'react';
import ClampIcon from './ClampIcon';

/**
 * Contextual Clamp help card for settings pages.
 * Shows a prompt with chip buttons that open the Clamp chat
 * and send a pre-seeded question.
 *
 * @param {{ chips: string[], title?: string }} props
 */
export default function ClampHelpCard({ chips = [], title = 'Need help setting this up?' }) {
  const handleChipClick = (message) => {
    window.dispatchEvent(new CustomEvent('clampChat:open', { detail: { message } }));
  };

  return (
    <div className="mt-6 rounded-xl border border-clamp-border/30 bg-clamp-soft/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-full bg-clamp-soft border border-clamp-border flex items-center justify-center">
          <ClampIcon size={12} className="text-clamp" />
        </div>
        <span className="text-sm font-semibold text-clamp">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-clamp-soft text-clamp border border-clamp-border hover:bg-clamp-hover transition-colors min-h-[44px]"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
