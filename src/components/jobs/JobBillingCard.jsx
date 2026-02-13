import React, { useState, useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils';
import { STATUS_COLORS } from '../../constants';

export default function JobBillingCard({ job, invoices, statusColors, onCreateInvoice, onUpdate }) {
  const [billingTab, setBillingTab] = useState('billing');
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderDraft, setReminderDraft] = useState({ name: '', rule: '', nextDate: '' });

  const billingReminders = useMemo(() => job?.billingReminders || [], [job]);
  const jobInvoices = useMemo(() => (invoices || []).filter((inv) => inv.jobId === job.id), [invoices, job]);

  const handleAddReminder = () => {
    if (!reminderDraft.name && !reminderDraft.rule) return;
    const next = [...(job?.billingReminders || []), {
      id: `reminder_${Date.now()}`,
      name: reminderDraft.name || 'Reminder',
      rule: reminderDraft.rule || '',
      nextDate: reminderDraft.nextDate || '',
    }];
    onUpdate(job.id, { billingReminders: next });
    setReminderDraft({ name: '', rule: '', nextDate: '' });
    setShowReminderForm(false);
  };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h3 className="text-xl font-semibold text-slate-100">Billing</h3>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <button className={`${billingTab === 'billing' ? 'text-scaffld-teal border-b-2 border-green-700' : 'text-slate-400'} pb-1`} onClick={() => setBillingTab('billing')}>Billing</button>
            <button className={`${billingTab === 'reminders' ? 'text-scaffld-teal border-b-2 border-green-700' : 'text-slate-400'} pb-1`} onClick={() => setBillingTab('reminders')}>Invoicing Reminders</button>
          </div>
        </div>
        {billingTab === 'billing' ? (
          <button onClick={() => onCreateInvoice && onCreateInvoice(job)} className="px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-green-50">New Invoice</button>
        ) : (
          <button onClick={() => setShowReminderForm((v) => !v)} className="px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-green-50">{showReminderForm ? 'Cancel' : 'New Reminder'}</button>
        )}
      </div>

      {billingTab === 'reminders' ? (
        <>
          {showReminderForm && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <input value={reminderDraft.name} onChange={(e) => setReminderDraft({ ...reminderDraft, name: e.target.value })} placeholder="Reminder name" className="px-3 py-2 border border-slate-700 rounded-md" />
              <input value={reminderDraft.rule} onChange={(e) => setReminderDraft({ ...reminderDraft, rule: e.target.value })} placeholder="Rule (e.g., every 2 visits)" className="px-3 py-2 border border-slate-700 rounded-md" />
              <input type="date" value={reminderDraft.nextDate} onChange={(e) => setReminderDraft({ ...reminderDraft, nextDate: e.target.value })} className="px-3 py-2 border border-slate-700 rounded-md" />
              <div className="flex justify-end">
                <button onClick={handleAddReminder} className="px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Add Reminder</button>
              </div>
            </div>
          )}
          {billingReminders.length === 0 ? (
            <div className="text-sm text-slate-400">No invoice reminders yet. Add reminders to keep billing on track.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {billingReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-semibold text-slate-100">{reminder.name || 'Reminder'}</div>
                    <div className="text-xs text-slate-400">{reminder.rule || ''}</div>
                  </div>
                  <div className="text-sm text-slate-400">{reminder.nextDate ? formatDate(reminder.nextDate) : 'Not scheduled'}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {jobInvoices.length === 0 ? (
            <div className="text-sm text-slate-400">No invoices or reminders. Add a new invoice or reminder to start billing.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 border-b">
                <tr>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Type and number</th>
                  <th className="text-left py-2">Subject</th>
                  <th className="text-left py-2">Last issued</th>
                  <th className="text-left py-2">Due date</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {jobInvoices.map((inv) => {
                  const paidSoFar = Array.isArray(inv.payments) ? inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0) : 0;
                  const balance = inv.status === 'Paid' ? 0 : Math.max(0, (inv.total || 0) - paidSoFar);
                  return (
                    <tr key={inv.id} className="border-b last:border-b-0">
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors?.[inv.status] || STATUS_COLORS[inv.status] || 'bg-midnight text-slate-400'}`}>{inv.status}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-100">{inv.invoiceNumber || inv.id}</td>
                      <td className="py-3 text-slate-400">{inv.subject || 'For Services Rendered'}</td>
                      <td className="py-3 text-slate-400">{formatDate(inv.issueDate || inv.createdAt)}</td>
                      <td className="py-3 text-slate-400">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 text-right font-semibold text-slate-100">{formatCurrency(inv.total || 0)}</td>
                      <td className="py-3 text-right font-semibold text-slate-100">{formatCurrency(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
