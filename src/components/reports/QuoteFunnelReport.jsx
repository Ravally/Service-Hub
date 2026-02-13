import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_CHART_COLORS } from '../../constants';
import ReportCard from './ReportCard';

const STATUS_CHART_COLORS = {
  Draft: REPORT_CHART_COLORS.muted,
  Sent: REPORT_CHART_COLORS.secondary,
  Approved: REPORT_CHART_COLORS.success,
  Declined: REPORT_CHART_COLORS.danger,
  Archived: '#475569',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-midnight border border-slate-700/30 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-300">{d.status}</p>
      <p className="text-xs text-slate-400">Count: {d.count}</p>
      <p className="text-xs text-slate-400">Value: {formatCurrency(d.value)}</p>
    </div>
  );
};

export default function QuoteFunnelReport({ data }) {
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ReportCard title="Total Quotes" value={data.totalCount} subtitle="in this period" />
        <ReportCard title="Conversion Rate" value={`${data.conversionRate}%`} subtitle="approved / (approved + declined)" />
        <ReportCard title="Total Value" value={formatCurrency(data.totalValue)} subtitle="across all quotes" />
      </div>

      {data.byStatus.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5 mb-4">
          <p className="text-sm font-semibold text-slate-200 mb-4">Quotes by Status</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStatus} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis dataKey="status" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                  {data.byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] || REPORT_CHART_COLORS.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.byStatus.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Count</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.byStatus.map((s) => (
                <tr key={s.status} className="border-b border-slate-700/20 last:border-0">
                  <td className="px-4 py-2.5 text-slate-200">{s.status}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{s.count}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(s.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
