import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_CHART_COLORS } from '../../constants';
import ReportCard from './ReportCard';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-midnight border border-slate-700/30 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-300">{d.name}</p>
      <p className="text-xs text-slate-400">Revenue: {formatCurrency(d.revenue)}</p>
      <p className="text-xs text-slate-400">Jobs: {d.jobCount}</p>
    </div>
  );
};

export default function TopClientsReport({ data }) {
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ReportCard title="Active Clients" value={data.activeClients} subtitle="currently active" />
        <ReportCard title="Avg Revenue per Client" value={formatCurrency(data.avgRevenuePerClient)} subtitle="across active clients" />
      </div>

      {data.topClients.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5 mb-4">
          <p className="text-sm font-semibold text-slate-200 mb-4">Top 10 Clients by Revenue</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topClients} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={75} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill={REPORT_CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.topClients.length > 0 && (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Client</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Jobs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Avg Job</th>
              </tr>
            </thead>
            <tbody>
              {data.topClients.map((c, i) => (
                <tr key={c.id} className="border-b border-slate-700/20 last:border-0">
                  <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-slate-200 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{c.jobCount}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(c.revenue)}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-right">{formatCurrency(c.avgJobValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
