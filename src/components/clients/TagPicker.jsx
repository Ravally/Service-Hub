// src/components/clients/TagPicker.jsx
import React, { useEffect, useRef, useState } from 'react';

/**
 * Combobox-style tag picker for selecting existing or creating new tags.
 */
export default function TagPicker({ allTags = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const matches = allTags.filter(t => t.toLowerCase().includes(lower));
  const exactMatch = allTags.some(t => t.toLowerCase() === lower);
  const showCreate = trimmed && !exactMatch;

  const handleSelect = (tag) => {
    if (!tag) return;
    onSelect(tag);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && trimmed) {
      e.preventDefault();
      handleSelect(trimmed);
    }
    if (e.key === 'Escape') onClose?.();
  };

  return (
    <div className="inline-block bg-charcoal border border-slate-700/30 rounded-lg shadow-lg p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">Add tag</span>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 min-h-[44px] px-1">Close</button>
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search or create tag..."
        className="w-full px-3 py-2 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 rounded-md text-sm focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20 min-h-[44px]"
      />
      <div className="max-h-48 overflow-y-auto mt-2">
        {showCreate && (
          <button
            type="button"
            onClick={() => handleSelect(trimmed)}
            className="w-full text-left px-3 py-2 text-sm text-scaffld-teal hover:bg-slate-dark rounded min-h-[44px]"
          >
            Create &ldquo;{trimmed}&rdquo;
          </button>
        )}
        {matches.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => handleSelect(tag)}
            className="w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-dark rounded min-h-[44px]"
          >
            {tag}
          </button>
        ))}
        {matches.length === 0 && !showCreate && (
          <div className="text-xs text-slate-500 p-2">No tags found. Type to create.</div>
        )}
      </div>
    </div>
  );
}
