import { useMemo } from 'react';
import { periodRange, getPreviousRange, inRange, daysBetween } from '../../utils/dateUtils';
import { calculateInvoiceBalance, calculateJobProfitability, computeJobTotalValue } from '../../utils/calculations';
import { AGING_BUCKETS } from '../../constants';

/**
 * Resolve date range for report period, including custom quarter/last12 logic.
 */
function resolveRange(period, customRange) {
  if (period === 'this_quarter') {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'last_12') {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return { start, end: now };
  }
  return periodRange(period, customRange);
}

/**
 * Get month key (YYYY-MM) from a date
 */
function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get month label from a key (YYYY-MM -> "Jan 2025")
 */
function monthLabel(key) {
  const [y, m] = key.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * Generate all month keys between two dates
 */
function monthKeysBetween(start, end) {
  if (!start || !end) return [];
  const keys = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    keys.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
}

/**
 * Compute percentage change between two values
 */
function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Compute revenue report data
 */
function computeRevenue(invoices, dateRange, prevRange) {
  const paid = invoices.filter((inv) => inv.status === 'Paid' && inv.paidAt);
  const inPeriod = paid.filter((inv) => inRange(inv.paidAt, dateRange.start, dateRange.end));
  const inPrev = paid.filter((inv) => inRange(inv.paidAt, prevRange.start, prevRange.end));

  const totalRevenue = inPeriod.reduce((s, inv) => s + (inv.total || 0), 0);
  const prevRevenue = inPrev.reduce((s, inv) => s + (inv.total || 0), 0);

  const keys = monthKeysBetween(dateRange.start, dateRange.end);
  const byMonth = {};
  keys.forEach((k) => { byMonth[k] = { revenue: 0, count: 0 }; });

  inPeriod.forEach((inv) => {
    const k = monthKey(inv.paidAt);
    if (byMonth[k]) {
      byMonth[k].revenue += inv.total || 0;
      byMonth[k].count += 1;
    }
  });

  const monthly = keys.map((k) => ({
    key: k,
    label: monthLabel(k),
    revenue: byMonth[k].revenue,
    count: byMonth[k].count,
  }));

  return {
    totalRevenue,
    prevRevenue,
    revenueChange: pctChange(totalRevenue, prevRevenue),
    totalCount: inPeriod.length,
    monthly,
  };
}

/**
 * Compute quote funnel data
 */
function computeQuoteFunnel(quotes, dateRange) {
  const inPeriod = quotes.filter((q) => inRange(q.createdAt, dateRange.start, dateRange.end));

  const statusOrder = ['Draft', 'Sent', 'Approved', 'Declined', 'Archived'];
  const counts = {};
  statusOrder.forEach((s) => { counts[s] = { count: 0, value: 0 }; });

  inPeriod.forEach((q) => {
    const s = q.status || 'Draft';
    if (!counts[s]) counts[s] = { count: 0, value: 0 };
    counts[s].count += 1;
    counts[s].value += q.total || 0;
  });

  const byStatus = statusOrder
    .filter((s) => counts[s].count > 0)
    .map((s) => ({ status: s, count: counts[s].count, value: counts[s].value }));

  const totalCount = inPeriod.length;
  const totalValue = inPeriod.reduce((s, q) => s + (q.total || 0), 0);
  const approvedCount = counts['Approved']?.count || 0;
  const sentAndDecided = (counts['Approved']?.count || 0) + (counts['Declined']?.count || 0);
  const conversionRate = sentAndDecided > 0 ? Math.round((approvedCount / sentAndDecided) * 100) : 0;

  return { byStatus, totalCount, totalValue, conversionRate, approvedCount };
}

/**
 * Compute job metrics
 */
function computeJobMetrics(jobs, dateRange) {
  const completed = jobs.filter(
    (j) => j.status === 'Completed' && j.completedAt && inRange(j.completedAt, dateRange.start, dateRange.end),
  );

  const keys = monthKeysBetween(dateRange.start, dateRange.end);
  const byMonth = {};
  keys.forEach((k) => { byMonth[k] = { completed: 0, revenue: 0 }; });

  completed.forEach((j) => {
    const k = monthKey(j.completedAt);
    if (byMonth[k]) {
      byMonth[k].completed += 1;
      byMonth[k].revenue += j.totalValue || 0;
    }
  });

  const monthly = keys.map((k) => ({
    key: k,
    label: monthLabel(k),
    completed: byMonth[k].completed,
    revenue: byMonth[k].revenue,
  }));

  const totalCompleted = completed.length;
  const totalRevenue = completed.reduce((s, j) => s + (j.totalValue || 0), 0);

  const durations = completed
    .filter((j) => j.start && j.completedAt)
    .map((j) => daysBetween(j.start, j.completedAt));
  const avgCompletionDays = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return { monthly, totalCompleted, totalRevenue, avgCompletionDays };
}

/**
 * Compute invoice aging (point-in-time, not period-dependent)
 */
function computeAging(invoices) {
  const unpaid = invoices.filter((inv) =>
    ['Sent', 'Unpaid', 'Partially Paid'].includes(inv.status),
  );

  const now = new Date();
  const bucketData = AGING_BUCKETS.map((b) => ({ ...b, count: 0, amount: 0 }));

  unpaid.forEach((inv) => {
    const balance = calculateInvoiceBalance(inv);
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
    const daysOver = dueDate ? daysBetween(dueDate, now) : 0;

    for (const bucket of bucketData) {
      if (daysOver >= bucket.min && daysOver <= bucket.max) {
        bucket.count += 1;
        bucket.amount += balance;
        break;
      }
    }
  });

  const totalOutstanding = bucketData.reduce((s, b) => s + b.amount, 0);
  const totalCount = bucketData.reduce((s, b) => s + b.count, 0);

  const buckets = bucketData.map((b) => ({
    key: b.key,
    label: b.label,
    count: b.count,
    amount: b.amount,
    pct: totalOutstanding > 0 ? Math.round((b.amount / totalOutstanding) * 100) : 0,
  }));

  const overdueAmount = bucketData
    .filter((b) => b.min > 0)
    .reduce((s, b) => s + b.amount, 0);

  const avgDaysOutstanding = unpaid.length > 0
    ? Math.round(
        unpaid.reduce((s, inv) => {
          const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.createdAt || now);
          return s + Math.max(0, daysBetween(due, now));
        }, 0) / unpaid.length,
      )
    : 0;

  return { buckets, totalOutstanding, totalCount, overdueAmount, avgDaysOutstanding };
}

/**
 * Compute top clients by revenue
 */
function computeTopClients(clients, invoices, dateRange) {
  const paid = invoices.filter(
    (inv) => inv.status === 'Paid' && inv.paidAt && inRange(inv.paidAt, dateRange.start, dateRange.end),
  );

  const byClient = {};
  paid.forEach((inv) => {
    const cid = inv.clientId;
    if (!cid) return;
    if (!byClient[cid]) byClient[cid] = { revenue: 0, jobCount: 0 };
    byClient[cid].revenue += inv.total || 0;
    byClient[cid].jobCount += 1;
  });

  const activeClients = clients.filter((c) => c.status === 'Active').length;
  const totalRevenue = Object.values(byClient).reduce((s, c) => s + c.revenue, 0);
  const avgRevenuePerClient = activeClients > 0 ? totalRevenue / activeClients : 0;

  const topClients = Object.entries(byClient)
    .map(([cid, data]) => {
      const client = clients.find((c) => c.id === cid);
      return {
        id: cid,
        name: client?.name || 'Unknown',
        revenue: data.revenue,
        jobCount: data.jobCount,
        avgJobValue: data.jobCount > 0 ? data.revenue / data.jobCount : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return { topClients, activeClients, avgRevenuePerClient };
}

/**
 * Compute profitability data across jobs
 */
function computeProfitability(jobs, clients, dateRange) {
  const completed = jobs.filter(
    (j) => j.status === 'Completed' && j.completedAt && inRange(j.completedAt, dateRange.start, dateRange.end),
  );

  const clientMap = {};
  clients.forEach((c) => { clientMap[c.id] = c.name || c.companyName || 'Unknown'; });

  const jobTable = completed.map((j) => {
    const p = calculateJobProfitability({
      ...j, totalValue: parseFloat(j.totalValue || 0) || computeJobTotalValue(j),
    });
    return {
      id: j.id, title: j.title || j.jobNumber || '', clientName: clientMap[j.clientId] || '',
      revenue: p.revenue, totalCosts: p.totalCosts, profit: p.profit, margin: p.margin,
    };
  });

  const totalRevenue = jobTable.reduce((s, j) => s + j.revenue, 0);
  const totalProfit = jobTable.reduce((s, j) => s + j.profit, 0);
  const avgMargin = jobTable.length > 0
    ? Math.round(jobTable.reduce((s, j) => s + j.margin, 0) / jobTable.length)
    : 0;

  const sorted = [...jobTable].sort((a, b) => b.margin - a.margin);
  const bestJob = sorted[0] || null;
  const worstJob = sorted[sorted.length - 1] || null;

  const keys = monthKeysBetween(dateRange.start, dateRange.end);
  const byMonth = {};
  keys.forEach((k) => { byMonth[k] = { revenue: 0, profit: 0 }; });

  completed.forEach((j) => {
    const k = monthKey(j.completedAt);
    if (byMonth[k]) {
      const p = calculateJobProfitability({
        ...j, totalValue: parseFloat(j.totalValue || 0) || computeJobTotalValue(j),
      });
      byMonth[k].revenue += p.revenue;
      byMonth[k].profit += p.profit;
    }
  });

  const monthly = keys.map((k) => ({
    key: k, label: monthLabel(k),
    revenue: byMonth[k].revenue, profit: byMonth[k].profit,
    margin: byMonth[k].revenue > 0 ? Math.round((byMonth[k].profit / byMonth[k].revenue) * 100) : 0,
  }));

  return { avgMargin, totalProfit, totalRevenue, bestJob, worstJob, monthly, jobTable };
}

/**
 * Main report data hook
 */
export function useReportData({ jobs, invoices, quotes, clients, period, customRange }) {
  const dateRange = useMemo(() => resolveRange(period, customRange), [period, customRange]);
  const prevRange = useMemo(
    () => dateRange.start && dateRange.end ? getPreviousRange(dateRange.start, dateRange.end) : { start: null, end: null },
    [dateRange],
  );

  const revenue = useMemo(() => computeRevenue(invoices, dateRange, prevRange), [invoices, dateRange, prevRange]);
  const quoteFunnel = useMemo(() => computeQuoteFunnel(quotes, dateRange), [quotes, dateRange]);
  const jobMetrics = useMemo(() => computeJobMetrics(jobs, dateRange), [jobs, dateRange]);
  const aging = useMemo(() => computeAging(invoices), [invoices]);
  const topClients = useMemo(() => computeTopClients(clients, invoices, dateRange), [clients, invoices, dateRange]);
  const profitability = useMemo(() => computeProfitability(jobs, clients, dateRange), [jobs, clients, dateRange]);

  return { dateRange, revenue, quoteFunnel, jobMetrics, aging, topClients, profitability };
}
