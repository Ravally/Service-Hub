import React from 'react';
import { EXPENSE_CATEGORIES } from '../../constants';

export default function ExpensesFilters({ filters, onChange, jobs, onExport }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        <input
          type="date"
          value={filters.from || ''}
          onChange={(e) => update('from', e.target.value)}
          className="px-2 py-1.5 bg-midnight border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-scaffld-teal/50"
        />
        <span className="text-slate-500 text-sm">to</span>
        <input
          type="date"
          value={filters.to || ''}
          onChange={(e) => update('to', e.target.value)}
          className="px-2 py-1.5 bg-midnight border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-scaffld-teal/50"
        />
        <select
          value={filters.category || ''}
          onChange={(e) => update('category', e.target.value)}
          className="px-2 py-1.5 bg-midnight border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-scaffld-teal/50"
        >
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select
          value={filters.jobId || ''}
          onChange={(e) => update('jobId', e.target.value)}
          className="px-2 py-1.5 bg-midnight border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-scaffld-teal/50"
        >
          <option value="">All Jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title || j.jobNumber || j.id}</option>
          ))}
        </select>
      </div>
      {onExport && (
        <button
          onClick={onExport}
          className="px-3 py-1.5 bg-charcoal border border-slate-700/30 rounded-lg text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      )}
    </div>
  );
}
