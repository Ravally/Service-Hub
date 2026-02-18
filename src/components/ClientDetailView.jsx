// src/components/ClientDetailView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { AtSignIcon, ChevronLeftIcon, MapPinIcon, PhoneIcon, EditIcon } from './icons';
import { formatCurrency, formatDate, formatDateTime, computeClientSegments, getSegmentDef } from '../utils';
import { STATUS_COLORS } from '../constants';

const ClientDetailView = ({
  client,
  onBack,
  onUpdate,
  handleDeleteClient,
  quotes,
  jobs,
  invoices,
  notifications = [],
  clientNotes = [],
  onAddNote,
  onGeneratePortalLink,
  onCreateProperty,
  onCreateQuote,
  onCreateJob,
  onCreateInvoice,
  onCollectPayment,
  onViewAsClient,
  onDownloadVCard,
  onArchiveClient,
  onOpenInvoice,
  onOpenQuote,
  onOpenJob,
  onOpenProperty,
  onEditClient,
}) => {
  const properties = Array.isArray(client.properties) && client.properties.length > 0
    ? client.properties
    : [{ uid: 'primary', label: 'Primary', street1: (client.address || '').split(',')[0] || '', city: '', state: '', zip: '', country: '', isPrimary: true }];

  const initials = useMemo(() => {
    const parts = (client.name || '').trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : (parts[0]?.[1] || '');
    return (first + last).toUpperCase();
  }, [client.name]);

  const [overviewTab, setOverviewTab] = useState('active');
  const clientQuotes = (quotes || []).filter((q) => q.clientId === client.id);
  const clientJobs = (jobs || []).filter((j) => j.clientId === client.id);
  const clientInvoices = (invoices || []).filter((i) => i.clientId === client.id);

  const clientSegmentKeys = useMemo(() => {
    const segs = computeClientSegments([client], jobs, invoices);
    const keys = segs.get(client.id) || [];
    return keys.filter(k => k !== 'vip');
  }, [client, jobs, invoices]);

  const billingEntries = useMemo(() => {
    const out = [];
    clientInvoices.forEach(inv => {
      const isCredit = inv.isCreditNote === true;
      const label = isCredit ? `Credit Note ${inv.invoiceNumber || inv.id.substring(0,6)}` : `Invoice ${inv.invoiceNumber || inv.id.substring(0,6)}`;
      const amount = isCredit ? -Math.abs(+inv.total || 0) : +(inv.total || 0);
      out.push({ id: `inv-${inv.id}`, type: isCredit ? 'credit' : 'invoice', date: inv.issueDate || inv.createdAt, label, amount, status: inv.status });
      const pays = Array.isArray(inv.payments) ? inv.payments : [];
      pays.forEach((p, idx) => out.push({ id: `pay-${inv.id}-${idx}`, type: 'payment', date: p.createdAt || inv.paidAt || inv.issueDate || inv.createdAt, label: `Payment for ${inv.invoiceNumber || inv.id.substring(0,6)}`, amount: -Math.abs(+p.amount || 0), method: p.method || 'Recorded' }));
    });
    out.sort((a,b)=> new Date(b.date||0) - new Date(a.date||0));
    return out;
  }, [clientInvoices]);

  // Compute outstanding balance based on invoice state, payments, and credit notes
  const creditsByInvoice = useMemo(() => {
    const map = new Map();
    (clientInvoices || []).forEach(inv => {
      if (inv.isCreditNote && inv.creditForInvoiceId) {
        map.set(inv.creditForInvoiceId, (map.get(inv.creditForInvoiceId) || 0) + (+inv.total || 0));
      }
    });
    return map;
  }, [clientInvoices]);

  const currentBalance = useMemo(() => {
    let sum = 0;
    (clientInvoices || []).forEach(inv => {
      if (inv.isCreditNote) return; // handled via credits map
      const total = +inv.total || 0;
      const payments = (Array.isArray(inv.payments) ? inv.payments : []).reduce((s,p)=> s + (+p.amount || 0), 0);
      const credits = creditsByInvoice.get(inv.id) || 0;
      // If marked Paid but no payments logged, treat as fully paid
      if (inv.status === 'Paid' && payments === 0) return;
      const due = Math.max(0, total - payments - credits);
      sum += due;
    });
    return sum;
  }, [clientInvoices, creditsByInvoice]);

  const clientComms = useMemo(() => {
    const email = (client.email || '').toLowerCase();
    const name = (client.name || '').toLowerCase();
    return (notifications||[])
      .filter(n => { const m = (n.message || '').toLowerCase(); return (email && m.includes(email)) || (name && m.includes(name)); })
      .sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0))
      .slice(0,10);
  }, [notifications, client.email, client.name]);

  // Inline edit modal removed; editing now routes to full Create Client screen prefilled

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="min-h-[44px] flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-scaffld-teal mb-3">
        <ChevronLeftIcon /> Back to Clients
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-full bg-charcoal border border-slate-700/30 flex items-center justify-center text-scaffld-teal font-bold">{initials}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 truncate">{client.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!client.email}
            onClick={() => { if (client.email) window.location.href = `mailto:${client.email}`; }}
            className={`min-h-[44px] inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-semibold ${client.email ? 'bg-scaffld-teal/10 text-scaffld-teal border-scaffld-teal/30 hover:bg-scaffld-teal/20' : 'bg-charcoal text-slate-500 border-slate-700/30 cursor-not-allowed'}`}
          >
            <AtSignIcon className="h-4 w-4" /> Email
          </button>
          <button
            type="button"
            onClick={() => onEditClient && onEditClient(client)}
            className="min-h-[44px] inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700/30 bg-charcoal text-sm font-semibold text-slate-100 hover:bg-charcoal/80"
          >
            <EditIcon className="h-4 w-4" /> Edit
          </button>
          <details className="relative">
            <summary className="list-none cursor-pointer min-h-[44px] inline-flex items-center px-3 py-1.5 rounded-md border border-slate-700/30 bg-charcoal text-slate-100 text-sm font-semibold hover:bg-charcoal/80">More Actions</summary>
            <div className="absolute right-0 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-md shadow-lg z-10 p-1">
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onCreateQuote && onCreateQuote(client)}>Quote</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onCreateJob && onCreateJob(client)}>Job</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onCreateInvoice && onCreateInvoice(client)}>Invoice</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onCollectPayment && onCollectPayment(client)}>Collect Payment</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onArchiveClient && onArchiveClient(client)}>Archive Client</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onDownloadVCard && onDownloadVCard(client)}>Download VCard</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onGeneratePortalLink && onGeneratePortalLink(client)}>Generate Portal Link</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-slate-100" onClick={()=>onViewAsClient && onViewAsClient(client)}>Log in as Client</button>
            <button className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-midnight text-sm text-signal-coral" onClick={()=>handleDeleteClient && handleDeleteClient(client.id)}>Delete</button>
            </div>
          </details>
        </div>
      </div>

      {/* Edit modal removed in favor of full-page editor */}

      {/* Properties + Contact Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-charcoal p-4 rounded-xl shadow border border-slate-700/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Properties</h3>
            <button className="min-h-[44px] px-3 py-1.5 text-sm rounded-md bg-midnight text-slate-100 hover:bg-midnight/80" onClick={()=>onCreateProperty && onCreateProperty(client)}>+ New Property</button>
          </div>
          {properties.length === 0 ? (
            <p className="text-sm text-slate-400">No properties yet.</p>
          ) : (
            <div className="space-y-3">
              {properties.map((p, idx) => {
                const line1 = [p.street1, p.street2].filter(Boolean).join(' ');
                const line2 = [p.city, p.state, p.zip].filter(Boolean).join(', ');
                const addressLabel = line1 || p.label || `Property ${idx + 1}`;
                const lawnSize = p.lawnSizeWidth && p.lawnSizeLength ? `${p.lawnSizeWidth} x ${p.lawnSizeLength} ${p.lawnSizeUnit || 'ft'}` : '-';
                return (
                  <div key={p.uid || idx} className="border border-slate-700/30 rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl border border-slate-700/30 flex items-center justify-center text-scaffld-teal bg-scaffld-teal/10">
                          <MapPinIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100">{addressLabel}</div>
                          <div className="text-sm text-slate-400">{[line2, p.country].filter(Boolean).join(', ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          className="min-h-[44px] inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-midnight text-slate-100 hover:bg-midnight/80"
                          href={`https://www.google.com/maps?q=${encodeURIComponent([p.street1,p.street2,p.city,p.state,p.zip,p.country].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Show on Map
                        </a>
                        {onOpenProperty && (
                          <button className="min-h-[44px] px-3 py-1.5 text-sm rounded-md border border-slate-700/30 text-slate-100 hover:bg-midnight/50" onClick={()=>onOpenProperty(p)}>
                            View
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between border-t border-slate-700/30 pt-3">
                        <span className="text-slate-400">Locked Gate</span>
                        <span className="font-semibold text-slate-100">{p.lockedGate ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/30 pt-3">
                        <span className="text-slate-400">Lawn Size</span>
                        <span className="font-semibold text-slate-100">{lawnSize}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/30 pt-3">
                        <span className="text-slate-400">Gate Code</span>
                        <span className="font-semibold text-slate-100">{p.accessCode || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/30 pt-3">
                        <span className="text-slate-400">Tax rate</span>
                        <span className="font-semibold text-slate-100">{p.taxRate || 'Default'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-charcoal p-4 rounded-xl shadow border border-slate-700/30">
          <h3 className="text-lg font-semibold mb-3 text-slate-100">Contact info</h3>
          <div className="space-y-2 text-sm text-slate-100">
            {client.phone && (<div className="flex items-center gap-2"><PhoneIcon /><span>{client.phone}</span></div>)}
            {client.email && (<div className="flex items-center gap-2"><AtSignIcon /><span>{client.email}</span></div>)}
            {client.leadSource && (<div className="flex items-center gap-2"><span className="text-slate-400">Lead source</span><span className="font-medium">{client.leadSource}</span></div>)}
          </div>
          {(client.tags && client.tags.length>0) && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2 text-slate-100">Tags</div>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((t, i)=>(<span key={`${t}-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">{t}</span>))}
              </div>
            </div>
          )}
          {clientSegmentKeys.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2 text-slate-100">Segments</div>
              <div className="flex flex-wrap gap-2">
                {clientSegmentKeys.map(key => { const def = getSegmentDef(key); return def ? (<span key={key} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${def.color}`}>{def.label}</span>) : null; })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview + Schedule left, communications/billing right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-charcoal p-4 rounded-xl shadow border border-slate-700/30 mb-8">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-slate-100">Overview</h3>
            </div>
            <div className="flex items-center gap-2 text-sm mb-3">
              {['active','quotes','jobs','invoices'].map(t => (
                <button key={t} onClick={()=>setOverviewTab(t)} className={`min-h-[44px] px-3 py-1.5 rounded-full border ${overviewTab===t? 'bg-scaffld-teal text-midnight border-scaffld-teal':'bg-midnight text-slate-100 border-slate-700/30'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
            </div>
            <div>
              {overviewTab === 'active' && (clientQuotes || []).some(q => q && (q.status === 'Draft' || q.status === 'Sent' || q.status === 'Awaiting Response')) && (
                <ul className="divide-y divide-slate-700/30 text-sm">
                  {[...
                    clientJobs.filter(j=>j.status!=='Completed').map(j=>({type:'job', id:j.id, label:j.jobNumber, date:j.start, status:j.status})),
                    clientInvoices.filter(i=>i.status==='Unpaid' || i.status==='Sent').map(i=>({
                      type: 'invoice',
                      id: i.id,
                      title: (i && i.invoiceNumber) ? i.invoiceNumber : (i && i.id ? i.id.substring(0,6) : '—'),
                      amount: (i && typeof i.total === 'number') ? i.total : 0,
                      date: (i && (i.issueDate || i.createdAt)) || null,
                      status: i && i.status
                    })),
                    clientQuotes.filter(q=> (q.status==='Draft' || q.status==='Sent' || q.status==='Awaiting Response') && (q.createdAt || q.issueDate) && (q.quoteNumber || q.id)).map(q=>({
                      type: 'quote',
                      id: q.id,
                      title: (q && q.quoteNumber) ? q.quoteNumber : (q && q.id ? q.id.substring(0,6) : '—'),
                      amount: (q && typeof q.total === 'number') ? q.total : 0,
                      date: q && q.createdAt,
                      status: q && q.status
                    }))
                  ].sort((a,b)=> new Date(b.date||0) - new Date(a.date||0)).slice(0,8).filter(it => it.type!=='quote' || !!it.title).map(item => (
                    <li key={`${item.type}-${item.id}`} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-slate-500"/>
                        <span className="font-medium text-slate-100">{item.type==='job' ? (item.label || 'Job') : `${item.type==='invoice'?'Invoice':'Quote'} ${(item.title ?? '—')}`}</span>
                        {item.date && <span className="text-slate-400">• {formatDate(item.date)}</span>}
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]||'bg-midnight text-slate-100'}`}>{item.status}</span>
                      </div>
                      <div>
                        {typeof item.amount==='number' && Number.isFinite(item.amount) && <span className="font-semibold text-slate-100">{formatCurrency(item.amount)}</span>}
                        {item.type==='job' && <button className="ml-3 text-scaffld-teal hover:text-scaffld-teal/80" onClick={()=> onOpenJob && onOpenJob(clientJobs.find(j=>j.id===item.id))}>Open</button>}
                        {item.type==='invoice' && <button className="ml-3 text-scaffld-teal hover:text-scaffld-teal/80" onClick={()=> onOpenInvoice && onOpenInvoice(clientInvoices.find(i=>i.id===item.id))}>Open</button>}
                        {item.type==='quote' && <button className="ml-3 text-scaffld-teal hover:text-scaffld-teal/80" onClick={()=> onOpenQuote && onOpenQuote(clientQuotes.find(q=>q.id===item.id))}>Open</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {overviewTab === 'quotes' && (
                <ul className="divide-y divide-slate-700/30 text-sm">{clientQuotes.map(q => (
                  <li key={q.id} className="py-2 flex items-center justify-between">
                    <div><span className="font-semibold text-scaffld-teal">{q.quoteNumber || q.id.substring(0,6)}</span> <span className="text-slate-400 ml-2">{formatDate(q.createdAt)}</span></div>
                    <div><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>{q.status}</span><button className="ml-3 text-scaffld-teal hover:text-scaffld-teal/80" onClick={()=>onOpenQuote&&onOpenQuote(q)}>Open</button></div>
                  </li>
                ))}</ul>
              )}
              {overviewTab === 'jobs' && (
                <ul className="divide-y divide-slate-700/30 text-sm">{clientJobs.map(j => (
                  <li key={j.id} className="py-2 flex items-center justify-between">
                    <div><span className="font-semibold text-scaffld-teal">{j.jobNumber}</span> <span className="text-slate-400 ml-2">{formatDateTime(j.start)}</span></div>
                    <div><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[j.status]}`}>{j.status}</span><button className="ml-3 text-scaffld-teal hover:text-scaffld-teal/80" onClick={()=>onOpenJob&&onOpenJob(j)}>Open</button></div>
                  </li>
                ))}</ul>
              )}
              {overviewTab === 'invoices' && (
                <ul className="divide-y divide-slate-700/30 text-sm">{clientInvoices.map(i => (
                  <li key={i.id} className="py-2 flex items-center justify-between">
                    <div><span className="font-semibold text-scaffld-teal">{i.invoiceNumber || i.id.substring(0,6)}</span> <span className="text-slate-400 ml-2">{formatDate(i.issueDate || i.createdAt)}</span></div>
                    <div><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[i.status]}`}>{i.status}</span><span className="ml-3 font-semibold text-slate-100">{formatCurrency(i.total)}</span><button className="ml-3 text-scaffld-teal hover:text-scaffld-teal/80" onClick={()=>onOpenInvoice&&onOpenInvoice(i)}>Open</button></div>
                  </li>
                ))}</ul>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-charcoal p-4 rounded-xl shadow border border-slate-700/30 mb-8">
            <h3 className="text-lg font-semibold mb-3 text-slate-100">Schedule</h3>
            {clientJobs.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs scheduled.</p>
            ) : (
              <ul className="divide-y divide-slate-700/30 text-sm">
                {clientJobs.slice().sort((a,b)=> new Date(a.start||0) - new Date(b.start||0)).slice(0,8).map(j => (
                  <li key={j.id} className="py-2 flex items-center justify-between">
                    <div><span className="font-medium text-scaffld-teal">{j.jobNumber}</span>{j.start && <span className="ml-2 text-slate-400">{formatDateTime(j.start)}</span>}</div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[j.status]||'bg-midnight text-slate-100'}`}>{j.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-8">
          <div className="bg-charcoal p-4 rounded-xl shadow border border-slate-700/30">
            <h3 className="text-lg font-semibold mb-3 text-slate-100">Last client communication</h3>
            {clientComms.length === 0 ? (
              <p className="text-sm text-slate-400">No communications found.</p>
            ) : (
              <ul className="divide-y divide-slate-700/30 text-sm">
                {clientComms.map((n)=> (
                  <li key={n.id || n.createdAt} className="py-2">
                    <div className="font-medium text-slate-100">{n.message}</div>
                    <div className="text-slate-400 text-xs">{formatDateTime(n.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-charcoal p-4 rounded-xl shadow border border-slate-700/30">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-slate-100">Billing history</h3>
              <button className="min-h-[44px] text-sm px-3 py-1.5 bg-midnight text-slate-100 rounded hover:bg-midnight/80" onClick={()=>onCollectPayment && onCollectPayment(client)}>New</button>
            </div>
            {billingEntries.length === 0 ? (
              <p className="text-sm text-slate-400">No invoices or payments yet.</p>
            ) : (
              <ul className="divide-y divide-slate-700/30 text-sm">
                {billingEntries.map(e => (
                  <li key={e.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-100">{e.label}</div>
                      <div className="text-xs text-slate-400">{formatDate(e.date)} {e.method?`• ${e.method}`:''} {e.status?`• ${e.status}`:''}</div>
                    </div>
                    <div className={`font-semibold ${e.amount<0?'text-scaffld-teal':'text-slate-100'}`}>{e.amount<0?'-':''}{formatCurrency(Math.abs(e.amount || 0))}</div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 pt-2 border-t border-slate-700/30 text-sm flex items-center justify-between">
              <span className="font-semibold text-slate-100">Current balance</span>
              <span className={`font-bold ${currentBalance>0?'text-signal-coral':'text-scaffld-teal'}`}>{formatCurrency(currentBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy Client Notes removed */}
    </div>
  );
};

export default ClientDetailView;
