import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { EXPENSE_CATEGORIES } from '../../constants';

export default function ExpensesSummaryCards({ expenses }) {
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const byCategory = EXPENSE_CATEGORIES.map((cat) => {
    const catExpenses = expenses.filter((e) => (e.category || 'other') === cat.key);
    return { ...cat, total: catExpenses.reduce((s, e) => s + (e.amount || 0), 0), count: catExpenses.length };
  }).filter((c) => c.count > 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4">
        <p className="text-xs font-medium text-slate-500 mb-1">Total Expenses</p>
        <p className="text-2xl font-bold text-slate-100 font-display">{formatCurrency(total)}</p>
        <p className="text-xs text-slate-500 mt-1">{expenses.length} entries</p>
      </div>
      {byCategory.map((cat) => (
        <div key={cat.key} className="bg-charcoal rounded-xl border border-slate-700/30 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">{cat.label}</p>
          <p className="text-lg font-bold text-slate-100 font-display">{formatCurrency(cat.total)}</p>
          <p className="text-xs text-slate-500 mt-1">{cat.count} entries</p>
        </div>
      ))}
    </div>
  );
}
