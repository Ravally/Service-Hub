// src/components/QuotesList.jsx
import React, { useMemo, useState } from 'react';
import { STATUS_COLORS } from '../constants/statusConstants';
import { formatCurrency } from '../utils';
import { periodRange, getPreviousRange, rangeLabel } from '../utils/dateUtils';

const Pill = ({ className = '', children }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
);

const Menu = ({ open, onClose, children }) => (
  open ? (
    <div className="absolute right-0 mt-2 w-44 bg-charcoal border border-slate-700/30 rounded-md shadow z-50" onClick={(e)=>e.stopPropagation()}>
      <div className="py-1 text-sm text-slate-100">
        {children}
      </div>
    </div>
  ) : null
);

// Local status color overrides for backward compatibility
const LOCAL_STATUS_COLORS = {
  'Awaiting Response': 'bg-yellow-100 text-yellow-800',
  'Changes Requested': 'bg-amber-100 text-amber-800',
  Converted: 'bg-blue-100 text-blue-800',
};

// Merge centralized colors with local overrides
const MERGED_STATUS_COLORS = { ...STATUS_COLORS, ...LOCAL_STATUS_COLORS };

const KpiCard = ({ title, sub, value, money, delta, positive }) => (
  <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
    <div className="text-sm font-semibold text-gray-800">{title}</div>
    <div className="text-xs text-slate-400 mb-2">{sub}</div>
    <div className="text-3xl font-bold text-slate-100">{value}</div>
    {typeof money === 'string' && <div className="text-xs text-slate-400">{money}</div>}
    {typeof delta === 'string' && (
      <div className={`inline-flex items-center mt-2 text-xs font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}>
        <span className={`inline-block h-2 w-2 rounded-full mr-1 ${positive ? 'bg-green-400' : 'bg-red-400'}`} />
        {delta}
      </div>
    )}
  </div>
);

function toDisplayStatus(q) {
  if (q.archived || q.status === 'Archived') return 'Archived';
  if (q.status === 'Converted') return 'Converted';
  if (q.status === 'Changes Requested' || q.approvalStatus === 'declined') return 'Changes Requested';
  if (q.status === 'Approved' || q.status === 'Accepted') return 'Approved';
  if (q.status === 'Awaiting Response' || q.status === 'Sent') return 'Awaiting Response';
  return 'Draft';
}

// Removed local currency function - now using formatCurrency from utils

// Map local period keys to centralized dateUtils period keys
function mapPeriodKey(localKey) {
  const mapping = {
    'last_week': 'last_7_days',
    'last_30': 'last_30_days',
    'last_month': 'last_month',
    'this_year': 'this_year',
    'last_12': 'last_90_days', // Note: centralized utils don't have exact 12-month option
    'custom': 'custom',
    'all': 'all',
  };
  return mapping[localKey] || localKey;
}

// Wrapper for periodRange to handle local period keys and last_12 special case
function getLocalPeriodRange(mode, custom) {
  // Handle last_12 manually since centralized utils don't have this exact period
  if (mode === 'last_12') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    return { start, end: now };
  }
  return periodRange(mapPeriodKey(mode), custom);
}

// Wrapper for getPreviousRange to handle null check
function getLocalPreviousRange(start, end) {
  if (!start || !end) return { start: null, end: null };
  return getPreviousRange(start, end);
}

// Wrapper for rangeLabel to handle local period keys
function getLocalRangeLabel(period, custom) {
  if (period === 'all') return 'All time';
  if (period === 'last_week') return 'Past 7 days';
  if (period === 'last_30') return 'Past 30 days';
  if (period === 'last_12') return 'Past 12 months';
  if (period === 'custom' && custom?.start && custom?.end) return `${custom.start} - ${custom.end}`;
  return rangeLabel(mapPeriodKey(period), custom);
}

export default function QuotesList({
  quotes = [],
  clients = [],
  jobs = [],
  onOpenQuote,
  onNewQuoteClick,
  onArchiveQuotes,
  onDeleteQuotes,
  onConvertQuote,
  onSendQuote,
}) {
  const clientMap = useMemo(() => Object.fromEntries((clients||[]).map(c=>[c.id,c])), [clients]);

  // Filters
  const [statusFilter, setStatusFilter] = useState([]); // multi
  const [period, setPeriod] = useState('last_30');
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [sales, setSales] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');

  const salesOptions = useMemo(() => {
    const set = new Set();
    (quotes||[]).forEach(q => { if (q.salesperson || q.salespersonName) set.add(q.salesperson || q.salespersonName); });
    return Array.from(set);
  }, [quotes]);

  // Derived list with display fields
  const enhanced = useMemo(() => (quotes||[]).map(q => {
    const client = clientMap[q.clientId];
    const displayStatus = toDisplayStatus(q);
    const props = Array.isArray(client?.properties) ? client.properties : [];
    const prop = q.propertyId ? props.find((p, idx) => (p.uid || p.id || String(idx)) === q.propertyId) : null;
    const snapshotAddress = q.propertySnapshot
      ? [q.propertySnapshot.street1, q.propertySnapshot.street2, [q.propertySnapshot.city, q.propertySnapshot.state, q.propertySnapshot.zip].filter(Boolean).join(' '), q.propertySnapshot.country].filter(Boolean).join(', ')
      : '';
    const address = snapshotAddress || (prop
      ? [prop.street1, prop.street2, [prop.city, prop.state, prop.zip].filter(Boolean).join(' '), prop.country].filter(Boolean).join(', ')
      : (client?.address || ''));
    return {
      ...q,
      _clientName: client?.name || 'Unknown Client',
      _address: address || '',
      _status: displayStatus,
    };
  }), [quotes, clientMap]);

  // Filter + sort
  const filtered = useMemo(() => {
    const { start, end } = getLocalPeriodRange(period, custom);
    const inRange = (d) => {
      if (!start || !end) return true;
      const dt = new Date(d || 0);
      return dt >= start && dt <= end;
    };
    const term = search.trim().toLowerCase();
    const arr = enhanced.filter(q => {
      if (statusFilter.length && !statusFilter.includes(q._status)) return false;
      if (sales && (q.salesperson || q.salespersonName) !== sales) return false;
      if (!inRange(q.createdAt)) return false;
      if (term) {
        const hit = (q._clientName||'').toLowerCase().includes(term) ||
          (q.quoteNumber||'').toLowerCase().includes(term) ||
          (q._address||'').toLowerCase().includes(term) ||
          (q.lineItems||[]).some(it => (it.description||'').toLowerCase().includes(term));
        if (!hit) return false;
      }
      return true;
    });
    const s = [...arr].sort((a,b)=>{
      const dir = sortDir === 'asc' ? 1 : -1;
      const v = (k,x)=>k==='client'? (x._clientName||'') : k==='quoteNumber'? (x.quoteNumber||'') : k==='property'? (x._address||'') : k==='status'? (x._status||'') : k==='total'? (x.total||0) : (new Date(x.createdAt||0).getTime());
      const A = v(sortBy,a); const B = v(sortBy,b);
      if (typeof A === 'number' && typeof B === 'number') return (A-B)*dir;
      return String(A).localeCompare(String(B))*dir;
    });
    return s;
  }, [enhanced, statusFilter, sales, search, sortBy, sortDir, period, custom]);

  // KPIs within selected range
  const kpis = useMemo(() => {
    const { start, end } = getLocalPeriodRange(period, custom);
    const prev = getLocalPreviousRange(start, end);
    const useRange = !!(start && end);

    const inRange = (d, a, b) => {
      if (!d || !a || !b) return false;
      const dt = new Date(d);
      return dt >= a && dt <= b;
    };

    const jobConversionMap = new Map();
    (jobs || []).forEach(j => {
      if (j.quoteId && j.createdAt) jobConversionMap.set(j.quoteId, j.createdAt);
    });

    const getSentDate = (q) => q.sentAt || q.sent_date || q.sentDate || ((q.status === 'Awaiting Response' || q.status === 'Sent') ? (q.updatedAt || q.createdAt) : null);
    const getConvertedDate = (q) => q.convertedAt || q.convertedDate || jobConversionMap.get(q.id) || (q.status === 'Converted' ? (q.updatedAt || q.createdAt) : null);

    const sentNow = enhanced.filter(q => {
      const sentDate = getSentDate(q);
      return sentDate && (!useRange || inRange(sentDate, start, end));
    });
    const sentPrev = enhanced.filter(q => {
      if (!useRange) return false;
      const sentDate = getSentDate(q);
      return sentDate && inRange(sentDate, prev.start, prev.end);
    });
    const sentValue = sentNow.reduce((s,q)=>s+(q.total||0),0);

    const convertedNow = enhanced.filter(q => {
      const convertedDate = getConvertedDate(q);
      return convertedDate && (!useRange || inRange(convertedDate, start, end));
    });
    const convertedPrev = enhanced.filter(q => {
      if (!useRange) return false;
      const convertedDate = getConvertedDate(q);
      return convertedDate && inRange(convertedDate, prev.start, prev.end);
    });
    const convValue = convertedNow.reduce((s,q)=>s+(q.total||0),0);

    const sentCountNow = sentNow.length || 0;
    const convCountNow = convertedNow.length || 0;
    const convRateNow = sentCountNow === 0 ? 0 : Math.round((convCountNow / sentCountNow) * 100);

    const sentCountPrev = sentPrev.length || 0;
    const convCountPrev = convertedPrev.length || 0;
    const convRatePrev = sentCountPrev === 0 ? 0 : (convCountPrev / sentCountPrev) * 100;

    const trend = (current, previous) => {
      if (!useRange) return { t: null, pos: true };
      if (previous === 0) return { t: 'N/A', pos: true };
      const diff = ((current - previous) / previous) * 100;
      return { t: `${diff >= 0 ? '+' : '-'} ${Math.abs(Math.round(diff))}%`, pos: diff >= 0 };
    };

    const convDeltaPct = trend(convRateNow, convRatePrev);
    const sentDeltaPct = trend(sentCountNow, sentCountPrev);
    const convertedDeltaPct = trend(convCountNow, convCountPrev);

    const counts = enhanced.reduce((acc,q)=>{ acc[q._status]=(acc[q._status]||0)+1; return acc;}, {});

    return {
      convRateNow,
      convDeltaPct,
      convDeltaPos: convDeltaPct.pos,
      sentCountNow,
      sentDeltaPct,
      sentValue,
      convCountNow,
      convertedDeltaPct,
      convValue,
      counts,
    };
  }, [enhanced, jobs, period, custom]);

  // Selection / bulk actions
  const [selected, setSelected] = useState(new Set());
  const allChecked = filtered.length>0 && selected.size === filtered.length;
  const toggleAll = () => {
    if (allChecked) setSelected(new Set()); else setSelected(new Set(filtered.map(q=>q.id)));
  };
  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  const bulkArchive = () => { if (onArchiveQuotes) onArchiveQuotes(Array.from(selected)); clearSel(); };
  const bulkDelete = () => { if (onDeleteQuotes) onDeleteQuotes(Array.from(selected)); clearSel(); };

  const toggleSort = (key) => { if (sortBy === key) setSortDir(d => d==='asc'?'desc':'asc'); else { setSortBy(key); setSortDir('asc'); } };

  const statuses = ['Draft','Awaiting Response','Changes Requested','Approved','Converted','Archived'];
  const statusLabel = statusFilter.length === 0
    ? 'All'
    : statusFilter.length === 1
      ? statusFilter[0]
      : `${statusFilter.length} selected`;
  const rangeText = getLocalRangeLabel(period, custom);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-100">Quotes</h2>
        <button onClick={onNewQuoteClick} className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700">New Quote</button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Overview</div>
          <div className="space-y-2 text-sm">
            {statuses.slice(0,4).map(s => (
              <div key={s} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${s==='Draft'?'bg-midnight0': s==='Awaiting Response'?'bg-yellow-500': s==='Changes Requested'?'bg-amber-600': s==='Approved'?'bg-green-600':'bg-gray-400'}`}></span>{s}</div>
                <div className="text-gray-800 font-semibold">{kpis.counts[s]||0}</div>
              </div>
            ))}
          </div>
        </div>
        <KpiCard title="Conversion rate" sub={rangeText} value={`${kpis.convRateNow}%`} delta={kpis.convDeltaPct.t} positive={kpis.convDeltaPos} />
        <KpiCard title="Sent" sub={rangeText} value={kpis.sentCountNow} money={formatCurrency(kpis.sentValue)} delta={kpis.sentDeltaPct.t} positive={kpis.sentDeltaPct.pos} />
        <KpiCard title="Converted" sub={rangeText} value={kpis.convCountNow} money={formatCurrency(kpis.convValue)} delta={kpis.convertedDeltaPct.t} positive={kpis.convertedDeltaPct.pos} />
      </div>

      {/* Filters/Search */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={()=>setStatusOpen(o=>!o)} className="px-3 py-1.5 rounded-full bg-midnight text-gray-800 text-sm border">Status | {statusLabel}</button>
            {statusOpen && (
              <div className="absolute z-20 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                <input
                  value={statusSearch}
                  onChange={(e)=>setStatusSearch(e.target.value)}
                  placeholder="Search status"
                  className="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm"
                />
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-midnight ${statusFilter.length===0 ? 'bg-midnight' : ''}`}
                  onClick={()=>{ setStatusFilter([]); }}
                >
                  <span className="inline-block mr-2" style={{width:12}}>{statusFilter.length===0 ? 'x' : ''}</span>
                  All
                </button>
                {statuses.filter(s => s.toLowerCase().includes(statusSearch.trim().toLowerCase())).map(s => {
                  const active = statusFilter.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-midnight ${active ? 'bg-midnight' : ''}`}
                      onClick={()=> setStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])}
                    >
                      <span className="inline-block mr-2" style={{width:12}}>{active ? 'x' : ''}</span>
                      {s} <span className="text-slate-400">({kpis.counts[s]||0})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Simplified popovers: small inline controls for now */}
          <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="px-3 py-1.5 rounded-full bg-midnight text-gray-800 text-sm border">
            <option value="all">All</option>
            <option value="last_week">Last week</option>
            <option value="last_30">Last 30 days</option>
            <option value="last_month">Last month</option>
            <option value="this_year">This year</option>
            <option value="last_12">Last 12 months</option>
            <option value="custom">Custom range</option>
          </select>
          {period==='custom' && (
            <span className="text-xs text-slate-400">
              <input type="date" className="border px-2 py-1 rounded mr-1" value={custom.start} onChange={(e)=>setCustom(c=>({...c,start:e.target.value}))}/>
              <input type="date" className="border px-2 py-1 rounded" value={custom.end} onChange={(e)=>setCustom(c=>({...c,end:e.target.value}))}/>
            </span>
          )}
          <select value={sales} onChange={(e)=>setSales(e.target.value)} className="px-3 py-1.5 rounded-full bg-midnight text-gray-800 text-sm border">
            <option value="">Salesperson | All</option>
            {salesOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search quotes..." className="px-3 py-2 border border-gray-300 rounded-md text-sm w-72"/>
      </div>

      <div className="text-sm text-slate-100 mb-2">{(statusFilter.length || sales || (period !== 'all') || search) ? 'Filtered quotes' : 'All quotes'} ({filtered.length} results)</div>

      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-3 text-sm">
          <span className="text-green-700 font-semibold">{selected.size} selected</span>
          <button className="text-blue-700" onClick={clearSel}>Deselect All</button>
          <button title="Bulk Archive" className="px-2 py-1 rounded-md border bg-midnight" onClick={bulkArchive}>Bulk Archive</button>
          <button title="Bulk Delete" className="px-2 py-1 rounded-md border bg-midnight text-red-600" onClick={bulkDelete}>Bulk Delete</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-visible">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-slate-400">No quotes.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-midnight text-sm">
              <tr>
                <th className="p-3 w-10 text-center align-middle"><input className="h-4 w-4 align-middle" type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('client')}>Client{sortBy==='client' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('quoteNumber')}>Quote number{sortBy==='quoteNumber' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('property')}>Property{sortBy==='property' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('createdAt')}>Created{sortBy==='createdAt' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('status')}>Status{sortBy==='status' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('total')}>Total{sortBy==='total' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(q => (
                <tr key={q.id} className="border-t hover:bg-midnight">
                  <td className="p-3 w-10 text-center align-middle"><input className="h-4 w-4 align-middle" type="checkbox" checked={selected.has(q.id)} onChange={()=>toggleOne(q.id)} /></td>
                  <td className="p-3"><button onClick={()=>onOpenQuote && onOpenQuote(q)} className="font-semibold text-blue-700 hover:underline">{q._clientName}</button></td>
                  <td className="p-3">
                    <button onClick={()=>onOpenQuote && onOpenQuote(q)} className="font-semibold text-blue-700 hover:underline">
                      {q.quoteNumber || `#${(q.id||'').slice(0,6)}`}
                    </button>
                    {q.title ? <div className="text-xs text-slate-400">{q.title}</div> : null}
                  </td>
                  <td className="p-3"><div className="truncate max-w-xs">{q._address || 'N/A'}</div></td>
                  <td className="p-3">{q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-3"><Pill className={MERGED_STATUS_COLORS[q._status]||STATUS_COLORS.Draft}>{q._status}</Pill></td>
                  <td className="p-3 font-semibold text-slate-100">{formatCurrency(q.total||0)}</td>
                  <td className="p-3 w-12 text-right align-middle">
                    <div className="inline-block">
                      <RowActions q={q} onConvert={onConvertQuote} onArchive={(id)=>onArchiveQuotes && onArchiveQuotes([id])} onDelete={(id)=>onDeleteQuotes && onDeleteQuotes([id])} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RowActions({ q, onConvert, onArchive, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(e)=>e.stopPropagation()}>
      <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-midnight" onClick={()=>setOpen(o=>!o)}>...</button>
      <Menu open={open}>
        <button className="w-full text-left px-4 py-2 hover:bg-midnight" onClick={()=>{ setOpen(false); onConvert && onConvert(q); }}>Convert to Job</button>
        <button className="w-full text-left px-4 py-2 hover:bg-midnight" onClick={()=>{ setOpen(false); onArchive && onArchive(q.id); }}>Archive Quote</button>
        <button className="w-full text-left px-4 py-2 hover:bg-midnight text-red-600" onClick={()=>{ setOpen(false); onDelete && onDelete(q.id); }}>Delete</button>
      </Menu>
    </div>
  );
}


