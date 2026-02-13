import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
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
          {entry.name}: {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function JobsReport({ data }) {
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ReportCard title="Completed Jobs" value={data.totalCompleted} subtitle="in this period" />
        <ReportCard title="Revenue" value={formatCurrency(data.totalRevenue)} subtitle="from completed jobs" />
        <ReportCard title="Avg Completion" value={`${data.avgCompletionDays} days`} subtitle="average turnaround" />
      </div>

      {data.monthly.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5">
            <p className="text-sm font-semibold text-slate-200 mb-4">Completed Jobs by Month</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="completed" name="Completed"
                    stroke={REPORT_CHART_COLORS.primary} strokeWidth={2}
                    dot={{ r: 4, fill: REPORT_CHART_COLORS.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5">
            <p className="text-sm font-semibold text-slate-200 mb-4">Job Revenue by Month</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill={REPORT_CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
