import React from 'react';
import { inputCls, labelCls, saveBtnCls, sectionCls } from './settingsShared';

export default function EmailTemplatesTab({ emailTemplates, setEmailTemplates, handleSaveEmailTemplates }) {
  const set = (updates) => setEmailTemplates({ ...emailTemplates, ...updates });

  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Email Templates</h3>
      <form onSubmit={handleSaveEmailTemplates} className={sectionCls}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 text-trellio-teal">Invoice Emails</h4>
            <div className="mb-4"><label className={labelCls}>Invoice Subject</label><input type="text" value={emailTemplates.invoiceSubject} onChange={e => set({ invoiceSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Invoice Body</label><textarea rows={5} value={emailTemplates.invoiceBody} onChange={e => set({ invoiceBody: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Reminder Subject</label><input type="text" value={emailTemplates.invoiceReminderSubject} onChange={e => set({ invoiceReminderSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Reminder Body</label><textarea rows={5} value={emailTemplates.invoiceReminderBody} onChange={e => set({ invoiceReminderBody: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Overdue Subject</label><input type="text" value={emailTemplates.overdueInvoiceSubject} onChange={e => set({ overdueInvoiceSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Overdue Body</label><textarea rows={5} value={emailTemplates.overdueInvoiceBody} onChange={e => set({ overdueInvoiceBody: e.target.value })} className={inputCls} /></div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-trellio-teal">Quote Emails</h4>
            <div className="mb-4"><label className={labelCls}>Quote Subject</label><input type="text" value={emailTemplates.quoteSubject} onChange={e => set({ quoteSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Quote Body</label><textarea rows={5} value={emailTemplates.quoteBody} onChange={e => set({ quoteBody: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Follow-up Subject</label><input type="text" value={emailTemplates.quoteFollowupSubject} onChange={e => set({ quoteFollowupSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Follow-up Body</label><textarea rows={5} value={emailTemplates.quoteFollowupBody} onChange={e => set({ quoteFollowupBody: e.target.value })} className={inputCls} /></div>
            <h4 className="font-semibold mb-3 mt-6 text-trellio-teal">Other Templates</h4>
            <div className="mb-4"><label className={labelCls}>Appointment Reminder Subject</label><input type="text" value={emailTemplates.appointmentReminderSubject} onChange={e => set({ appointmentReminderSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Appointment Reminder Body</label><textarea rows={5} value={emailTemplates.appointmentReminderBody} onChange={e => set({ appointmentReminderBody: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Job Completion Subject</label><input type="text" value={emailTemplates.jobCompletionSubject} onChange={e => set({ jobCompletionSubject: e.target.value })} className={inputCls} /></div>
            <div className="mb-4"><label className={labelCls}>Job Completion Body</label><textarea rows={5} value={emailTemplates.jobCompletionBody} onChange={e => set({ jobCompletionBody: e.target.value })} className={inputCls} /></div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-midnight/60 rounded-lg border border-slate-700/20">
          <p className="text-sm font-semibold text-slate-200 mb-2">Available Placeholders:</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
            <div>{'{{clientName}}'} - Client name</div><div>{'{{companyName}}'} - Your company</div>
            <div>{'{{documentNumber}}'} - Doc number</div><div>{'{{total}}'} - Total amount</div>
            <div>{'{{amountDue}}'} - Amount due</div><div>{'{{dueDate}}'} - Due date</div>
            <div>{'{{daysOverdue}}'} - Days overdue</div><div>{'{{paymentLink}}'} - Payment link</div>
            <div>{'{{approvalLink}}'} - Approval link</div><div>{'{{appointmentDate}}'} - Appointment date</div>
            <div>{'{{appointmentTime}}'} - Appointment time</div><div>{'{{jobTitle}}'} - Job title</div>
          </div>
        </div>
        <div className="mt-4 text-right"><button type="submit" className={saveBtnCls}>Save All Email Templates</button></div>
      </form>
    </div>
  );
}
