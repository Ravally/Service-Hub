import React, { useMemo, useState } from 'react';
import { useAppState } from '../contexts';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EXPENSE_CATEGORIES } from '../constants';
import { downloadCSV } from '../utils/payrollExport';
import ExpensesSummaryCards from './expenses/ExpensesSummaryCards';
import ExpensesFilters from './expenses/ExpensesFilters';
import ExpensesTable from './expenses/ExpensesTable';

function escapeCSV(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExpensesPage() {
  const { jobs = [], clients = [] } = useAppState();
  const [filters, setFilters] = useState({ from: '', to: '', category: '', jobId: '' });

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100 font-display">Expenses</h1>
        <p className="text-sm text-slate-400 mt-1">All job expenses across your business</p>
      </div>

      <ExpensesFilters filters={filters} onChange={setFilters} jobs={jobsWithExpenses} onExport={handleExport} />
      <ExpensesSummaryCards expenses={filtered} />
      <ExpensesTable expenses={filtered} />
    </div>
  );
}
