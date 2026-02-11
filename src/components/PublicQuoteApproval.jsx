// src/components/PublicQuoteApproval.jsx
import React, { useState, useMemo } from 'react';
import { formatCurrency, computeTotals } from '../utils';

const PublicQuoteApproval = ({ quote, client, company, onApprove, onDecline, message, error }) => {
  const [name, setName] = useState('');

  const totals = useMemo(() => {
    if (!quote) return { subtotal: 0, tax: 0, total: 0, taxRate: 0 };
    const computed = computeTotals(quote);
    return {
      subtotal: computed.afterAllDiscounts,
      tax: computed.taxAmount,
      total: computed.total,
      taxRate: parseFloat(quote.taxRate || 0)
    };
  }, [quote]);

  if (!quote) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <div className="bg-charcoal rounded-xl shadow-lg p-6 border border-slate-700/30 max-w-lg w-full text-center">
          <p className="text-slate-100">Loading quote…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
      <div className="bg-charcoal rounded-xl shadow-lg p-6 md:p-8 border border-slate-700/30 max-w-2xl w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">{company?.name || 'Your Company'}</h1>
          <p className="text-slate-400">Quote {quote.quoteNumber || `#${(quote.id || '').substring(0,6)}…`}</p>
        </div>

        <div className="mb-4">
          <p className="text-lg text-slate-100">To: <span className="font-semibold">{client?.name || 'Client'}</span></p>
          <p className="text-sm text-slate-400">{client?.email}</p>
        </div>

        <div className="mb-6">
          <table className="w-full">
            <thead className="bg-midnight">
              <tr>
                <th className="text-left font-semibold p-2">Description</th>
                <th className="text-center font-semibold p-2">Qty</th>
                <th className="text-right font-semibold p-2">Price</th>
                <th className="text-right font-semibold p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(quote.lineItems || []).map((it, idx) => {
                const itemType = it?.type || 'line_item';
                if (itemType === 'text') {
                  return (
                    <tr key={idx} className="border-b">
                      <td className="p-2" colSpan={4}>{it.description || it.name || 'Text'}</td>
                    </tr>
                  );
                }
                const lineTotal = (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0);
                return (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{it.name || it.description}</td>
                    <td className="text-center p-2">{it.qty}</td>
                    <td className="text-right p-2">{formatCurrency(it.price || 0)}</td>
                    <td className="text-right p-2">{formatCurrency(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <div className="w-full max-w-sm space-y-1">
              <div className="flex justify-between text-sm"><span>GST ({totals.taxRate}%)</span><span>{formatCurrency(totals.tax)}</span></div>
              <div className="flex justify-between text-xl font-bold border-t-2 pt-2"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-4 p-3 rounded ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {error || message}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-1">Your Name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Type your full name" className="w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm"/>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => onDecline && onDecline(name)} className="px-4 py-2 text-sm font-semibold text-slate-100 bg-gray-100 rounded-lg hover:bg-gray-200">Decline</button>
            <button onClick={() => onApprove && onApprove(name)} className="px-4 py-2 text-sm font-semibold text-white bg-trellio-teal rounded-lg hover:bg-green-700">Approve</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PublicQuoteApproval;
