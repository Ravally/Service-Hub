// src/components/InvoicesList.jsx
import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../utils';
import { inRange, lastNDays, last30ExcludingToday, monthRange, yearRange } from '../utils/dateUtils';
import KpiCard from './common/KpiCard';

export default function InvoicesList({ invoices=[], clients=[], onOpenInvoice, onNewInvoice }) {
  const clientMap = useMemo(() => Object.fromEntries((clients||[]).map(c=>[c.id,c])), [clients]);
  const enhanced = useMemo(() => (invoices||[]).map(inv => {
    const paidSoFar = Array.isArray(inv.payments) ? inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0) : 0;
    return {
      ...inv,
      _clientName: clientMap[inv.clientId]?.name || 'Unknown Client',
      _address: inv.serviceAddress || inv.billingAddress || clientMap[inv.clientId]?.address || '',
      _balance: inv.status === 'Paid' ? 0 : Math.max(0, (inv.total || 0) - paidSoFar),
    };
  }), [invoices, clientMap]);

  const kpis = useMemo(() => {
    const today = new Date();
    const pastDue = enhanced.filter(i => (i.status==='Unpaid' || i.status==='Sent') && i.dueDate && new Date(i.dueDate) < today);
    const awaitingNotDue = enhanced.filter(i => (i.status==='Unpaid' || i.status==='Sent') && i.dueDate && new Date(i.dueDate) >= today);
    const overview = {
      pastDue: { count: pastDue.length, value: pastDue.reduce((s,i)=>s+(i.total||0),0) },
      notDue: { count: awaitingNotDue.length, value: awaitingNotDue.reduce((s,i)=>s+(i.total||0),0) },
    };

    const { start: issStart, end: issEnd } = last30ExcludingToday();
    const issuedNow = enhanced.filter(i => inRange(i.issueDate || i.createdAt, issStart, issEnd));
    const issuedPrevEnd = new Date(issStart); issuedPrevEnd.setDate(issuedPrevEnd.getDate()-1);
    const issuedPrevStart = new Date(issuedPrevEnd); issuedPrevStart.setDate(issuedPrevStart.getDate()-29);
    const issuedPrev = enhanced.filter(i => inRange(i.issueDate || i.createdAt, issuedPrevStart, issuedPrevEnd));
    const sentDelta = (()=>{ const prev=issuedPrev.length, cur=issuedNow.length; if(prev===0) return { t:'N/A', pos:true }; const diff=((cur-prev)/prev)*100; return { t:`${diff>=0?'+':'-'} ${Math.abs(Math.round(diff))}%`, pos:diff>=0 }; })();
    const issuedValue = issuedNow.reduce((s,i)=>s+(i.total||0),0);
    const avgNow = issuedNow.length ? issuedValue/issuedNow.length : 0;
    const avgPrevVal = issuedPrev.reduce((s,i)=>s+(i.total||0),0); const avgPrev = issuedPrev.length ? avgPrevVal/issuedPrev.length : 0;
    const avgDelta = avgPrev===0 ? { t:'N/A', pos:true } : (()=>{ const diff=((avgNow-avgPrev)/avgPrev)*100; return { t:`${diff>=0?'+':'-'} ${Math.abs(Math.round(diff))}%`, pos:diff>=0 }; })();

    const { start: paidStart, end: paidEnd } = lastNDays(7);
    const paidLast7 = enhanced.filter(i => i.status==='Paid' && i.paidAt && inRange(i.paidAt, paidStart, paidEnd));
    const daysToPaid = paidLast7.map(i => { const a = new Date(i.issueDate || i.createdAt); const b = new Date(i.paidAt); return Math.max(0, Math.round((b-a)/(1000*60*60*24))); });
    const avgDays = daysToPaid.length ? Math.round(daysToPaid.reduce((s,n)=>s+n,0)/daysToPaid.length) : 0;

    return { overview, issuedCount: issuedNow.length, issuedValue, sentDelta, avgInvoice: avgNow, avgDelta, avgDays };
  }, [enhanced]);

  // Filters
  const [statusOpen, setStatusOpen] = useState(false);
  const [status, setStatus] = useState('all');
  const [dueOpen, setDueOpen] = useState(false);
  const [dueMode, setDueMode] = useState('all');
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('due');
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    const today = new Date();
    const term = search.trim().toLowerCase();
    const dateRange = (()=>{
      if (dueMode==='all') return { start:null, end:null };
      if (dueMode==='this_month') return monthRange(0);
      if (dueMode==='last_month') return monthRange(-1);
      if (dueMode==='this_year') return yearRange(new Date().getFullYear());
      if (dueMode==='custom') return { start: custom.start? new Date(custom.start):null, end: custom.end? new Date(custom.end):null };
      return { start:null, end:null };
    })();
    const arr = enhanced.filter(i => {
      const past = (i.status==='Unpaid' || i.status==='Sent') && i.dueDate && new Date(i.dueDate) < today;
      const notDue = (i.status==='Unpaid' || i.status==='Sent') && i.dueDate && new Date(i.dueDate) >= today;
      const label = past ? 'Awaiting Payment: Past Due' : notDue ? 'Awaiting Payment: Not Yet Due' : i.status;
      const statusOk = status==='all' || status===label || (status==='Awaiting Payment: All' && (past||notDue));
      const dueOk = inRange(i.dueDate || i.issueDate || i.createdAt, dateRange.start, dateRange.end);
      const textOk = (i._clientName||'').toLowerCase().includes(term) || (i.invoiceNumber||'').toLowerCase().includes(term) || (i._address||'').toLowerCase().includes(term);
      return statusOk && dueOk && textOk;
    });
    const dir = sortDir==='asc'?1:-1;
    const v = (k,x)=> k==='client'? (x._clientName||'') : k==='number'? (x.invoiceNumber||'') : k==='due'? (x.dueDate? new Date(x.dueDate).getTime():0) : k==='status'? (x.status||'') : k==='total'? (x.total||0) : (x._balance||0);
    return arr.sort((a,b)=>{ const A=v(sortBy,a), B=v(sortBy,b); if (typeof A==='number' && typeof B==='number') return (A-B)*dir; return String(A).localeCompare(String(B))*dir; });
  }, [enhanced, status, dueMode, custom, search, sortBy, sortDir]);

  const toggleSort = (k) => { if (sortBy===k) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortBy(k); setSortDir('asc'); } };

  const statusOptions = [
    'Awaiting Payment: Past Due', 'Awaiting Payment: Not Yet Due', 'Awaiting Payment: All', 'Draft', 'Paid'
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold font-display text-slate-100">Invoices</h2>
        {onNewInvoice && (
          <button
            onClick={onNewInvoice}
            className="px-4 py-2 rounded-lg bg-trellio-teal text-white text-sm font-semibold hover:bg-trellio-teal-deep transition-colors"
          >
            New Invoice
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-100 mb-2">Overview</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500"></span>Past due ({kpis.overview.pastDue.count})</span><span>{formatCurrency(kpis.overview.pastDue.value)}</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500"></span>Sent but not due ({kpis.overview.notDue.count})</span><span>{formatCurrency(kpis.overview.notDue.value)}</span></div>
          </div>
        </div>
        <KpiCard title="Issued" sub="Past 30 days" value={kpis.issuedCount} money={formatCurrency(kpis.issuedValue)} delta={kpis.sentDelta.t} positive={kpis.sentDelta.pos} />
        <KpiCard title="Average invoice" sub="Past 30 days" value={formatCurrency(kpis.avgInvoice)} delta={kpis.avgDelta.t} positive={kpis.avgDelta.pos} />
        <KpiCard title="Average time to get paid" sub="Past 7 days" value={`${kpis.avgDays} days`} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={()=>setStatusOpen(o=>!o)} className="px-3 py-1.5 rounded-full bg-charcoal text-slate-100 text-sm border border-slate-700">Status | {status==='all' ? 'All' : status}</button>
            {statusOpen && (
              <div className="absolute z-20 mt-2 w-72 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                <input placeholder="Search status" className="w-full px-2 py-1 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-trellio-teal rounded mb-2 text-sm" />
                <button className={`w-full text-left px-3 py-2 text-slate-100 hover:bg-slate-dark ${status==='all'?'bg-slate-dark':''}`} onClick={()=>{ setStatus('all'); setStatusOpen(false); }}>All</button>
                {statusOptions.map(s => (
                  <button key={s} className={`w-full text-left px-3 py-2 text-slate-100 hover:bg-slate-dark ${status===s?'bg-slate-dark':''}`} onClick={()=>{ setStatus(s); setStatusOpen(false); }}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={()=>setDueOpen(o=>!o)} className="px-3 py-1.5 rounded-full bg-charcoal text-slate-100 text-sm border border-slate-700">Due | {dueMode==='all' ? 'All' : dueMode.replace('_',' ')}</button>
            {dueOpen && (
              <div className="absolute z-20 mt-2 w-80 bg-charcoal border border-slate-700/30 rounded-md shadow p-3">
                <div className="text-sm text-slate-100 mb-2">Due date</div>
                <select value={dueMode} onChange={(e)=>setDueMode(e.target.value)} className="w-full px-2 py-2 bg-midnight border border-slate-700 text-slate-100 rounded mb-3 text-sm">
                  <option value="all">All</option>
                  <option value="this_month">This month</option>
                  <option value="last_month">Last month</option>
                  <option value="this_year">This year</option>
                  <option value="custom">Custom range</option>
                </select>
                {dueMode==='custom' && (
                  <div className="flex items-center gap-2 mb-3">
                    <input type="date" value={custom.start} onChange={(e)=>setCustom(c=>({...c,start:e.target.value}))} className="px-2 py-1 bg-midnight border border-slate-700 text-slate-100 rounded text-sm w-full" />
                    <input type="date" value={custom.end} onChange={(e)=>setCustom(c=>({...c,end:e.target.value}))} className="px-2 py-1 bg-midnight border border-slate-700 text-slate-100 rounded text-sm w-full" />
                  </div>
                )}
                <div className="text-right">
                  <button onClick={()=>setDueOpen(false)} className="px-4 py-2 bg-trellio-teal text-white rounded-md font-semibold hover:bg-trellio-teal-deep transition-colors">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search invoices..." className="px-3 py-2 bg-midnight border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20 rounded-md text-sm w-72"/>
      </div>

      <div className="text-sm text-slate-100 mb-2">{(status!=='all' || dueMode!=='all' || search) ? 'Filtered invoices' : 'All invoices'} ({filtered.length} results)</div>

      <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden min-h-[calc(100vh-26rem)]">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-slate-400">No invoices found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-midnight text-sm border-b border-slate-700">
              <tr>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-trellio-teal transition-colors" onClick={()=>toggleSort('client')}>Client{sortBy==='client' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-trellio-teal transition-colors" onClick={()=>toggleSort('number')}>Invoice number{sortBy==='number' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold text-slate-300 p-3">Property</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-trellio-teal transition-colors" onClick={()=>toggleSort('due')}>Due date{sortBy==='due' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-trellio-teal transition-colors" onClick={()=>toggleSort('status')}>Status{sortBy==='status' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-trellio-teal transition-colors" onClick={()=>toggleSort('total')}>Total{sortBy==='total' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold text-slate-300 p-3 cursor-pointer select-none hover:text-trellio-teal transition-colors" onClick={()=>toggleSort('balance')}>Balance{sortBy==='balance' && (sortDir==='asc'?' ^':' v')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(inv => (
                <tr key={inv.id} className="border-t border-slate-700/30 hover:bg-slate-dark/50 transition-colors" onClick={()=>onOpenInvoice && onOpenInvoice(inv)}>
                  <td className="p-3"><button className="font-semibold text-trellio-teal hover:underline">{inv._clientName}</button></td>
                  <td className="p-3"><button onClick={()=>onOpenInvoice && onOpenInvoice(inv)} className="font-semibold text-trellio-teal hover:underline">{inv.invoiceNumber || `#${(inv.id||'').slice(0,6)}`}</button></td>
                  <td className="p-3"><div className="truncate max-w-xs">{inv._address || '-'}</div></td>
                  <td className="p-3">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3">{inv.status}</td>
                  <td className="p-3 font-semibold text-slate-100">{formatCurrency(inv.total||0)}</td>
                  <td className="p-3 font-semibold text-slate-100">{formatCurrency(inv._balance||0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 0 && filtered.length < 5 && (
          <div className="bg-midnight/50 border border-slate-700/20 rounded-lg p-4 m-4 text-sm text-slate-500">
            Tip: Batch invoice completed jobs from the Jobs page.
          </div>
        )}
      </div>
    </div>
  );
}
