// src/components/PublicQuoteApproval.jsx
import React, { useState, useMemo } from 'react';
import { formatCurrency, computeTotals } from '../utils';

const PublicQuoteApproval = ({ quote, client, company, uid, onApprove, onDecline, message, error }) => {
  const [name, setName] = useState('');
  const [depositStep, setDepositStep] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const depositPaid = params.get('depositPaid') === '1';

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

  const requiredDeposit = useMemo(() => {
    if (!quote) return 0;
    if (quote.depositRequiredAmount) return parseFloat(quote.depositRequiredAmount);
    if (quote.depositRequiredPercent) return totals.total * (parseFloat(quote.depositRequiredPercent) / 100);
    return 0;
  }, [quote, totals.total]);

  const hasDeposit = requiredDeposit > 0 && !quote?.depositCollected && !depositPaid;

  const handleApprove = async () => {
    if (onApprove) await onApprove(name);
    if (hasDeposit) setDepositStep(true);
  };

  const handlePayDeposit = async () => {
    setDepositLoading(true);
    try {
      const base = import.meta.env?.VITE_FUNCTIONS_BASE_URL;
      if (!base) { alert('Payment not available at this time.'); return; }
      const depositAmtCents = Math.round(requiredDeposit * 100);
      const quoteToken = params.get('quoteToken');
      const res = await fetch(`${base.replace(/\/$/, '')}/api/createDepositCheckoutSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid, quoteId: quote.id, depositAmount: depositAmtCents,
          successUrl: `${window.location.origin}?quoteToken=${encodeURIComponent(quoteToken)}&depositPaid=1`,
          cancelUrl: window.location.href,
        }),
      });
      if (!res.ok) throw new Error('Failed to create payment session');
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      console.error('Deposit payment error:', err);
      alert('Unable to process deposit payment. Please contact the business.');
    } finally {
      setDepositLoading(false);
    }
  };

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
              {requiredDeposit > 0 && (
                <div className="flex justify-between text-sm text-scaffld-teal pt-1">
                  <span>Deposit required</span>
                  <span>{formatCurrency(requiredDeposit)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-4 p-3 rounded ${error ? 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30' : 'bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/30'}`}>
            {error || message}
          </div>
        )}

        {/* Deposit paid confirmation */}
        {depositPaid && (
          <div className="mb-4 p-4 rounded-lg bg-scaffld-teal/10 border border-scaffld-teal/30">
            <p className="text-scaffld-teal font-semibold">Deposit of {formatCurrency(requiredDeposit)} collected successfully!</p>
            <p className="text-sm text-slate-400 mt-1">Thank you for your payment. We will be in touch shortly.</p>
          </div>
        )}

        {/* Deposit payment step */}
        {depositStep && !depositPaid && !message && (
          <div className="mb-4 p-4 rounded-lg bg-midnight border border-slate-700/30">
            <p className="text-slate-100 font-semibold mb-2">Quote Approved — Deposit Payment</p>
            <p className="text-sm text-slate-400 mb-4">
              A deposit of <span className="text-scaffld-teal font-semibold">{formatCurrency(requiredDeposit)}</span> is required to secure your booking.
            </p>
            <button
              onClick={handlePayDeposit}
              disabled={depositLoading}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-scaffld-teal rounded-lg hover:bg-scaffld-teal/80 disabled:opacity-50 min-h-[44px]"
            >
              {depositLoading ? 'Redirecting to payment…' : `Pay Deposit — ${formatCurrency(requiredDeposit)}`}
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">Secure payment powered by Stripe</p>
          </div>
        )}

        {/* Approval form (hide after deposit step or when already approved/paid) */}
        {!depositStep && !depositPaid && !message && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1">Your Name</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Type your full name" className="w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-midnight text-slate-100"/>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => onDecline && onDecline(name)} className="px-4 py-2 text-sm font-semibold text-slate-100 bg-midnight rounded-lg hover:bg-slate-700 min-h-[44px]">Decline</button>
              <button onClick={handleApprove} className="px-4 py-2 text-sm font-semibold text-white bg-scaffld-teal rounded-lg hover:bg-scaffld-teal/80 min-h-[44px]">Approve</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PublicQuoteApproval;
