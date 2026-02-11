// src/components/ClientsList.jsx
import React, { useMemo, useState } from 'react';

const Chip = ({ children, onClick, active = false, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm border ${active ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'} ${className}`}
  >
    {children}
  </button>
);

const StatusPill = ({ label }) => {
  const map = {
    Active: 'bg-green-100 text-green-800',
    Lead: 'bg-yellow-100 text-yellow-800',
  };
  const cls = map[label] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

const KpiCard = ({ title, sub, value, deltaText, deltaPositive = true }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <div className="text-sm text-gray-600">{title}</div>
    <div className="text-xs text-gray-400 mb-2">{sub}</div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    {typeof deltaText === 'string' && (
      <div className={`inline-flex items-center mt-2 text-xs font-medium ${deltaPositive ? 'text-green-700' : 'text-red-700'}`}>
        <span className={`inline-block h-2 w-2 rounded-full mr-1 ${deltaPositive ? 'bg-green-400' : 'bg-red-400'}`} />
        {deltaText}
      </div>
    )}
  </div>
);

// Helper formatters
const withinDays = (date, days) => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const back = new Date(now);
  back.setDate(now.getDate() - days);
  return d >= back && d <= now;
};

const formatLastSeen = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  if (diff <= 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ClientsList({
  clients = [],
  quotes = [],
  jobs = [],
  invoices = [],
  onSelectClient,
  onNewClientClick,
}) {
  // Local state for filters/search/sort
  const [search, setSearch] = useState('');
  const [tagPopover, setTagPopover] = useState(false);
  const [statusPopover, setStatusPopover] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]); // array of tag strings
  const [tagSearch, setTagSearch] = useState('');
  // statusMode: 'all' | 'la' | 'lead' | 'active' | 'archived'
  const [statusMode, setStatusMode] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name | last
  const [sortDir, setSortDir] = useState('asc');

  // Derive status and last activity per client
  const augmented = useMemo(() => {
    const lastByClient = new Map();
    const consider = (arr) => {
      arr.forEach((d) => {
        if (!d || !d.clientId) return;
        const t = d.createdAt || d.updatedAt || d.paidAt || d.issueDate || d.start;
        if (!t) return;
        const prev = lastByClient.get(d.clientId);
        if (!prev || new Date(t) > new Date(prev)) lastByClient.set(d.clientId, t);
      });
    };
    consider(quotes);
    consider(jobs);
    consider(invoices);

    const hasAcceptedQuote = (cid) => (quotes || []).some(q => q.clientId === cid && (q.status === 'Approved' || q.status === 'Accepted' || q.status === 'Converted'));
    const hasWork = (cid) => (jobs || []).some(j => j.clientId === cid) || (invoices || []).some(i => i.clientId === cid);

    return (clients || []).map((c) => {
      const tags = (c.tags || []).filter(Boolean);
      let status = 'Lead';
      if (c.status === 'Archived' || c.archived === true || tags.some(t => String(t).toLowerCase() === 'archived')) status = 'Archived';
      else if (hasAcceptedQuote(c.id) || hasWork(c.id)) status = 'Active';
      const last = lastByClient.get(c.id) || c.updatedAt || c.createdAt || null;
      return { ...c, _status: status, _last: last };
    });
  }, [clients, quotes, jobs, invoices]);

  const { allTags, tagCounts } = useMemo(() => {
    const counts = new Map();
    (clients || []).forEach((c) => (c.tags || []).forEach((t) => {
      if (!t) return; const key = String(t);
      counts.set(key, (counts.get(key) || 0) + 1);
    }));
    const list = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
    return { allTags: list, tagCounts: counts };
  }, [clients]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const startYtd = new Date(now.getFullYear(), 0, 1);
    const prev30Start = new Date(now); prev30Start.setDate(now.getDate() - 60);
    const prev30End = new Date(now); prev30End.setDate(now.getDate() - 31);

    const isInRange = (d, a, b) => d && new Date(d) >= a && new Date(d) <= b;

    const created = augmented.filter(c => !!c.createdAt);
    const leads = created.filter(c => c._status === 'Lead');

    const newLeads30 = leads.filter(c => withinDays(c.createdAt, 30)).length;
    const newClients30 = created.filter(c => withinDays(c.createdAt, 30) && c._status !== 'Lead').length;
    const ytdNew = created.filter(c => new Date(c.createdAt) >= startYtd).length;

    const prevLeads = leads.filter(c => isInRange(c.createdAt, prev30Start, prev30End)).length || 0;
    const prevClients = created.filter(c => c._status !== 'Lead' && isInRange(c.createdAt, prev30Start, prev30End)).length || 0;

    const pct = (cur, prev) => {
      if (prev === 0) return { text: '—', pos: true };
      const diff = ((cur - prev) / prev) * 100;
      const sign = diff >= 0;
      return { text: `${sign ? '↑' : '↓'} ${Math.abs(Math.round(diff))}%`, pos: sign };
    };

    const leadDelta = pct(newLeads30, prevLeads);
    const clientDelta = pct(newClients30, prevClients);

    return {
      newLeads30,
      newClients30,
      ytdNew,
      leadDelta,
      clientDelta,
    };
  }, [augmented]);

  // Filtering + sorting
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const modeToStatuses = (mode) => (
      mode === 'all' ? null
        : mode === 'la' ? ['Lead','Active']
        : mode === 'lead' ? ['Lead']
        : mode === 'active' ? ['Active']
        : ['Archived']
    );
    const statusAllowed = modeToStatuses(statusMode);
    const match = (c) => {
      const base =
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.address || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.tags || []).some((t) => String(t).toLowerCase().includes(term));
      const tagOk = selectedTags.length === 0 || (c.tags || []).some((t) => selectedTags.includes(t));
      const statusOk = !statusAllowed || statusAllowed.includes(c._status);
      return base && tagOk && statusOk;
    };
    const arr = augmented.filter(match);
    const sorted = [...arr].sort((a, b) => {
      if (sortBy === 'name') {
        const va = (a.name || '').toLowerCase();
        const vb = (b.name || '').toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortBy === 'last') {
        const da = a._last ? new Date(a._last).getTime() : 0;
        const db = b._last ? new Date(b._last).getTime() : 0;
        return sortDir === 'asc' ? da - db : db - da;
      }
      return 0;
    });
    return sorted;
  }, [augmented, search, selectedTags, statusMode, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Clients</h2>
        <div className="flex items-center gap-2">
          <button onClick={onNewClientClick} className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700">New Client</button>
          <button className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-200">More Actions</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard title="New leads" sub="Past 30 days" value={kpis.newLeads30} deltaText={kpis.leadDelta.text} deltaPositive={kpis.leadDelta.pos} />
        <KpiCard title="New clients" sub="Past 30 days" value={kpis.newClients30} deltaText={kpis.clientDelta.text} deltaPositive={kpis.clientDelta.pos} />
        <KpiCard title="Total new clients" sub="Year to date" value={kpis.ytdNew} />
      </div>

      {/* Filters + Search */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Chip onClick={() => { setTagPopover((s) => !s); setStatusPopover(false); }}>Tags +</Chip>
            {tagPopover && (
              <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow p-2">
                <input
                  value={tagSearch}
                  onChange={(e)=>setTagSearch(e.target.value)}
                  placeholder="Search tags"
                  className="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm"
                />
                <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-600">
                  <span>Select tags</span>
                  <button
                    onClick={() => {
                      const visible = allTags.filter(t => t.toLowerCase().includes(tagSearch.trim().toLowerCase()));
                      setSelectedTags(visible);
                    }}
                    className="text-green-700 font-semibold"
                  >Select all</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {allTags.filter(t => t.toLowerCase().includes(tagSearch.trim().toLowerCase())).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedTags.includes(t) ? 'bg-gray-50' : ''}`}
                    >
                      <span className="inline-block mr-2 align-middle" style={{width:12}}>{selectedTags.includes(t) ? '✓' : ''}</span>
                      {t} <span className="text-gray-500">({tagCounts.get(t) || 0})</span>
                    </button>
                  ))}
                  {allTags.length === 0 && <div className="text-xs text-gray-500 p-2">No tags</div>}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <Chip onClick={() => { setStatusPopover((s) => !s); setTagPopover(false); }}>Status | {statusMode === 'all' ? 'All' : statusMode === 'la' ? 'Leads and Active' : statusMode === 'lead' ? 'Leads' : statusMode === 'active' ? 'Active' : 'Archived'}</Chip>
            {statusPopover && (
              <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow p-2">
                <input placeholder="Search status" className="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm" />
                {[
                  { key: 'all', label: 'All' },
                  { key: 'la', label: 'Leads and Active' },
                  { key: 'lead', label: 'Leads' },
                  { key: 'active', label: 'Active' },
                  { key: 'archived', label: 'Archived' },
                ].map(opt => (
                  <button key={opt.key} type="button" onClick={() => { setStatusMode(opt.key); setStatusPopover(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${statusMode === opt.key ? 'bg-gray-50' : ''}`}>
                    <span className="inline-block mr-2 align-middle" style={{width:12}}>{statusMode === opt.key ? '✓' : ''}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(selectedTags.length > 0 || statusMode !== 'all') && (
            <Chip onClick={() => { setSelectedTags([]); setStatusMode('all'); }} className="bg-gray-100 border-gray-200">Clear</Chip>
          )}
        </div>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filtered clients..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
          />
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">All clients ({filtered.length} results)</div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-gray-500">No matching clients.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-sm">
              <tr>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <span className="inline-flex items-center gap-1">Name{sortBy==='name' && (sortDir==='asc' ? ' ▲' : ' ▼')}</span>
                </th>
                <th className="text-left font-semibold p-3">Address</th>
                <th className="text-left font-semibold p-3">Tags</th>
                <th className="text-left font-semibold p-3">Status</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={() => toggleSort('last')}>
                  <span className="inline-flex items-center gap-1">Last{sortBy==='last' && (sortDir==='asc' ? ' ▲' : ' ▼')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <button className="font-semibold text-blue-700 hover:underline" onClick={() => onSelectClient && onSelectClient(c)}>{c.name}</button>
                    {c.company && <div className="text-xs text-gray-500">{c.company}</div>}
                  </td>
                  <td className="p-3 text-gray-700">
                    {(c.address || '').length > 0 ? (
                      <div className="truncate max-w-xs">{c.address}</div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).slice(0,1).map((t, i) => (
                        <span key={`${t}-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{t}</span>
                      ))}
                      {(c.tags || []).length > 1 && (
                        <span className="text-xs text-gray-500">+{(c.tags || []).length - 1}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3"><StatusPill label={c._status} /></td>
                  <td className="p-3 text-gray-700">{formatLastSeen(c._last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
