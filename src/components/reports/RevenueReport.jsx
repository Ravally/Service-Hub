import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_CHART_COLORS } from '../../constants';
import ReportCard from './ReportCard';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-midnight border border-slate-700/30 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-300 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function RevenueReport({ data }) {
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ReportCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          change={data.revenueChange}
          subtitle="vs previous period"
        />
        <ReportCard
          title="Invoices Paid"
          value={data.totalCount}
          subtitle="in this period"
        />
        <ReportCard
          title="Avg per Invoice"
          value={formatCurrency(data.totalCount > 0 ? data.totalRevenue / data.totalCount : 0)}
          subtitle="average invoice value"
        />
      </div>

      {data.monthly.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5">
          <p className="text-sm font-semibold text-slate-200 mb-4">Revenue by Month</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="revenue" name="Revenue" fill={REPORT_CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
