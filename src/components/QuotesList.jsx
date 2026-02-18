// src/components/QuotesList.jsx
import React, { useMemo, useState } from 'react';
import { STATUS_COLORS } from '../constants/statusConstants';
import { formatCurrency } from '../utils';
import { periodRange, getPreviousRange, rangeLabel } from '../utils/dateUtils';
import { useBulkSelection } from '../hooks/ui';

import KpiCard from './common/KpiCard';
import BulkActionBar from './common/BulkActionBar';
import Pill from './common/Pill';

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
  'Awaiting Response': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  'Changes Requested': 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  Converted: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
};

// Merge centralized colors with local overrides
const MERGED_STATUS_COLORS = { ...STATUS_COLORS, ...LOCAL_STATUS_COLORS };


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
  const { selected, allChecked, toggleAll, toggleOne, clearSelection } = useBulkSelection(filtered);
  const bulkActions = [
    { label: 'Archive', onClick: () => { onArchiveQuotes?.(Array.from(selected)); clearSelection(); } },
    { label: 'Delete', onClick: () => { onDeleteQuotes?.(Array.from(selected)); clearSelection(); }, variant: 'danger' },
  ];

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
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-100">Quotes</h2>
        <button onClick={onNewQuoteClick} className="px-4 py-2 min-h-[44px] rounded-md bg-scaffld-teal text-white font-semibold hover:bg-scaffld-teal-deep transition-colors text-sm shrink-0">New Quote</button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-100 mb-2">Overview</div>
          <div className="space-y-2 text-sm text-slate-100">
            {statuses.slice(0,4).map(s => (
              <div key={s} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${s==='Draft'?'bg-harvest-amber': s==='Awaiting Response'?'bg-yellow-500': s==='Changes Requested'?'bg-amber-600': s==='Approved'?'bg-scaffld-teal':'bg-slate-500'}`}></span>{s}</div>
                <div className="text-slate-100 font-semibold">{kpis.counts[s]||0}</div>
              </div>
            ))}
          </div>
        </div>
        <KpiCard title="Conversion rate" sub={rangeText} value={`${kpis.convRateNow}%`} delta={kpis.convDeltaPct.t} positive={kpis.convDeltaPos} />
        <KpiCard title="Sent" sub={rangeText} value={kpis.sentCountNow} money={formatCurrency(kpis.sentValue)} delta={kpis.sentDeltaPct.t} positive={kpis.sentDeltaPct.pos} />
        <KpiCard title="Converted" sub={rangeText} value={kpis.convCountNow} money={formatCurrency(kpis.convValue)} delta={kpis.convertedDeltaPct.t} positive={kpis.convertedDeltaPct.pos} />
      </div>

      {/* Filters/Search */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="relative">
            <button onClick={()=>setStatusOpen(o=>!o)} className="px-3 py-1.5 rounded-full bg-charcoal text-slate-100 text-sm border border-slate-700 hover:bg-slate-dark transition-colors">Status | {statusLabel}</button>
            {statusOpen && (
              <div className="absolute z-20 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                <input
                  value={statusSearch}
                  onChange={(e)=>setStatusSearch(e.target.value)}
                  placeholder="Search status"
                  className="w-full px-2 py-1 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 rounded mb-2 text-sm focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20"
                />
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-slate-100 hover:bg-slate-dark ${statusFilter.length===0 ? 'bg-slate-dark' : ''}`}
                  onClick={()=>{ setStatusFilter([]); }}
                >
                  <span className="inline-block mr-2" style={{width:12}}>{statusFilter.length===0 ? '✓' : ''}</span>
                  All
                </button>
                {statuses.filter(s => s.toLowerCase().includes(statusSearch.trim().toLowerCase())).map(s => {
                  const active = statusFilter.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-slate-100 hover:bg-slate-dark ${active ? 'bg-slate-dark' : ''}`}
                      onClick={()=> setStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])}
                    >
                      <span className="inline-block mr-2" style={{width:12}}>{active ? '✓' : ''}</span>
                      {s} <span className="text-slate-400">({kpis.counts[s]||0})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Simplified popovers: small inline controls for now */}
          <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="px-3 py-1.5 rounded-full bg-charcoal text-slate-100 text-sm border border-slate-700 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20">
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
              <input type="date" className="bg-midnight border border-slate-700 text-slate-100 px-2 py-1 rounded mr-1 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20" value={custom.start} onChange={(e)=>setCustom(c=>({...c,start:e.target.value}))}/>
              <input type="date" className="bg-midnight border border-slate-700 text-slate-100 px-2 py-1 rounded focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20" value={custom.end} onChange={(e)=>setCustom(c=>({...c,end:e.target.value}))}/>
            </span>
          )}
          <select value={sales} onChange={(e)=>setSales(e.target.value)} className="px-3 py-1.5 rounded-full bg-charcoal text-slate-100 text-sm border border-slate-700 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20">
            <option value="">Salesperson | All</option>
            {salesOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search quotes..." className="px-3 py-2 min-h-[44px] bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 rounded-md text-sm w-full sm:w-72 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20"/>
      </div>

      <div className="text-sm text-slate-100 mb-2">{(statusFilter.length || sales || (period !== 'all') || search) ? 'Filtered quotes' : 'All quotes'} ({filtered.length} results)</div>

      <BulkActionBar selectedCount={selected.size} onDeselectAll={clearSelection} actions={bulkActions} />

      {/* Table */}
      <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden min-h-[calc(100vh-26rem)]">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-slate-400">No quotes.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-midnight text-sm border-b border-slate-700">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-scaffld-teal" /></th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors" onClick={()=>toggleSort('client')}>Client{sortBy==='client' && (sortDir==='asc'?' ▲':' ▼')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors hidden sm:table-cell" onClick={()=>toggleSort('quoteNumber')}>Quote #{sortBy==='quoteNumber' && (sortDir==='asc'?' ▲':' ▼')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors hidden md:table-cell" onClick={()=>toggleSort('property')}>Property{sortBy==='property' && (sortDir==='asc'?' ▲':' ▼')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors hidden sm:table-cell" onClick={()=>toggleSort('createdAt')}>Created{sortBy==='createdAt' && (sortDir==='asc'?' ▲':' ▼')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors" onClick={()=>toggleSort('status')}>Status{sortBy==='status' && (sortDir==='asc'?' ▲':' ▼')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-scaffld-teal transition-colors" onClick={()=>toggleSort('total')}>Total{sortBy==='total' && (sortDir==='asc'?' ▲':' ▼')}</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(q => (
                <tr key={q.id} className="border-t border-slate-700/30 hover:bg-slate-dark/50 transition-colors">
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleOne(q.id)} className="accent-scaffld-teal" /></td>
                  <td className="p-3"><button onClick={()=>onOpenQuote && onOpenQuote(q)} className="font-semibold text-scaffld-teal hover:underline">{q._clientName}</button></td>
                  <td className="p-3 hidden sm:table-cell">
                    <button onClick={()=>onOpenQuote && onOpenQuote(q)} className="font-semibold text-scaffld-teal hover:underline">
                      {q.quoteNumber || `#${(q.id||'').slice(0,6)}`}
                    </button>
                    {q.title ? <div className="text-xs text-slate-400">{q.title}</div> : null}
                  </td>
                  <td className="p-3 hidden md:table-cell"><div className="truncate max-w-xs">{q._address || 'N/A'}</div></td>
                  <td className="p-3 hidden sm:table-cell">{q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}</td>
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
          </div>
        )}
        {filtered.length > 0 && filtered.length < 5 && (
          <div className="bg-midnight/50 border border-slate-700/20 rounded-lg p-4 m-4 text-sm text-slate-500">
            Tip: Create quote templates in Settings to speed up quoting.
          </div>
        )}
      </div>
    </div>
  );
}

function RowActions({ q, onConvert, onArchive, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(e)=>e.stopPropagation()}>
      <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-700 bg-charcoal text-slate-300 hover:bg-slate-dark transition-colors" onClick={()=>setOpen(o=>!o)}>...</button>
      <Menu open={open}>
        <button className="w-full text-left px-4 py-2 text-slate-100 hover:bg-slate-dark" onClick={()=>{ setOpen(false); onConvert && onConvert(q); }}>Convert to Job</button>
        <button className="w-full text-left px-4 py-2 text-slate-100 hover:bg-slate-dark" onClick={()=>{ setOpen(false); onArchive && onArchive(q.id); }}>Archive Quote</button>
        <button className="w-full text-left px-4 py-2 text-signal-coral hover:bg-slate-dark" onClick={()=>{ setOpen(false); onDelete && onDelete(q.id); }}>Delete</button>
      </Menu>
    </div>
  );
}


