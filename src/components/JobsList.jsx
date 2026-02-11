// src/components/JobsList.jsx
import React, { useMemo, useState } from 'react';

const KpiCard = ({ title, sub, value, money, delta, positive }) => (
  <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
    <div className="text-sm font-semibold text-slate-100">{title}</div>
    <div className="text-xs text-slate-400 mb-2">{sub}</div>
    <div className="text-3xl font-bold text-slate-100">{value}</div>
    {typeof money === 'string' && <div className="text-xs text-slate-400">{money}</div>}
    {typeof delta === 'string' && (
      <div className={`inline-flex items-center mt-2 text-xs font-medium ${positive ? 'text-trellio-teal' : 'text-signal-coral'}`}>
        <span className={`inline-block h-2 w-2 rounded-full mr-1 ${positive ? 'bg-trellio-teal' : 'bg-signal-coral'}`} />
        {delta}
      </div>
    )}
  </div>
);

const Pill = ({ className = '', children }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
);

const STATUS_PILL = {
  Active: 'bg-indigo-100 text-indigo-800',
  Upcoming: 'bg-blue-100 text-blue-800',
  Today: 'bg-emerald-100 text-emerald-800',
  Late: 'bg-red-100 text-red-800',
  Unscheduled: 'bg-gray-100 text-slate-100',
  'Action Required': 'bg-yellow-100 text-yellow-800',
  'Requires Invoicing': 'bg-amber-100 text-amber-800',
  'Ending within 30 days': 'bg-orange-100 text-orange-800',
  Completed: 'bg-green-100 text-green-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Scheduled: 'bg-indigo-100 text-indigo-800',
  Archived: 'bg-gray-100 text-slate-400',
};

function currency(n) {
  const num = Number(n || 0);
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(num); }
  catch { return `$${num.toFixed(2)}`; }
}

function formatPropertyAddress(prop) {
  if (!prop) return '';
  return [
    prop.street1,
    prop.street2,
    [prop.city, prop.state, prop.zip].filter(Boolean).join(' '),
    prop.country,
  ].filter(Boolean).join(', ');
}

function classifyJob(job, { invoicesByJob }) {
  if (job.archived) return 'Archived';
  const now = new Date();
  const start = job.start ? new Date(job.start) : null;
  const end = job.end ? new Date(job.end) : null;
  const isCompleted = job.status === 'Completed';

  // Always prefer explicit job status first
  if (isCompleted) {
    return invoicesByJob.has(job.id) ? 'Completed' : 'Requires Invoicing';
  }
  if (job.status === 'In Progress') return 'In Progress';
  if (job.status === 'Scheduled') return 'Scheduled';
  if (job.status === 'Unscheduled' || !start) return 'Unscheduled';

  const isToday = start.toDateString() === now.toDateString();
  if (isToday) return 'Today';
  if (start > now) return 'Upcoming';
  if (start < now) return 'Late';
  if (end && end > now && (end - now) / (1000 * 60 * 60 * 24) <= 30) return 'Ending within 30 days';
  if (job.status === 'Scheduled' || job.status === 'In Progress') return 'Active';
  return 'Action Required';
}

function periodRangeNext(days) {
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() + 1);
  const end = new Date(now); end.setDate(end.getDate() + days);
  return { start, end };
}
function periodRangeLast(days) {
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - days);
  const end = now;
  return { start, end };
}

export default function JobsList({
  jobs = [],
  clients = [],
  quotes = [],
  invoices = [],
  onOpenJob,
  onNewJobClick,
  onManageJobForms,
}) {
  const clientById = useMemo(() => Object.fromEntries((clients||[]).map(c=>[c.id, c])), [clients]);
  const quoteMap = useMemo(() => Object.fromEntries((quotes||[]).map(q=>[q.id, q])), [quotes]);
  const invoicesByJob = useMemo(() => {
    const m = new Map();
    (invoices||[]).forEach(i => { if (i.jobId) m.set(i.jobId, true); });
    return m;
  }, [invoices]);

  const enhanced = useMemo(() => (jobs||[]).map(j => {
    const client = clientById[j.clientId];
    const props = Array.isArray(client?.properties) ? client.properties : [];
    const propMatch = j.propertyId ? props.find((p, idx) => (p.uid || p.id || String(idx)) === j.propertyId) : null;
    const prop = j.propertySnapshot || propMatch || null;
    return {
      ...j,
      _clientName: client?.name || 'Unknown Client',
      _address: formatPropertyAddress(prop) || client?.address || '',
      _total: (quoteMap[j.quoteId]?.total) || 0,
    };
  }), [jobs, clientById, quoteMap]);

  // Status classification per job
  const classified = useMemo(() => enhanced.map(j => ({ ...j, _status: classifyJob(j, { invoicesByJob }) })), [enhanced, invoicesByJob]);

  // KPIs
  const kpis = useMemo(() => {
    const counts = classified.reduce((acc, j) => { acc[j._status] = (acc[j._status]||0)+1; return acc; }, {});
    const last30 = periodRangeLast(30);
    const inRange = (d,a,b)=> d && new Date(d) >= a && new Date(d) <= b;
    const recent = classified.filter(j => inRange(j.start, last30.start, last30.end));
    const visitsLast30 = recent.length;
    const valueLast30 = recent.reduce((s,j)=> s + (j._total || 0), 0);
    const next30 = periodRangeNext(30);
    const upcoming = classified.filter(j => inRange(j.start, next30.start, next30.end));
    const visitsNext30 = upcoming.length;
    const valueNext30 = upcoming.reduce((s,j)=> s + (j._total || 0), 0);
    return { counts, visitsLast30, valueLast30, visitsNext30, valueNext30 };
  }, [classified]);

  // Filters
  const [statusOpen, setStatusOpen] = useState(false);
  const [status, setStatus] = useState('all');
  const [jobTypeOpen, setJobTypeOpen] = useState(false);
  const [jobType, setJobType] = useState('all'); // placeholder until we track types
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('schedule');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const statusAllowed = status === 'all' ? null : status;
    let arr = classified.filter(j => {
      const base = (j._clientName||'').toLowerCase().includes(term) || (j._address||'').toLowerCase().includes(term) || (j.title||'').toLowerCase().includes(term) || (j.id||'').toLowerCase().includes(term);
      const statusOk = !statusAllowed || j._status === statusAllowed;
      const typeOk = true; // no job type yet
      return base && statusOk && typeOk;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const v = (k,x)=> k==='client'? (x._clientName||'') : k==='job'? (x.id||'') : k==='property'? (x._address||'') : k==='schedule'? (x.start? new Date(x.start).getTime():0) : k==='status'? (x._status||'') : (x._total||0);
    arr.sort((a,b)=>{ const A=v(sortBy,a), B=v(sortBy,b); if (typeof A==='number' && typeof B==='number') return (A-B)*dir; return String(A).localeCompare(String(B))*dir; });
    return arr;
  }, [classified, status, jobType, search, sortBy, sortDir]);

  const toggleSort = (key) => { if (sortBy === key) setSortDir(d => d==='asc'?'desc':'asc'); else { setSortBy(key); setSortDir('asc'); } };

  const statusOptions = [
    'Ending within 30 days', 'Late', 'Requires Invoicing', 'Action Required', 'Unscheduled', 'Today', 'Upcoming', 'Active', 'Archived'
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-100">Jobs</h2>
        <div className="flex items-center gap-2">
          <button onClick={onNewJobClick} className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700">New Job</button>
          <div className="relative">
            <button onClick={()=>setJobTypeOpen(o=>!o)} className="px-3 py-2 rounded-md border bg-gray-100 text-slate-100">More Actions</button>
            {jobTypeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-charcoal border border-slate-700/30 rounded-md shadow z-20">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-midnight" onClick={()=>{ setJobTypeOpen(false); onManageJobForms && onManageJobForms(); }}>Manage Job Forms</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-100 mb-2">Overview</div>
          <div className="space-y-2 text-sm">
            {['Ending within 30 days','Late','Action Required','Requires Invoicing','Unscheduled'].map(s => (
              <div key={s} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${s==='Late'?'bg-red-500': s==='Requires Invoicing'?'bg-amber-500': s==='Action Required'?'bg-yellow-500': s==='Unscheduled'?'bg-midnight0':'bg-orange-500'}`}></span>{s}</div>
                <div className="text-slate-100 font-semibold">{kpis.counts[s]||0}</div>
              </div>
            ))}
          </div>
        </div>
        <KpiCard title="Recent visits" sub="Past 30 days" value={kpis.visitsLast30} money={currency(kpis.valueLast30)} />
        <KpiCard title="Visits scheduled" sub="Next 30 days" value={kpis.visitsNext30} money={currency(kpis.valueNext30)} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={()=>setStatusOpen(o=>!o)} className="px-3 py-1.5 rounded-full bg-gray-100 text-slate-100 text-sm border">Status | {status==='all'? 'All' : status}</button>
            {statusOpen && (
              <div className="absolute z-20 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow p-2">
                <input placeholder="Search status" className="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm" />
                <button className={`w-full text-left px-3 py-2 hover:bg-midnight ${status==='all'?'bg-midnight':''}`} onClick={()=>{ setStatus('all'); setStatusOpen(false); }}>
                  <span className="inline-block mr-2" style={{width:12}}>{status==='all'?'x':''}</span>
                  All
                </button>
                {statusOptions.map(s => (
                  <button key={s} className={`w-full text-left px-3 py-2 hover:bg-midnight ${status===s?'bg-midnight':''}`} onClick={()=>{ setStatus(s); setStatusOpen(false); }}>
                    <span className="inline-block mr-2" style={{width:12}}>{status===s?'x':''}</span>
                    {s} <span className="text-slate-400">({kpis.counts[s]||0})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button className="px-3 py-1.5 rounded-full bg-gray-100 text-slate-100 text-sm border">Job Type | {jobType==='all'? 'All' : jobType}</button>
          </div>
        </div>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search jobs..." className="px-3 py-2 border border-gray-300 rounded-md text-sm w-72"/>
      </div>

      <div className="text-sm text-slate-100 mb-2">{(status!=='all' || jobType!=='all' || search) ? 'Filtered jobs' : 'All jobs'} ({filtered.length} results)</div>

      <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-slate-400">No jobs found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-midnight text-sm">
              <tr>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('client')}>Client{sortBy==='client' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('job')}>Job number{sortBy==='job' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('property')}>Property{sortBy==='property' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('schedule')}>Schedule{sortBy==='schedule' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('status')}>Status{sortBy==='status' && (sortDir==='asc'?' ^':' v')}</th>
                <th className="text-left font-semibold p-3 cursor-pointer select-none" onClick={()=>toggleSort('total')}>Total{sortBy==='total' && (sortDir==='asc'?' ^':' v')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(j => (
                <tr key={j.id} className="border-t hover:bg-midnight">
                  <td className="p-3"><button onClick={()=>onOpenJob && onOpenJob(j)} className="font-semibold text-blue-700 hover:underline">{j._clientName}</button></td>
                  <td className="p-3"><button onClick={()=>onOpenJob && onOpenJob(j)} className="font-semibold text-blue-700 hover:underline">{j.jobNumber || ('#'+(j.id||'').slice(0,8))}</button></td>
                  <td className="p-3"><div className="truncate max-w-xs">{j._address || '--'}</div></td>
                  <td className="p-3">{j.start ? new Date(j.start).toLocaleDateString() : '--'}</td>
                  <td className="p-3"><Pill className={STATUS_PILL[j._status] || STATUS_PILL['Active']}>{j._status}</Pill></td>
                  <td className="p-3 font-semibold text-slate-100">{currency(j._total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


