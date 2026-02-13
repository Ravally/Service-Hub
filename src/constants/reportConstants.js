/**
 * Report & analytics constants
 */

export const REPORT_CHART_COLORS = {
  primary: '#0EA5A0',    // scaffld-teal
  secondary: '#FFAA5C',  // harvest-amber
  danger: '#F7845E',     // signal-coral
  muted: '#64748b',      // slate-500
  success: '#22c55e',    // green-500
};

export const REPORT_PERIOD_OPTIONS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_12', label: 'Last 12 Months' },
  { key: 'custom', label: 'Custom' },
];

export const REPORT_TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'aging', label: 'Invoice Aging' },
  { key: 'clients', label: 'Top Clients' },
  { key: 'profitability', label: 'Profitability' },
];

export const AGING_BUCKETS = [
  { key: 'current', label: 'Current', min: -Infinity, max: 0 },
  { key: '1-30', label: '1–30 days', min: 1, max: 30 },
  { key: '31-60', label: '31–60 days', min: 31, max: 60 },
  { key: '61-90', label: '61–90 days', min: 61, max: 90 },
  { key: '90+', label: '90+ days', min: 91, max: Infinity },
];
