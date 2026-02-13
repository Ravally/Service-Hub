import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { EXPENSE_CATEGORIES } from '../../constants';

export default function ExpensesTable({ expenses }) {
  if (!expenses.length) {
    return (
      <div className="bg-charcoal rounded-xl border border-slate-700/30 p-10 text-center">
        <p className="text-slate-400 text-sm">No expenses match your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Job</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e._key} className="border-b border-slate-700/20 last:border-0">
              <td className="px-4 py-2.5 text-slate-300">{e.date ? formatDate(e.date) : '—'}</td>
              <td className="px-4 py-2.5 text-slate-200 font-medium">{e.title || 'Expense'}</td>
              <td className="px-4 py-2.5">
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400">
                  {EXPENSE_CATEGORIES.find((c) => c.key === (e.category || 'other'))?.label || 'Other'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-300">{e.jobTitle || '—'}</td>
              <td className="px-4 py-2.5 text-slate-200 text-right font-medium">{formatCurrency(e.amount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
