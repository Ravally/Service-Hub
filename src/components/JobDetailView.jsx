import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, DollarSignIcon } from './icons';
import { formatCurrency } from '../utils';
import JobInfoCard from './jobs/JobInfoCard';
import JobLineItemsCard from './jobs/JobLineItemsCard';
import JobLabourCard from './jobs/JobLabourCard';
import JobVisitsCard from './jobs/JobVisitsCard';
import JobBillingCard from './jobs/JobBillingCard';
import JobActivityCards from './jobs/JobActivityCards';

export default function JobDetailView({
  job, client, quote, invoices = [], visits,
  onBack, onUpdate, getClientNameById, statusColors,
  staff = [], onOpenClient, onUploadAttachment, onRemoveAttachment,
  onCreateInvoice, onOpenQuote, backLabel = 'Back to schedule', userRole,
}) {
  const [showProfit, setShowProfit] = useState(true);

  const lineItems = useMemo(() => {
    if (Array.isArray(job?.lineItems) && job.lineItems.length) return job.lineItems;
    if (Array.isArray(quote?.lineItems) && quote.lineItems.length) return quote.lineItems;
    return [];
  }, [job, quote]);

  const laborEntries = useMemo(() => job?.laborEntries || job?.labor || job?.timeEntries || [], [job]);
  const expenseEntries = useMemo(() => job?.expenses || [], [job]);

  const profitability = useMemo(() => {
    const totalPrice = lineItems.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.price || 0)), 0);
    const lineItemCost = lineItems.reduce((s, it) => s + (Number(it.unitCost || it.cost || 0) * Number(it.qty || 1)), 0);
    const laborCost = laborEntries.reduce((s, it) => s + Number(it.cost || it.amount || 0), 0);
    const expenseCost = expenseEntries.reduce((s, it) => s + Number(it.amount || it.cost || 0), 0);
    const profit = totalPrice - lineItemCost - laborCost - expenseCost;
    const margin = totalPrice ? (profit / totalPrice) * 100 : 0;
    return { totalPrice, lineItemCost, laborCost, expenseCost, profit, margin };
  }, [lineItems, laborEntries, expenseEntries]);

  const profitRingPct = Math.max(0, Math.min(100, Math.round(profitability.margin)));
  const ringStyle = { background: `conic-gradient(#16a34a ${profitRingPct}%, #e2e8f0 0)` };
  const canEditLineItems = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-100">
          <ChevronLeftIcon />
          {backLabel}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {onCreateInvoice && (
            <button onClick={() => onCreateInvoice(job)} className="px-4 py-2 rounded-lg bg-trellio-teal text-white text-sm font-semibold hover:bg-trellio-teal/90 inline-flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Generate Invoice
            </button>
          )}
          <button className="px-4 py-2 rounded-lg bg-trellio-teal text-white text-sm font-semibold hover:bg-trellio-teal/90">Text Booking Confirmation</button>
          <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-100 text-sm font-semibold hover:bg-midnight">More Actions</button>
        </div>
      </div>

      <JobInfoCard job={job} client={client} staff={staff} statusColors={statusColors} onUpdate={onUpdate} onOpenClient={onOpenClient} getClientNameById={getClientNameById} />

      {/* Profitability */}
      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-5">
        <button onClick={() => setShowProfit((v) => !v)} className="text-sm font-semibold text-slate-100">
          {showProfit ? 'Hide Profitability' : 'Show Profitability'}
        </button>
        {showProfit && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_2fr_auto] gap-6 items-center">
            <div>
              <div className="text-2xl font-bold text-slate-100">{profitability.margin.toFixed(2)}%</div>
              <div className="text-sm text-slate-400">Profit margin</div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-100">
              <div><div className="text-xs uppercase text-slate-400">Total price</div><div className="font-semibold">{formatCurrency(profitability.totalPrice)}</div></div>
              <div><div className="text-xs uppercase text-slate-400">Line item cost</div><div className="font-semibold">-{formatCurrency(profitability.lineItemCost)}</div></div>
              <div><div className="text-xs uppercase text-slate-400">Labour</div><div className="font-semibold">-{formatCurrency(profitability.laborCost)}</div></div>
              <div><div className="text-xs uppercase text-slate-400">Expenses</div><div className="font-semibold">-{formatCurrency(profitability.expenseCost)}</div></div>
              <div><div className="text-xs uppercase text-slate-400">Profit</div><div className="font-semibold">{formatCurrency(profitability.profit)}</div></div>
            </div>
            <div className="flex justify-end">
              <div className="relative h-12 w-12 rounded-full" style={ringStyle}>
                <div className="absolute inset-2 bg-amber-50/80 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      <JobLineItemsCard job={job} quote={quote} lineItems={lineItems} totalPrice={profitability.totalPrice} canEditLineItems={canEditLineItems} onUpdate={onUpdate} onOpenQuote={onOpenQuote} />
      <JobLabourCard job={job} staff={staff} laborEntries={laborEntries} onUpdate={onUpdate} />
      <JobVisitsCard job={job} staff={staff} visits={visits} onUpdate={onUpdate} />
      <JobBillingCard job={job} invoices={invoices} statusColors={statusColors} onCreateInvoice={onCreateInvoice} onUpdate={onUpdate} />
      <JobActivityCards job={job} userRole={userRole} onUpdate={onUpdate} onUploadAttachment={onUploadAttachment} onRemoveAttachment={onRemoveAttachment} />
    </div>
  );
}
