import React, { useState, useMemo } from 'react';
import { formatCurrency, formatDate, toIsoDate } from '../../utils';
import { buildPaymentSchedule, refreshInstallmentStatuses } from '../../utils/calculations';
import { PAYMENT_PLAN_FREQUENCIES, PAYMENT_PLAN_LIMITS } from '../../constants/invoiceDefaults';

export default function PaymentPlanCard({
  invoice, balanceDue, currencyCode, canEdit,
  onSetupPlan, onRecordInstallment, onRemovePlan,
}) {
  const plan = invoice.paymentPlan;
  const isActive = plan?.enabled && plan?.schedule?.length > 0;

  const [showSetup, setShowSetup] = useState(false);
  const [installments, setInstallments] = useState(3);
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState('');

  const preview = useMemo(() => {
    if (!showSetup || !startDate || !balanceDue) return [];
    return buildPaymentSchedule(balanceDue, installments, frequency, toIsoDate(startDate));
  }, [showSetup, startDate, balanceDue, installments, frequency]);

  const liveSchedule = useMemo(() => {
    if (!isActive) return [];
    return refreshInstallmentStatuses(plan.schedule);
  }, [isActive, plan?.schedule]);

  const handleCreate = () => {
    if (!startDate || balanceDue <= 0) return;
    onSetupPlan({ installments, frequency, startDate: toIsoDate(startDate), planTotal: balanceDue });
    setShowSetup(false);
  };

  const handleMarkPaid = (idx) => {
    const inst = liveSchedule[idx];
    if (!inst || inst.status === 'paid') return;
    onRecordInstallment(idx, { amount: inst.amount, method: 'Recorded' });
  };

  if (!isActive) {
    return (
      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-100">Payment Plan</h3>
          {canEdit && !showSetup && balanceDue > 0 && (
            <button onClick={() => setShowSetup(true)} className="text-sm font-semibold text-scaffld-teal underline">
              Set Up Plan
            </button>
          )}
        </div>
        {!showSetup && (
          <p className="text-sm text-slate-400">No payment plan configured. Split the balance into scheduled installments.</p>
        )}
        {showSetup && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-100">Installments</span>
              <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                className="px-2 py-1 border border-slate-700/30 rounded-md bg-midnight text-slate-100">
                {Array.from(
                  { length: PAYMENT_PLAN_LIMITS.maxInstallments - PAYMENT_PLAN_LIMITS.minInstallments + 1 },
                  (_, i) => i + PAYMENT_PLAN_LIMITS.minInstallments
                ).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-100">Frequency</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                className="px-2 py-1 border border-slate-700/30 rounded-md bg-midnight text-slate-100">
                {PAYMENT_PLAN_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-100">First payment</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-700/30 rounded-md bg-midnight text-slate-100" />
            </div>
            {preview.length > 0 && (
              <div className="border-t border-slate-700/30 pt-3 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview</div>
                {preview.map((inst, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-100">#{i + 1} - {formatDate(inst.dueDate)}</span>
                    <span className="font-semibold text-slate-100">{formatCurrency(inst.amount, currencyCode)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowSetup(false)}
                className="px-3 py-2 rounded-md border border-slate-700 text-sm font-semibold text-slate-100">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!startDate || balanceDue <= 0}
                className="px-3 py-2 rounded-md bg-scaffld-teal text-white text-sm font-semibold hover:bg-scaffld-teal/90 disabled:opacity-50">
                Create Plan
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const paidCount = liveSchedule.filter(s => s.status === 'paid').length;
  const totalCount = liveSchedule.length;
  const statusColors = { pending: 'text-harvest-amber', paid: 'text-scaffld-teal', overdue: 'text-signal-coral' };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-100">
          Payment Plan
          <span className="ml-2 text-xs font-normal text-slate-400">{paidCount}/{totalCount} paid</span>
        </h3>
        {canEdit && (
          <button onClick={() => { if (window.confirm('Remove this payment plan? Existing payments will be preserved.')) onRemovePlan(); }}
            className="text-xs font-semibold text-signal-coral">
            Remove Plan
          </button>
        )}
      </div>
      <div className="w-full h-2 bg-midnight rounded-full mb-3">
        <div className="h-2 bg-scaffld-teal rounded-full transition-all" style={{ width: `${(paidCount / totalCount) * 100}%` }} />
      </div>
      <div className="space-y-1">
        {liveSchedule.map((inst, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/20 last:border-0">
            <div>
              <div className="text-sm text-slate-100">#{i + 1} - {formatDate(inst.dueDate)}</div>
              <div className={`text-xs font-semibold ${statusColors[inst.status] || 'text-slate-400'}`}>
                {inst.status === 'paid' ? `Paid ${formatDate(inst.paidAt)}` : inst.status === 'overdue' ? 'Overdue' : 'Pending'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-100">{formatCurrency(inst.amount, currencyCode)}</span>
              {canEdit && inst.status !== 'paid' && (
                <button onClick={() => handleMarkPaid(i)}
                  className="px-2 py-1 rounded-md bg-scaffld-teal/10 text-scaffld-teal text-xs font-semibold min-h-[44px] min-w-[44px]">
                  Mark Paid
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {plan.nextPaymentDate && paidCount < totalCount && (
        <div className="mt-3 text-xs text-slate-400">Next payment due: {formatDate(plan.nextPaymentDate)}</div>
      )}
    </div>
  );
}
