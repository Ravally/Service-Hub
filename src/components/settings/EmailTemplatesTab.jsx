import React, { useState } from 'react';
import { inputCls, labelCls, saveBtnCls, sectionCls, sectionTitle } from './settingsShared';
import AIAssistButton from '../common/AIAssistButton';
import { aiService } from '../../services/aiService';

const TEMPLATE_GROUPS = [
  { label: 'Invoice Emails', templates: [
    { key: 'invoice', name: 'Invoice', subjectKey: 'invoiceSubject', bodyKey: 'invoiceBody' },
    { key: 'invoiceReminder', name: 'Reminder', subjectKey: 'invoiceReminderSubject', bodyKey: 'invoiceReminderBody' },
    { key: 'overdueInvoice', name: 'Overdue', subjectKey: 'overdueInvoiceSubject', bodyKey: 'overdueInvoiceBody' },
  ]},
  { label: 'Quote Emails', templates: [
    { key: 'quote', name: 'Quote', subjectKey: 'quoteSubject', bodyKey: 'quoteBody' },
    { key: 'quoteFollowup', name: 'Follow-up', subjectKey: 'quoteFollowupSubject', bodyKey: 'quoteFollowupBody' },
  ]},
  { label: 'Other Templates', templates: [
    { key: 'appointmentReminder', name: 'Appointment Reminder', subjectKey: 'appointmentReminderSubject', bodyKey: 'appointmentReminderBody' },
    { key: 'jobCompletion', name: 'Job Completion', subjectKey: 'jobCompletionSubject', bodyKey: 'jobCompletionBody' },
    { key: 'bookingConfirmation', name: 'Booking Confirmation', subjectKey: 'bookingConfirmationSubject', bodyKey: 'bookingConfirmationBody' },
    { key: 'reviewRequest', name: 'Review Request', subjectKey: 'reviewRequestSubject', bodyKey: 'reviewRequestBody' },
  ]},
];

const PLACEHOLDERS = [
  { tag: '{{clientName}}', desc: 'Client name' },
  { tag: '{{companyName}}', desc: 'Your company' },
  { tag: '{{documentNumber}}', desc: 'Doc number' },
  { tag: '{{total}}', desc: 'Total amount' },
  { tag: '{{amountDue}}', desc: 'Amount due' },
  { tag: '{{dueDate}}', desc: 'Due date' },
  { tag: '{{daysOverdue}}', desc: 'Days overdue' },
  { tag: '{{paymentLink}}', desc: 'Payment link' },
  { tag: '{{approvalLink}}', desc: 'Approval link' },
  { tag: '{{appointmentDate}}', desc: 'Appointment date' },
  { tag: '{{appointmentTime}}', desc: 'Appointment time' },
  { tag: '{{jobTitle}}', desc: 'Job title' },
];

function TemplateCard({ name, subject, body, expanded, onToggle, onChangeSubject, onChangeBody, onAiGenerate, aiLoading }) {
  return (
    <div className="border border-slate-700/30 rounded-lg mb-2 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-midnight/40 transition-colors"
      >
        <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-slate-100">{name}</span>
        {!expanded && (
          <span className="text-sm text-slate-500 truncate ml-auto">{subject}</span>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/20">
          <div className="pt-3">
            <label className={labelCls}>Subject</label>
            <input type="text" value={subject} onChange={onChangeSubject} className={inputCls} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`${labelCls} mb-0`}>Body</label>
              <AIAssistButton label="Generate with AI" onClick={onAiGenerate} loading={aiLoading} />
            </div>
            <textarea rows={6} value={body} onChange={onChangeBody} className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailTemplatesTab({ emailTemplates, setEmailTemplates, handleSaveEmailTemplates }) {
  const [expanded, setExpanded] = useState(null);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [copiedTag, setCopiedTag] = useState(null);
  const [aiLoadingKey, setAiLoadingKey] = useState(null);

  const set = (updates) => setEmailTemplates({ ...emailTemplates, ...updates });

  const toggle = (key) => setExpanded((prev) => (prev === key ? null : key));

  const copyPlaceholder = async (tag) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 1200);
    } catch { /* clipboard not available */ }
  };

  const handleAiGenerate = async (tpl) => {
    setAiLoadingKey(tpl.key);
    try {
      const prompt = `Write a ${tpl.name.toLowerCase()} email template for a field service business. Use these placeholders where appropriate: {{clientName}}, {{companyName}}, {{documentNumber}}, {{total}}, {{dueDate}}, {{paymentLink}}, {{approvalLink}}, {{jobTitle}}. Keep it warm but professional, 3-4 short paragraphs.`;
      const result = await aiService.draftEmail(prompt, { templateType: tpl.name });
      set({ [tpl.bodyKey]: result });
    } catch {
      // Silently fail — user can try again
    } finally {
      setAiLoadingKey(null);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Email Templates</h3>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowPlaceholders((p) => !p)}
          className="flex items-center gap-2 text-sm text-scaffld-teal hover:text-scaffld-teal/80 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showPlaceholders ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Available Placeholders
        </button>
        {showPlaceholders && (
          <div className="mt-2 p-3 bg-midnight/60 rounded-lg border border-slate-700/20">
            <p className="text-xs text-slate-400 mb-2">Click to copy a placeholder to your clipboard.</p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map(({ tag, desc }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => copyPlaceholder(tag)}
                  title={desc}
                  className={`px-2 py-1 rounded text-xs border transition-all cursor-pointer ${
                    copiedTag === tag
                      ? 'bg-scaffld-teal/20 border-scaffld-teal text-scaffld-teal'
                      : 'bg-midnight border-slate-700 text-slate-300 hover:border-scaffld-teal hover:text-scaffld-teal'
                  }`}
                >
                  {copiedTag === tag ? 'Copied!' : tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveEmailTemplates}>
        {TEMPLATE_GROUPS.map((group) => (
          <div key={group.label} className={sectionCls}>
            <h4 className={sectionTitle}>{group.label}</h4>
            {group.templates.map((tpl) => (
              <TemplateCard
                key={tpl.key}
                name={tpl.name}
                subject={emailTemplates[tpl.subjectKey] || ''}
                body={emailTemplates[tpl.bodyKey] || ''}
                expanded={expanded === tpl.key}
                onToggle={() => toggle(tpl.key)}
                onChangeSubject={(e) => set({ [tpl.subjectKey]: e.target.value })}
                onChangeBody={(e) => set({ [tpl.bodyKey]: e.target.value })}
                onAiGenerate={() => handleAiGenerate(tpl)}
                aiLoading={aiLoadingKey === tpl.key}
              />
            ))}
          </div>
        ))}

        <div className="text-right">
          <button type="submit" className={saveBtnCls}>Save All Email Templates</button>
        </div>
      </form>
    </div>
  );
}
