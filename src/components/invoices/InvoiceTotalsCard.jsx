import React from 'react';
import { formatCurrency } from '../../utils';

export default function InvoiceTotalsCard({ draft, totals, balanceDue, currencyCode, canEdit, showDiscount, setShowDiscount, updateDraft }) {
  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Totals</h3>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-semibold">{formatCurrency(totals.subtotalBeforeDiscount, currencyCode)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Discount</span>
          <button type="button" onClick={() => setShowDiscount((v) => !v)} className="text-trellio-teal font-semibold underline" disabled={!canEdit}>
            {showDiscount ? 'Hide Discount' : 'Add Discount'}
          </button>
        </div>
        {showDiscount && (
          <div className="flex gap-2">
            <select value={draft.quoteDiscountType || 'amount'} onChange={(e) => updateDraft({ quoteDiscountType: e.target.value })} className="px-2 py-2 border border-slate-700/30 rounded-xl text-sm" disabled={!canEdit}>
              <option value="amount">Amount</option>
              <option value="percent">Percent</option>
            </select>
            <input type="number" step="0.01" value={draft.quoteDiscountValue ?? 0} onChange={(e) => updateDraft({ quoteDiscountValue: e.target.value })} className="flex-1 px-2 py-2 border border-slate-700/30 rounded-xl text-sm" disabled={!canEdit} />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Tax</span>
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" value={draft.taxRate ?? 0} onChange={(e) => updateDraft({ taxRate: e.target.value })} className="w-20 px-2 py-1 border border-slate-700/30 rounded-md text-sm text-right" disabled={!canEdit} />
            <span>%</span>
            <span className="font-semibold">{formatCurrency(totals.taxAmount, currencyCode)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-lg font-semibold border-t pt-3">
          <span>Total</span>
          <span>{formatCurrency(totals.total, currencyCode)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Deposit applied</span>
          <input type="number" step="0.01" value={draft.depositApplied || ''} onChange={(e) => updateDraft({ depositApplied: e.target.value })} className="w-28 px-2 py-1 border border-slate-700/30 rounded-md text-sm text-right" disabled={!canEdit} />
        </div>
        <div className="flex items-center justify-between font-semibold">
          <span>Balance due</span>
          <span>{formatCurrency(balanceDue, currencyCode)}</span>
        </div>
      </div>
    </div>
  );
}
