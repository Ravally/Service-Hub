import React from 'react';

export default function AIResultPreview({ original, result, onAccept, onReject, onRetry, loading = false, label = 'AI Result' }) {
  if (!result && !loading) return null;

  return (
    <div className="mt-3 border border-purple-500/30 rounded-xl bg-purple-900/10 p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
          <span>✨</span> {label}
        </span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating...
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-200 whitespace-pre-wrap bg-midnight/40 rounded-lg p-3 border border-slate-700/30">
            {result}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="px-3 py-1.5 rounded-full bg-scaffld-teal/20 text-scaffld-teal text-xs font-semibold border border-scaffld-teal/30 hover:bg-scaffld-teal/30"
            >
              Use this
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 rounded-full bg-midnight text-slate-300 text-xs font-semibold border border-slate-700/30 hover:bg-charcoal"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={onReject}
              className="px-3 py-1.5 rounded-full text-slate-400 text-xs font-semibold hover:text-slate-200"
            >
              Keep original
            </button>
          </div>
        </>
      )}
    </div>
  );
}
