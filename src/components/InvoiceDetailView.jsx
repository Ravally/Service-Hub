// src/components/InvoiceDetailView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, InvoiceIcon, PrinterIcon } from './icons';
import { formatCurrency, formatDate, toDateInput, toIsoDate } from '../utils';
import { computeDueDate, computeTotals } from '../utils';
import { STATUS_COLORS } from '../constants';
import { hasPermission } from '../utils';
import InvoiceLineItemsCard from './invoices/InvoiceLineItemsCard';
import InvoiceTotalsCard from './invoices/InvoiceTotalsCard';
import { InvoiceDetailsCard, ClientViewCard, PaymentSettingsCard, InternalNotesCard } from './invoices/InvoiceSidebarCards';
import PaymentPlanCard from './invoices/PaymentPlanCard';
import CustomFieldEditor from './common/CustomFieldEditor';
import AIRewriteButtons from './common/AIRewriteButtons';

const buildLineItem = (opts = {}) => ({
  type: 'line_item',
  name: '',
  description: '',
  qty: 1,
  price: 0,
  unitCost: 0,
  isOptional: false,
  serviceDate: '',
  ...opts,
});

export default function InvoiceDetailView({
  invoice,
  client,
  company,
  onBack,
  onUpdateStatus,
  onUpdateFields,
  onCreateInvoice,
  onSend,
  onPrint,
  onGeneratePaymentLink,
  onUploadAttachment,
  onRemoveAttachment,
  onApplyInvoiceDefaults,
  onOpenClient,
  onSyncInvoice,
  onSetupPaymentPlan,
  onRecordInstallmentPayment,
  onRemovePaymentPlan,
  userRole,
  defaultTaxRate,
  stripeEnabled,
  accountingConnected,
  mode = 'view',
}) {
  const canEdit = hasPermission(userRole, 'edit.invoice');
  const isCreate = mode === 'create';
  const [draft, setDraft] = useState({ ...invoice, lineItems: invoice.lineItems || [] });
  const [showClientView, setShowClientView] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [applyDefaults, setApplyDefaults] = useState(false);
  const [editingNumber, setEditingNumber] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [contactSnapshot, setContactSnapshot] = useState(null);

  useEffect(() => {
    setDraft({
      ...invoice,
      lineItems: invoice.lineItems || [],
      taxRate: invoice.taxRate ?? defaultTaxRate ?? 0,
      clientViewSettings: invoice.clientViewSettings || company?.invoiceClientViewSettings || {
        showQuantities: true,
        showUnitCosts: true,
        showLineItemTotals: true,
        showTotals: true,
        showAccountBalance: true,
        showLateStamp: false,
      },
      paymentSettings: invoice.paymentSettings || company?.invoicePaymentSettings || {
        acceptCard: true,
        acceptBank: false,
        allowPartialPayments: true,
      },
      contractTerms: invoice.contractTerms ?? company?.invoiceContractTerms ?? '',
      disclaimers: invoice.disclaimers ?? company?.invoiceDisclaimers ?? '',
      clientMessage: invoice.clientMessage ?? company?.invoiceMessage ?? '',
    });
    setShowClientView(false);
    setShowDiscount(false);
    setApplyDefaults(false);
    setEditingNumber(false);
    setEditingContact(false);
    setContactSnapshot(null);
  }, [invoice, company, defaultTaxRate]);

  const totals = useMemo(() => computeTotals(draft), [draft]);
  const isOverdue = draft.status !== 'Paid' && draft.dueDate && new Date(draft.dueDate) < new Date();
  const invoiceNumber = draft.invoiceNumber || (draft.id ? draft.id.substring(0, 8) : 'Unnumbered');
  const clientName = client?.name || 'Client';
  const currencyCode = company?.currencyCode || 'USD';
  const depositApplied = Number(draft.depositApplied || 0);
  const balanceDue = Math.max(0, totals.total - depositApplied);

  const progressSteps = [
    { label: 'Sent', done: !!draft.sentAt || draft.status === 'Sent' || draft.status === 'Paid' },
    { label: 'Viewed', done: !!draft.viewedAt || draft.status === 'Paid' },
    { label: 'Paid', done: draft.status === 'Paid' },
  ];

  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const updateLineItem = (idx, field, value) => {
    setDraft((prev) => {
      const next = [...(prev.lineItems || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, lineItems: next };
    });
  };
  const addLineItem = (opts = {}) => {
    const items = draft.lineItems || [];
    if (items.length >= 100) return;
    updateDraft({ lineItems: [...items, buildLineItem(opts)] });
  };
  const removeLineItem = (idx) => {
    updateDraft({ lineItems: (draft.lineItems || []).filter((_, i) => i !== idx) });
  };

  const customFields = Array.isArray(draft.customFields) ? draft.customFields : [];

  const handleIssueDateChange = (value) => {
    const iso = toIsoDate(value);
    const dueTerm = draft.dueTerm || 'Due Today';
    updateDraft({ issueDate: iso, dueDate: computeDueDate(iso, dueTerm) });
  };
  const handleDueTermChange = (term) => {
    const issueDate = draft.issueDate || draft.createdAt || new Date().toISOString();
    updateDraft({ dueTerm: term, dueDate: computeDueDate(issueDate, term) });
  };
  const startContactEdit = () => {
    if (!canEdit) return;
    setContactSnapshot({
      billingAddress: draft.billingAddress || '',
      serviceAddress: draft.serviceAddress || '',
      contactPhone: draft.contactPhone || '',
      contactEmail: draft.contactEmail || '',
    });
    setEditingContact(true);
  };
  const cancelContactEdit = () => {
    if (contactSnapshot) updateDraft(contactSnapshot);
    setEditingContact(false);
    setContactSnapshot(null);
  };
  const finishContactEdit = () => {
    setEditingContact(false);
    setContactSnapshot(null);
  };

  const handleSave = () => {
    if (!onUpdateFields) return;
    const normalizedItems = (draft.lineItems || []).map((item) => ({
      ...item,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      unitCost: Number(item.unitCost || 0),
    }));
    const sanitizedCustomFields = customFields
      .filter((cf) => cf && (cf.fieldId || cf.key || cf.value))
      .map((cf) => cf.fieldId
        ? { fieldId: cf.fieldId, fieldName: (cf.fieldName || '').trim(), fieldType: cf.fieldType || 'text', value: cf.value ?? '' }
        : { key: (cf.key || '').trim(), value: (cf.value || '').trim() }
      );
    const taxRate = Number.isFinite(Number(draft.taxRate)) ? Number(draft.taxRate) : 0;
    const computed = computeTotals({ ...draft, taxRate, lineItems: normalizedItems });
    const payload = {
      ...draft,
      status: draft.status || 'Draft',
      lineItems: normalizedItems,
      customFields: sanitizedCustomFields,
      taxRate,
      ...computed,
    };
    delete payload.id;
    if (isCreate && onCreateInvoice) {
      onCreateInvoice(payload);
      return;
    }
    if (onUpdateFields) {
      onUpdateFields(invoice.id, payload);
    }
    if (applyDefaults && onApplyInvoiceDefaults) {
      onApplyInvoiceDefaults({
        invoiceContractTerms: payload.contractTerms || '',
        invoiceDisclaimers: payload.disclaimers || '',
        invoiceClientViewSettings: payload.clientViewSettings || {},
        invoicePaymentSettings: payload.paymentSettings || {},
        invoiceMessage: payload.clientMessage || '',
      });
      setApplyDefaults(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-100">
            <ChevronLeftIcon />
            Back to all invoices
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {!isCreate && (
              <button
                onClick={() => onPrint && onPrint(invoice)}
                className="px-3 py-2 rounded-md border border-slate-700/30 text-sm font-semibold text-slate-100 hover:bg-midnight flex items-center gap-2"
              >
                <PrinterIcon />
                Print
              </button>
            )}
            {!isCreate && stripeEnabled && canEdit && (
              <button
                onClick={() => onGeneratePaymentLink && onGeneratePaymentLink(invoice)}
                className="px-3 py-2 rounded-md border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Get Payment Link
              </button>
            )}
            {!isCreate && canEdit && (
              <button
                onClick={() => onSend && onSend(invoice)}
                className="px-3 py-2 rounded-md bg-scaffld-teal text-white text-sm font-semibold hover:bg-scaffld-teal/90"
              >
                Send Email
              </button>
            )}
            {!isCreate && (draft.status === 'Unpaid' || draft.status === 'Sent') && canEdit && (
              <button
                onClick={() => onUpdateStatus && onUpdateStatus(invoice.id, 'Paid')}
                className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Record Payment
              </button>
            )}
          </div>
        </div>

      <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <InvoiceIcon />
              <span>Invoice</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mt-2">Invoice for {clientName}</h1>
            <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">
              {isCreate ? (
                <span className="font-semibold text-slate-400">Invoice number assigned on save</span>
              ) : editingNumber ? (
                <input
                  value={draft.invoiceNumber || ''}
                  onChange={(e) => updateDraft({ invoiceNumber: e.target.value })}
                  onBlur={() => setEditingNumber(false)}
                  className="px-2 py-1 border border-slate-700/30 rounded-md text-sm"
                  disabled={!canEdit}
                />
              ) : (
                <>
                  <span className="font-semibold">Invoice {invoiceNumber}</span>
                  {canEdit && (
                    <button onClick={() => setEditingNumber(true)} className="text-scaffld-teal font-semibold underline">
                      Change
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[draft.status] || 'bg-midnight text-slate-100'}`}>
              {draft.status}
            </span>
            {isOverdue && (
              <div className="mt-2 text-xs font-semibold text-signal-coral">Past due</div>
            )}
            <div className="mt-2 text-xs text-slate-400">
              Issued {formatDate(draft.issueDate || draft.createdAt)} | Due {formatDate(draft.dueDate)}
            </div>
          </div>
        </div>
        {!isCreate && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {progressSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-scaffld-teal' : 'bg-slate-500'}`} />
                <span className={step.done ? 'text-scaffld-teal font-semibold' : 'text-slate-400'}>{step.label}</span>
                {idx < progressSteps.length - 1 && <span className="h-px w-6 bg-slate-700" />}
              </div>
            ))}
          </div>
        )}
        {!isCreate && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {draft.accountingSync?.provider ? (
              draft.accountingSync.syncError ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-signal-coral/10 text-signal-coral font-medium">
                  Sync error ({draft.accountingSync.provider})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-scaffld-teal/10 text-scaffld-teal font-medium">
                  Synced to {draft.accountingSync.provider === 'quickbooks' ? 'QuickBooks' : 'Xero'}
                  {draft.accountingSync.syncedAt && ` \u2022 ${new Date(draft.accountingSync.syncedAt).toLocaleDateString()}`}
                </span>
              )
            ) : accountingConnected && canEdit ? (
              <button
                type="button"
                onClick={() => onSyncInvoice && onSyncInvoice(invoice.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-midnight transition-colors font-medium"
              >
                Sync to accounting
              </button>
            ) : null}
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-semibold text-slate-100 mb-2">Invoice subject</label>
          <input
            value={draft.subject || ''}
            onChange={(e) => updateDraft({ subject: e.target.value })}
            className="w-full px-4 py-3 border border-slate-700/30 rounded-2xl text-base shadow-sm"
            disabled={!canEdit}
            placeholder="Subject"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">Client details</h3>
              {canEdit && (
                editingContact ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelContactEdit}
                      className="px-3 py-1.5 rounded-md border border-slate-700 text-xs font-semibold text-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={finishContactEdit}
                      className="px-3 py-1.5 rounded-md bg-scaffld-teal text-white text-xs font-semibold"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button onClick={startContactEdit} className="text-sm font-semibold text-scaffld-teal underline">
                    Edit
                  </button>
                )
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-semibold text-slate-100 mb-2">Billing address</div>
                <textarea
                  value={draft.billingAddress || ''}
                  onChange={(e) => updateDraft({ billingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm"
                  rows={3}
                  disabled={!canEdit || !editingContact}
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100 mb-2">Service address</div>
                <textarea
                  value={draft.serviceAddress || ''}
                  onChange={(e) => updateDraft({ serviceAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm"
                  rows={3}
                  disabled={!canEdit || !editingContact}
                />
                {!draft.serviceAddress && draft.billingAddress && (
                  <div className="text-xs text-slate-400 mt-1">(Same as billing address)</div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100 mb-2">Contact details</div>
                <div className="space-y-2">
                  <input
                    value={draft.contactPhone || ''}
                    onChange={(e) => updateDraft({ contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm"
                    placeholder="Phone"
                    disabled={!canEdit || !editingContact}
                  />
                  <input
                    value={draft.contactEmail || ''}
                    onChange={(e) => updateDraft({ contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm"
                    placeholder="Email"
                    disabled={!canEdit || !editingContact}
                  />
                  {onOpenClient && (
                    <button
                      onClick={() => onOpenClient(invoice.clientId)}
                      className="text-sm font-semibold text-scaffld-teal underline"
                    >
                      View client
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <InvoiceLineItemsCard draft={draft} canEdit={canEdit} updateLineItem={updateLineItem} addLineItem={addLineItem} removeLineItem={removeLineItem} />

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Client message</h3>
            <textarea
              value={draft.clientMessage || ''}
              onChange={(e) => updateDraft({ clientMessage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-700 rounded-md text-sm"
              rows={4}
              disabled={!canEdit}
            />
            {canEdit && (
              <AIRewriteButtons text={draft.clientMessage} onApply={(text) => updateDraft({ clientMessage: text })} disabled={!canEdit} />
            )}
          </div>

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6 space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Contract / Disclaimer</h3>
            <textarea
              value={draft.contractTerms || ''}
              onChange={(e) => updateDraft({ contractTerms: e.target.value })}
              className="w-full px-3 py-2 border border-slate-700 rounded-md text-sm"
              rows={4}
              placeholder="Contract terms"
              disabled={!canEdit}
            />
            <textarea
              value={draft.disclaimers || ''}
              onChange={(e) => updateDraft({ disclaimers: e.target.value })}
              className="w-full px-3 py-2 border border-slate-700 rounded-md text-sm"
              rows={3}
              placeholder="Disclaimers"
              disabled={!canEdit}
            />
            {canEdit && (
              <label className="flex items-center gap-2 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={applyDefaults}
                  onChange={(e) => setApplyDefaults(e.target.checked)}
                />
                Apply to all future invoices
              </label>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <InvoiceDetailsCard draft={draft} canEdit={canEdit} handleIssueDateChange={handleIssueDateChange} handleDueTermChange={handleDueTermChange} updateDraft={updateDraft}
            customFieldsNode={<CustomFieldEditor entityType="invoices" customFields={customFields} onChange={(updated) => updateDraft({ customFields: updated })} disabled={!canEdit} />}
          />
          <InvoiceTotalsCard draft={draft} totals={totals} balanceDue={balanceDue} currencyCode={currencyCode} canEdit={canEdit} showDiscount={showDiscount} setShowDiscount={setShowDiscount} updateDraft={updateDraft} />
          <ClientViewCard draft={draft} canEdit={canEdit} showClientView={showClientView} setShowClientView={setShowClientView} updateDraft={updateDraft} />
          <PaymentSettingsCard draft={draft} canEdit={canEdit} updateDraft={updateDraft} />
          {!isCreate && (
            <PaymentPlanCard
              invoice={draft} balanceDue={balanceDue} currencyCode={currencyCode}
              canEdit={canEdit}
              onSetupPlan={(config) => onSetupPaymentPlan && onSetupPaymentPlan(invoice.id, config)}
              onRecordInstallment={(idx, details) => onRecordInstallmentPayment && onRecordInstallmentPayment(invoice.id, idx, details)}
              onRemovePlan={() => onRemovePaymentPlan && onRemovePaymentPlan(invoice.id)}
            />
          )}
          <InternalNotesCard draft={draft} canEdit={canEdit} updateDraft={updateDraft} onUploadAttachment={onUploadAttachment} onRemoveAttachment={onRemoveAttachment} />

          {canEdit && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDraft({ ...invoice, lineItems: invoice.lineItems || [] })}
                className="px-4 py-2 rounded-md border border-slate-700 text-sm font-semibold text-slate-100"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-green-700 text-white text-sm font-semibold"
              >
                {isCreate ? 'Create Invoice' : 'Save Invoice'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
