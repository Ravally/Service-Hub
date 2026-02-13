// src/components/ClientsList.jsx
import React, { useMemo, useState } from 'react';
import { STATUS_COLORS } from '../constants/statusConstants';
import { inRange } from '../utils/dateUtils';
import { computeClientSegments, SEGMENT_DEFINITIONS, getSegmentDef } from '../utils';
import { useBulkSelection } from '../hooks/ui';
import KpiCard from './common/KpiCard';
import BulkActionBar from './common/BulkActionBar';
import Chip from './common/Chip';
import Pill from './common/Pill';
import TagPicker from './clients/TagPicker';

const StatusPill = ({ label }) => {
  const cls = STATUS_COLORS[label] || 'bg-slate-700/30 text-slate-100';
  return <Pill className={cls}>{label}</Pill>;
};

// Helper formatters
const withinDays = (date, days) => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const back = new Date(now);
  back.setDate(now.getDate() - days);
  return inRange(date, back, now);
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
  onBulkArchiveClients,
  onBulkDeleteClients,
  onBulkTagClients,
}) {
  // Local state for filters/search/sort
  const [search, setSearch] = useState('');
  const [tagPopover, setTagPopover] = useState(false);
  const [statusPopover, setStatusPopover] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]); // array of tag strings
  const [tagSearch, setTagSearch] = useState('');
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [segmentPopover, setSegmentPopover] = useState(false);
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

  const clientSegments = useMemo(() => computeClientSegments(clients, jobs, invoices), [clients, jobs, invoices]);

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

    const created = augmented.filter(c => !!c.createdAt);
    const leads = created.filter(c => c._status === 'Lead');

    const newLeads30 = leads.filter(c => withinDays(c.createdAt, 30)).length;
    const newClients30 = created.filter(c => withinDays(c.createdAt, 30) && c._status !== 'Lead').length;
    const ytdNew = created.filter(c => new Date(c.createdAt) >= startYtd).length;

    const prevLeads = leads.filter(c => inRange(c.createdAt, prev30Start, prev30End)).length || 0;
    const prevClients = created.filter(c => c._status !== 'Lead' && inRange(c.createdAt, prev30Start, prev30End)).length || 0;

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
      const segOk = selectedSegments.length === 0 || (clientSegments.get(c.id) || []).some(s => selectedSegments.includes(s));
      return base && tagOk && statusOk && segOk;
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
  }, [augmented, search, selectedTags, selectedSegments, clientSegments, statusMode, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const { selected, allChecked, toggleAll, toggleOne, clearSelection } = useBulkSelection(filtered);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const bulkActions = [
    { label: 'Add Tag', onClick: () => setShowTagPicker(true) },
    { label: 'Archive', onClick: () => { onBulkArchiveClients?.(Array.from(selected)); clearSelection(); } },
    { label: 'Delete', onClick: () => { onBulkDeleteClients?.(Array.from(selected)); clearSelection(); }, variant: 'danger' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold font-display text-slate-100">Clients</h2>
        <div className="flex items-center gap-2">
          <button onClick={onNewClientClick} className="px-4 py-2 rounded-md bg-scaffld-teal text-white font-semibold hover:bg-scaffld-teal-deep transition-colors">New Client</button>
          <button className="px-3 py-2 rounded-md bg-charcoal text-slate-300 border border-slate-700 hover:bg-slate-dark transition-colors">More Actions</button>
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
              <div className="absolute z-10 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                <input
                  value={tagSearch}
                  onChange={(e)=>setTagSearch(e.target.value)}
                  placeholder="Search tags"
                  className="w-full px-2 py-1 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 rounded mb-2 text-sm focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20"
                />
                <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
                  <span>Select tags</span>
                  <button
                    onClick={() => {
                      const visible = allTags.filter(t => t.toLowerCase().includes(tagSearch.trim().toLowerCase()));
                      setSelectedTags(visible);
                    }}
                    className="text-scaffld-teal font-semibold"
                  >Select all</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {allTags.filter(t => t.toLowerCase().includes(tagSearch.trim().toLowerCase())).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])}
                      className={`w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-dark ${selectedTags.includes(t) ? 'bg-slate-dark' : ''}`}
                    >
                      <span className="inline-block mr-2 align-middle" style={{width:12}}>{selectedTags.includes(t) ? '✓' : ''}</span>
                      {t} <span className="text-slate-400">({tagCounts.get(t) || 0})</span>
                    </button>
                  ))}
                  {allTags.length === 0 && <div className="text-xs text-slate-400 p-2">No tags</div>}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <Chip onClick={() => { setStatusPopover((s) => !s); setTagPopover(false); }}>Status | {statusMode === 'all' ? 'All' : statusMode === 'la' ? 'Leads and Active' : statusMode === 'lead' ? 'Leads' : statusMode === 'active' ? 'Active' : 'Archived'}</Chip>
            {statusPopover && (
              <div className="absolute z-10 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                <input placeholder="Search status" className="w-full px-2 py-1 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 rounded mb-2 text-sm focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20" />
                {[
                  { key: 'all', label: 'All' },
                  { key: 'la', label: 'Leads and Active' },
                  { key: 'lead', label: 'Leads' },
                  { key: 'active', label: 'Active' },
                  { key: 'archived', label: 'Archived' },
                ].map(opt => (
                  <button key={opt.key} type="button" onClick={() => { setStatusMode(opt.key); setStatusPopover(false); }} className={`w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-dark ${statusMode === opt.key ? 'bg-slate-dark' : ''}`}>
                    <span className="inline-block mr-2 align-middle" style={{width:12}}>{statusMode === opt.key ? '✓' : ''}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <Chip onClick={() => { setSegmentPopover((s) => !s); setTagPopover(false); setStatusPopover(false); }}>
              Segments{selectedSegments.length > 0 ? ` (${selectedSegments.length})` : ' +'}
            </Chip>
            {segmentPopover && (
              <div className="absolute z-10 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                {SEGMENT_DEFINITIONS.map(seg => (
                  <button
                    key={seg.key} type="button"
                    onClick={() => setSelectedSegments(prev => prev.includes(seg.key) ? prev.filter(s => s !== seg.key) : [...prev, seg.key])}
                    className={`w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-dark ${selectedSegments.includes(seg.key) ? 'bg-slate-dark' : ''}`}
                  >
                    <span className="inline-block mr-2 align-middle" style={{width:12}}>{selectedSegments.includes(seg.key) ? '✓' : ''}</span>
                    {seg.label} <span className="text-slate-500 text-xs ml-1">{seg.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {(selectedTags.length > 0 || statusMode !== 'all' || selectedSegments.length > 0) && (
            <Chip onClick={() => { setSelectedTags([]); setStatusMode('all'); setSelectedSegments([]); }} className="bg-midnight border-slate-700/30">Clear</Chip>
          )}
        </div>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filtered clients..."
            className="px-3 py-2 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 rounded-md text-sm w-64 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20"
          />
        </div>
      </div>

      <div className="text-sm text-slate-400 mb-3">All clients ({filtered.length} results)</div>

      <BulkActionBar selectedCount={selected.size} onDeselectAll={clearSelection} actions={bulkActions} />
      {showTagPicker && (
        <div className="mb-3">
          <TagPicker
            allTags={allTags}
            onSelect={(tag) => { onBulkTagClients?.(Array.from(selected), tag); clearSelection(); setShowTagPicker(false); }}
            onClose={() => setShowTagPicker(false)}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden min-h-[calc(100vh-26rem)]">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-slate-400">No matching clients.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-midnight text-sm border-b border-slate-700">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-scaffld-teal" /></th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors" onClick={() => toggleSort('name')}>
                  <span className="inline-flex items-center gap-1">Name{sortBy==='name' && (sortDir==='asc' ? ' ▲' : ' ▼')}</span>
                </th>
                <th className="text-left font-semibold text-slate-300 p-3">Address</th>
                <th className="text-left font-semibold text-slate-300 p-3">Tags</th>
                <th className="text-left font-semibold text-slate-300 p-3">Status</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors" onClick={() => toggleSort('last')}>
                  <span className="inline-flex items-center gap-1">Last{sortBy==='last' && (sortDir==='asc' ? ' ▲' : ' ▼')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-700/30 hover:bg-slate-dark/50 transition-colors">
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="accent-scaffld-teal" /></td>
                  <td className="p-3">
                    <button className="font-semibold text-scaffld-teal hover:underline" onClick={() => onSelectClient && onSelectClient(c)}>{c.name}</button>
                    {c.company && <div className="text-xs text-slate-400">{c.company}</div>}
                  </td>
                  <td className="p-3 text-slate-100">
                    {(c.address || '').length > 0 ? (
                      <div className="truncate max-w-xs">{c.address}</div>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).slice(0,1).map((t, i) => (
                        <span key={`${t}-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-dark text-slate-100 border border-slate-700/30">{t}</span>
                      ))}
                      {(c.tags || []).length > 1 && (
                        <span className="text-xs text-slate-400">+{(c.tags || []).length - 1}</span>
                      )}
                      {(clientSegments.get(c.id) || []).map(segKey => {
                        const def = getSegmentDef(segKey);
                        return def ? (
                          <span key={segKey} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${def.color}`}>{def.label}</span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="p-3"><StatusPill label={c._status} /></td>
                  <td className="p-3 text-slate-100">{formatLastSeen(c._last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 0 && filtered.length < 5 && (
          <div className="bg-midnight/50 border border-slate-700/20 rounded-lg p-4 m-4 text-sm text-slate-500">
            Tip: Import clients from a CSV to get started quickly.
          </div>
        )}
      </div>
    </div>
  );
}
