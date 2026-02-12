import React from 'react';
import { toDateInput } from '../../utils';

export function InvoiceDetailsCard({ draft, canEdit, customFields, handleIssueDateChange, handleDueTermChange, addCustomField, updateCustomField, removeCustomField, updateDraft }) {
  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Invoice details</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Issued date</span>
          <input type="date" value={toDateInput(draft.issueDate || draft.createdAt)} onChange={(e) => handleIssueDateChange(e.target.value)} className="px-2 py-1 border border-slate-700/30 rounded-md text-sm" disabled={!canEdit} />
        </div>
        <div className="flex items-center justify-between">
          <span>Payment due</span>
          <select value={draft.dueTerm || 'Due Today'} onChange={(e) => handleDueTermChange(e.target.value)} className="px-2 py-1 border border-slate-700/30 rounded-md text-sm" disabled={!canEdit}>
            <option>Due Today</option><option>Due on receipt</option><option>Net 7</option><option>Net 9</option><option>Net 14</option><option>Net 15</option><option>Net 30</option><option>Net 60</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span>Ask client for review</span>
          <select value={draft.askForReview ? 'Yes' : 'No'} onChange={(e) => updateDraft({ askForReview: e.target.value === 'Yes' })} className="px-2 py-1 border border-slate-700/30 rounded-md text-sm" disabled={!canEdit}>
            <option value="Yes">Yes</option><option value="No">No</option>
          </select>
        </div>
        <button type="button" onClick={addCustomField} className="px-3 py-2 rounded-md border border-green-200 text-trellio-teal text-sm font-semibold" disabled={!canEdit}>Add Custom Field</button>
        {customFields.map((field, idx) => (
          <div key={`${field.key}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input value={field.key} onChange={(e) => updateCustomField(idx, 'key', e.target.value)} placeholder="Field" className="px-2 py-1 border border-slate-700/30 rounded-md text-sm" disabled={!canEdit} />
            <input value={field.value} onChange={(e) => updateCustomField(idx, 'value', e.target.value)} placeholder="Value" className="px-2 py-1 border border-slate-700/30 rounded-md text-sm" disabled={!canEdit} />
            {canEdit && <button onClick={() => removeCustomField(idx)} className="text-xs font-semibold text-signal-coral">Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientViewCard({ draft, canEdit, showClientView, setShowClientView, updateDraft }) {
  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-slate-100">Client view</span>
        <button type="button" onClick={() => setShowClientView((v) => !v)} className="text-sm font-semibold text-trellio-teal underline">
          {showClientView ? 'Cancel' : 'Change'}
        </button>
      </div>
      {showClientView && (
        <div className="mt-3 text-sm text-slate-100 space-y-3">
          <div>Adjust what your client will see on this invoice. To change the default for all future invoices, visit the <span className="text-trellio-teal underline">PDF Style</span>.</div>
          <div className="flex flex-wrap gap-4">
            {[['showQuantities', 'Quantities'], ['showUnitCosts', 'Unit costs'], ['showLineItemTotals', 'Line item totals'], ['showTotals', 'Totals'], ['showAccountBalance', 'Account balance'], ['showLateStamp', 'Late stamp']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.clientViewSettings?.[key] !== false} onChange={(e) => updateDraft({ clientViewSettings: { ...draft.clientViewSettings, [key]: e.target.checked } })} className="h-4 w-4 accent-green-600" disabled={!canEdit} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PaymentSettingsCard({ draft, canEdit, updateDraft }) {
  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-3">Invoice Payment Settings</h3>
      <div className="text-sm text-slate-400 mb-3">Disabling payment options on this invoice will not change your default payment preferences.</div>
      <div className="space-y-2 text-sm text-slate-100">
        <label className="flex items-center justify-between gap-3"><span>Accept card payments</span><input type="checkbox" checked={draft.paymentSettings?.acceptCard ?? true} onChange={(e) => updateDraft({ paymentSettings: { ...draft.paymentSettings, acceptCard: e.target.checked } })} disabled={!canEdit} /></label>
        <label className="flex items-center justify-between gap-3"><span>Accept bank payments (ACH)</span><input type="checkbox" checked={draft.paymentSettings?.acceptBank ?? false} onChange={(e) => updateDraft({ paymentSettings: { ...draft.paymentSettings, acceptBank: e.target.checked } })} disabled={!canEdit} /></label>
        <label className="flex items-center justify-between gap-3"><span>Allow partial payments</span><input type="checkbox" checked={draft.paymentSettings?.allowPartialPayments ?? true} onChange={(e) => updateDraft({ paymentSettings: { ...draft.paymentSettings, allowPartialPayments: e.target.checked } })} disabled={!canEdit} /></label>
      </div>
    </div>
  );
}

export function InternalNotesCard({ draft, canEdit, updateDraft, onUploadAttachment, onRemoveAttachment }) {
  const handleAttachmentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadAttachment) return;
    onUploadAttachment(draft, file);
    event.target.value = '';
  };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-5 space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">Internal notes & attachments</h3>
      <textarea value={draft.internalNotes || ''} onChange={(e) => updateDraft({ internalNotes: e.target.value })} className="w-full px-3 py-2 border border-slate-700 rounded-md text-sm" rows={4} placeholder="Note details" disabled={!canEdit} />
      <div className="border-2 border-dashed border-slate-700/30 rounded-2xl p-4 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2">
          <span>Drag your files here or</span>
          <label className="text-trellio-teal font-semibold cursor-pointer">
            Select a File
            <input type="file" className="hidden" onChange={handleAttachmentUpload} disabled={!canEdit} />
          </label>
        </div>
      </div>
      {(draft.attachments || []).length > 0 && (
        <ul className="space-y-2 text-sm">
          {(draft.attachments || []).map((file, idx) => (
            <li key={`${file.url}-${idx}`} className="flex items-center justify-between border border-slate-700/30 rounded-md px-3 py-2">
              <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline truncate">{file.name}</a>
              {canEdit && <button onClick={() => onRemoveAttachment && onRemoveAttachment(draft, file.url)} className="text-xs text-signal-coral font-semibold">Remove</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
