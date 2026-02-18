import React, { useRef, useState } from 'react';

export default function ClampChatInput({ onSend, disabled = false }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="border-t border-slate-700/30 p-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask Clamp..."
        className="flex-1 bg-midnight border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-clamp-border min-h-[44px] max-h-[120px] disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="h-11 w-11 flex-shrink-0 rounded-xl bg-clamp flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-clamp-deep transition-colors"
        title="Send"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-midnight">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
