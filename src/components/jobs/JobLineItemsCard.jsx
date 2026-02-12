import React, { useState } from 'react';
import { formatCurrency } from '../../utils';

export default function JobLineItemsCard({ job, quote, lineItems, totalPrice, canEditLineItems, onUpdate, onOpenQuote }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ description: '', qty: 1, price: 0, unitCost: 0, note: '' });

  const handleAdd = () => {
    if (!canEditLineItems || !draft.description) return;
    const base = Array.isArray(job?.lineItems) && job.lineItems.length ? job.lineItems : lineItems;
    const next = [...base, {
      description: draft.description,
      qty: Number(draft.qty || 0),
      price: Number(draft.price || 0),
      unitCost: Number(draft.unitCost || 0),
      note: draft.note || '',
    }];
    onUpdate(job.id, { lineItems: next });
    setDraft({ description: '', qty: 1, price: 0, unitCost: 0, note: '' });
    setShowForm(false);
  };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-100">Line Items</h3>
          {quote?.quoteNumber && (
            <div className="text-xs text-slate-400 mt-1">
              From{" "}
              {onOpenQuote ? (
                <button onClick={() => onOpenQuote(quote)} className="text-trellio-teal font-semibold hover:underline">{quote.quoteNumber}</button>
              ) : (
                <span className="text-slate-100 font-semibold">{quote.quoteNumber}</span>
              )}
            </div>
          )}
        </div>
        {canEditLineItems && (
          <button onClick={() => setShowForm((v) => !v)} className="px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-trellio-teal hover:bg-green-50">
            {showForm ? 'Cancel' : 'New Line Item'}
          </button>
        )}
      </div>
      {showForm && canEditLineItems && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className="md:col-span-2 px-3 py-2 border border-slate-700 rounded-md" />
          <input type="number" min="0" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} placeholder="Qty" className="px-3 py-2 border border-slate-700 rounded-md" />
          <input type="number" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price" className="px-3 py-2 border border-slate-700 rounded-md" />
          <input type="number" min="0" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} placeholder="Unit cost" className="px-3 py-2 border border-slate-700 rounded-md" />
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Notes" className="md:col-span-3 px-3 py-2 border border-slate-700 rounded-md" />
          <div className="md:col-span-2 flex justify-end">
            <button onClick={handleAdd} className="px-4 py-2 bg-trellio-teal text-white rounded-md text-sm font-semibold hover:bg-trellio-teal/90">Add Line Item</button>
          </div>
        </div>
      )}
      {lineItems.length === 0 ? (
        <div className="text-sm text-slate-400">No line items yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 border-b">
            <tr>
              <th className="text-left py-2">Product / Service</th>
              <th className="text-right py-2">Quantity</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={`${item.description}-${idx}`} className="border-b last:border-b-0">
                <td className="py-3">
                  <div className="font-semibold text-trellio-teal">{item.description || 'Line item'}</div>
                  {item.note && <div className="text-xs text-slate-400">{item.note}</div>}
                </td>
                <td className="py-3 text-right">{item.qty || 0}</td>
                <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                <td className="py-3 text-right font-semibold">{formatCurrency((Number(item.qty || 0) * Number(item.price || 0)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 text-right font-semibold text-slate-100">{formatCurrency(totalPrice)}</div>
    </div>
  );
}
