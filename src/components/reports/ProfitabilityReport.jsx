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
          {entry.name}: {entry.dataKey === 'margin' ? `${entry.value}%` : formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function ProfitabilityReport({ data }) {
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ReportCard title="Avg Margin" value={`${data.avgMargin}%`} subtitle="across completed jobs" />
        <ReportCard title="Total Profit" value={formatCurrency(data.totalProfit)} subtitle="in this period" />
        {data.bestJob && (
          <ReportCard title="Best Margin" value={`${data.bestJob.margin.toFixed(1)}%`} subtitle={data.bestJob.title} />
        )}
        {data.worstJob && (
          <ReportCard title="Lowest Margin" value={`${data.worstJob.margin.toFixed(1)}%`} subtitle={data.worstJob.title} />
        )}
      </div>

      {data.monthly.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5 mb-4">
          <p className="text-sm font-semibold text-slate-200 mb-4">Profit Margin by Month</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar yAxisId="left" dataKey="profit" name="Profit" fill={REPORT_CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="margin" name="Margin %" fill={REPORT_CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.jobTable.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Job</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Client</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Costs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Profit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.jobTable.map((j) => (
                <tr key={j.id} className="border-b border-slate-700/20 last:border-0">
                  <td className="px-4 py-2.5 text-slate-200 font-medium">{j.title}</td>
                  <td className="px-4 py-2.5 text-slate-300">{j.clientName}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(j.revenue)}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(j.totalCosts)}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(j.profit)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-medium ${j.margin >= 0 ? 'text-green-500' : 'text-signal-coral'}`}>
                      {j.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
