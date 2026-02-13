// src/utils/clientSegments.js

export const SEGMENT_DEFINITIONS = [
  {
    key: 'high-value',
    label: 'High Value',
    color: 'bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/30',
    description: 'Lifetime revenue exceeds $5,000',
  },
  {
    key: 'vip',
    label: 'VIP',
    color: 'bg-purple-500/10 text-purple-400 border border-purple-400/20',
    description: 'Top 10% by total revenue',
  },
  {
    key: 'at-risk',
    label: 'At Risk',
    color: 'bg-harvest-amber/10 text-harvest-amber border border-harvest-amber/30',
    description: 'No job in 6–12 months',
  },
  {
    key: 'new',
    label: 'New',
    color: 'bg-blue-500/10 text-blue-400 border border-blue-400/20',
    description: 'First job within last 3 months',
  },
  {
    key: 'dormant',
    label: 'Dormant',
    color: 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30',
    description: 'No job in 12+ months',
  },
];

export function getSegmentDef(key) {
  return SEGMENT_DEFINITIONS.find(d => d.key === key) || null;
}

/**
 * Compute smart segments for all clients based on job/invoice data.
 * Returns Map<clientId, string[]> of segment keys.
 */
export function computeClientSegments(clients, jobs, invoices) {
  const now = new Date();
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
  const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setMonth(now.getMonth() - 12);

  // Build per-client job stats
  const jobStats = new Map();
  (jobs || []).forEach(j => {
    if (!j.clientId) return;
    const created = j.createdAt ? new Date(j.createdAt) : null;
    if (!created) return;
    const stat = jobStats.get(j.clientId) || { lastJobDate: null, firstJobDate: null };
    if (!stat.lastJobDate || created > stat.lastJobDate) stat.lastJobDate = created;
    if (!stat.firstJobDate || created < stat.firstJobDate) stat.firstJobDate = created;
    jobStats.set(j.clientId, stat);
  });

  // Build per-client revenue from paid invoices
  const revenueMap = new Map();
  (invoices || []).filter(inv => inv.status === 'Paid').forEach(inv => {
    if (!inv.clientId) return;
    revenueMap.set(inv.clientId, (revenueMap.get(inv.clientId) || 0) + (inv.total || 0));
  });

  // Compute VIP threshold (90th percentile)
  const revenues = [...revenueMap.values()].filter(r => r > 0).sort((a, b) => a - b);
  const vipThreshold = revenues.length > 0 ? revenues[Math.floor(revenues.length * 0.9)] : Infinity;

  // Assign segments per client
  const result = new Map();
  (clients || []).forEach(c => {
    const segs = [];
    const revenue = revenueMap.get(c.id) || 0;
    const stat = jobStats.get(c.id);

    if (revenue > 5000) segs.push('high-value');
    if (revenue >= vipThreshold && vipThreshold > 0 && vipThreshold < Infinity) segs.push('vip');
    if (stat?.firstJobDate && stat.firstJobDate > threeMonthsAgo) segs.push('new');
    if (stat?.lastJobDate) {
      if (stat.lastJobDate < twelveMonthsAgo) segs.push('dormant');
      else if (stat.lastJobDate < sixMonthsAgo) segs.push('at-risk');
    }

    if (segs.length > 0) result.set(c.id, segs);
  });

  return result;
}
