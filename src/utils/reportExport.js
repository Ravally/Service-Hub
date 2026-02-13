/**
 * Report CSV export utilities
 * Uses the downloadCSV pattern from payrollExport.js
 */
import { downloadCSV } from './payrollExport';
import { formatCurrency } from './formatters';

function escapeCSV(field) {
  if (field == null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers, rows) {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
  return `${headerRow}\n${dataRows}`;
}

/**
 * Export revenue report as CSV
 */
export function exportRevenueCSV(data) {
  const headers = ['Month', 'Revenue', 'Invoice Count'];
  const rows = (data.monthly || []).map((m) => [
    m.label,
    formatCurrency(m.revenue),
    m.count,
  ]);
  rows.push(['', '', '']);
  rows.push(['Total', formatCurrency(data.totalRevenue), data.totalCount]);
  downloadCSV(toCSV(headers, rows), 'revenue-report.csv');
}

/**
 * Export quote funnel report as CSV
 */
export function exportQuoteFunnelCSV(data) {
  const headers = ['Status', 'Count', 'Value'];
  const rows = (data.byStatus || []).map((s) => [
    s.status,
    s.count,
    formatCurrency(s.value),
  ]);
  rows.push(['', '', '']);
  rows.push(['Total', data.totalCount, formatCurrency(data.totalValue)]);
  rows.push(['Conversion Rate', `${data.conversionRate}%`, '']);
  downloadCSV(toCSV(headers, rows), 'quotes-report.csv');
}

/**
 * Export jobs report as CSV
 */
export function exportJobsCSV(data) {
  const headers = ['Month', 'Completed Jobs', 'Revenue'];
  const rows = (data.monthly || []).map((m) => [
    m.label,
    m.completed,
    formatCurrency(m.revenue),
  ]);
  rows.push(['', '', '']);
  rows.push(['Total', data.totalCompleted, formatCurrency(data.totalRevenue)]);
  rows.push(['Avg Completion (days)', data.avgCompletionDays, '']);
  downloadCSV(toCSV(headers, rows), 'jobs-report.csv');
}

/**
 * Export invoice aging report as CSV
 */
export function exportAgingCSV(data) {
  const headers = ['Bucket', 'Count', 'Amount', '% of Total'];
  const rows = (data.buckets || []).map((b) => [
    b.label,
    b.count,
    formatCurrency(b.amount),
    `${b.pct}%`,
  ]);
  rows.push(['', '', '', '']);
  rows.push(['Total Outstanding', data.totalCount, formatCurrency(data.totalOutstanding), '100%']);
  downloadCSV(toCSV(headers, rows), 'invoice-aging-report.csv');
}

/**
 * Export top clients report as CSV
 */
export function exportTopClientsCSV(data) {
  const headers = ['Rank', 'Client', 'Jobs', 'Revenue', 'Avg Job Value'];
  const rows = (data.topClients || []).map((c, i) => [
    i + 1,
    c.name,
    c.jobCount,
    formatCurrency(c.revenue),
    formatCurrency(c.avgJobValue),
  ]);
  downloadCSV(toCSV(headers, rows), 'top-clients-report.csv');
}

/**
 * Export profitability report as CSV
 */
export function exportProfitabilityCSV(data) {
  const headers = ['Job', 'Client', 'Revenue', 'Costs', 'Profit', 'Margin %'];
  const rows = (data.jobTable || []).map((j) => [
    j.title,
    j.clientName,
    formatCurrency(j.revenue),
    formatCurrency(j.totalCosts),
    formatCurrency(j.profit),
    `${j.margin.toFixed(1)}%`,
  ]);
  rows.push(['', '', '', '', '', '']);
  rows.push(['Totals', '', formatCurrency(data.totalRevenue), '', formatCurrency(data.totalProfit), `${data.avgMargin}%`]);
  downloadCSV(toCSV(headers, rows), 'profitability-report.csv');
}
