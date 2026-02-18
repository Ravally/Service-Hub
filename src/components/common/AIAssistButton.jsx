import React from 'react';

export default function AIAssistButton({ label = 'AI Assist', onClick, loading = false, disabled = false, size = 'sm', className = '' }) {
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-600/30 hover:text-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <span className="text-sm">✨</span>
      )}
      {loading ? 'Working...' : label}
    </button>
  );
}
