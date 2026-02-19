import React, { useMemo, useState } from 'react';
import { useAppState } from '../contexts';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EXPENSE_CATEGORIES } from '../constants';
import { downloadCSV } from '../utils/payrollExport';
import ExpensesSummaryCards from './expenses/ExpensesSummaryCards';
import ExpensesFilters from './expenses/ExpensesFilters';
import ExpensesTable from './expenses/ExpensesTable';
import ClampButton from './clamp/ClampButton';
import { aiService } from '../services/aiService';

function escapeCSV(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExpensesPage() {
  const { jobs = [], clients = [], onUpdateJob } = useAppState();
  const [filters, setFilters] = useState({ from: '', to: '', category: '', jobId: '' });
  const [catLoading, setCatLoading] = useState(false);
  const [catSuggestions, setCatSuggestions] = useState(null);

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach((c) => { m[c.id] = c.name || c.companyName || 'Unknown'; });
    return m;
  }, [clients]);

  const allExpenses = useMemo(() => {
    const flat = [];
    jobs.forEach((job) => {
      (job.expenses || []).forEach((exp) => {
        flat.push({
          ...exp,
          _key: `${job.id}_${exp.id || flat.length}`,
          jobId: job.id,
          jobTitle: job.title || job.jobNumber || '',
          clientName: clientMap[job.clientId] || '',
          amount: Number(exp.amount || exp.cost || 0),
          category: exp.category || 'other',
        });
      });
    });
    flat.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return flat;
  }, [jobs, clientMap]);

  const filtered = useMemo(() => {
    return allExpenses.filter((e) => {
      if (filters.from && e.date && e.date < filters.from) return false;
      if (filters.to && e.date && e.date > filters.to) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.jobId && e.jobId !== filters.jobId) return false;
      return true;
    });
  }, [allExpenses, filters]);

  const jobsWithExpenses = useMemo(() => {
    return jobs.filter((j) => j.expenses?.length > 0);
  }, [jobs]);

  const uncategorized = useMemo(() => filtered.filter((e) => !e.category || e.category === 'other'), [filtered]);

  const handleCategorize = async () => {
    if (uncategorized.length === 0) return;
    setCatLoading(true);
    try {
      const descriptions = uncategorized.map((e) => e.title || 'Expense');
      const result = await aiService.categorizeExpenses(descriptions);
      setCatSuggestions(result.map((r, i) => ({
        ...uncategorized[i],
        suggestedCategory: r.category,
      })));
    } catch (err) {
      console.error('Categorization failed:', err);
    } finally {
      setCatLoading(false);
    }
  };

  const handleExport = () => {
    const catLabel = (key) => EXPENSE_CATEGORIES.find((c) => c.key === key)?.label || 'Other';
    const header = 'Date,Title,Category,Job,Client,Amount,Note';
    const rows = filtered.map((e) =>
      [e.date || '', escapeCSV(e.title), catLabel(e.category), escapeCSV(e.jobTitle), escapeCSV(e.clientName), (e.amount || 0).toFixed(2), escapeCSV(e.note || '')].join(',')
    );
    downloadCSV([header, ...rows].join('\n'), 'expenses-export.csv');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display">Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">All job expenses across your business</p>
        </div>
        {uncategorized.length > 0 && (
          <ClampButton label={`Categorize ${uncategorized.length} uncategorized`} onClick={handleCategorize} loading={catLoading} />
        )}
      </div>

      <ExpensesFilters filters={filters} onChange={setFilters} jobs={jobsWithExpenses} onExport={handleExport} />

      {catSuggestions && catSuggestions.length > 0 && (
        <div className="mb-4 bg-clamp-soft/30 border border-clamp-border/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-clamp">Suggested Categories</span>
            <button type="button" onClick={() => setCatSuggestions(null)} className="text-xs text-slate-400 hover:text-slate-200">Dismiss</button>
          </div>
          <div className="space-y-2">
            {catSuggestions.map((s, i) => (
              <div key={s._key || i} className="flex items-center justify-between text-sm bg-midnight/40 rounded-lg px-3 py-2">
                <span className="text-slate-200">{s.title || 'Expense'}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-clamp-soft text-clamp border border-clamp-border">
                  {EXPENSE_CATEGORIES.find((c) => c.key === s.suggestedCategory)?.label || s.suggestedCategory}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">To apply categories, edit expenses on individual job pages.</p>
        </div>
      )}

      <ExpensesSummaryCards expenses={filtered} />
      <ExpensesTable expenses={filtered} />
    </div>
  );
}
