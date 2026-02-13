import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_CHART_COLORS } from '../../constants';
import ReportCard from './ReportCard';

const BUCKET_COLORS = [
  REPORT_CHART_COLORS.success,
  REPORT_CHART_COLORS.primary,
  REPORT_CHART_COLORS.secondary,
  REPORT_CHART_COLORS.danger,
  '#dc2626', // red-600 for 90+
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-midnight border border-slate-700/30 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-300">{d.label}</p>
      <p className="text-xs text-slate-400">{d.count} invoice{d.count !== 1 ? 's' : ''}</p>
      <p className="text-xs text-slate-400">{formatCurrency(d.amount)}</p>
    </div>
  );
};

export default function InvoiceAgingReport({ data }) {
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ReportCard title="Total Outstanding" value={formatCurrency(data.totalOutstanding)} subtitle={`${data.totalCount} unpaid invoices`} />
        <ReportCard title="Overdue Amount" value={formatCurrency(data.overdueAmount)} subtitle="past due date" />
        <ReportCard title="Avg Days Outstanding" value={data.avgDaysOutstanding} subtitle="average across unpaid" />
      </div>

      {data.buckets.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5 mb-4">
          <p className="text-sm font-semibold text-slate-200 mb-4">Aging Breakdown</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.buckets} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {data.buckets.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i] || REPORT_CHART_COLORS.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.buckets.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Bucket</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Invoices</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data.buckets.map((b) => (
                <tr key={b.key} className="border-b border-slate-700/20 last:border-0">
                  <td className="px-4 py-2.5 text-slate-200">{b.label}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{b.count}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(b.amount)}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{b.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
