// src/components/InvoiceDetailView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, InvoiceIcon, PrinterIcon } from './icons';
import { formatCurrency, formatDate, toDateInput, toIsoDate } from '../utils';
import { rewriteText } from '../utils';
import { computeDueDate, computeTotals } from '../utils';
import { STATUS_COLORS } from '../constants';

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
  userRole,
  defaultTaxRate,
  stripeEnabled,
  mode = 'view',
}) {
  const canEdit = userRole === 'admin' || userRole === 'manager';
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
  const addCustomField = () => updateDraft({ customFields: [...customFields, { key: '', value: '' }] });
  const updateCustomField = (idx, field, value) => {
    const next = [...customFields];
    next[idx] = { ...next[idx], [field]: value };
    updateDraft({ customFields: next });
  };
  const removeCustomField = (idx) => updateDraft({ customFields: customFields.filter((_, i) => i !== idx) });

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
      .filter((cf) => cf && (cf.key || cf.value))
      .map((cf) => ({ key: (cf.key || '').trim(), value: (cf.value || '').trim() }));
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

  const handleAttachmentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadAttachment) return;
    onUploadAttachment(draft, file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800">
            <ChevronLeftIcon />
            Back to all invoices
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {!isCreate && (
              <button
                onClick={() => onPrint && onPrint(invoice)}
                className="px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                className="px-3 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
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

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <InvoiceIcon />
              <span>Invoice</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Invoice for {clientName}</h1>
            <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
              {isCreate ? (
                <span className="font-semibold text-gray-500">Invoice number assigned on save</span>
              ) : editingNumber ? (
                <input
                  value={draft.invoiceNumber || ''}
                  onChange={(e) => updateDraft({ invoiceNumber: e.target.value })}
                  onBlur={() => setEditingNumber(false)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                  disabled={!canEdit}
                />
              ) : (
                <>
                  <span className="font-semibold">Invoice {invoiceNumber}</span>
                  {canEdit && (
                    <button onClick={() => setEditingNumber(true)} className="text-green-700 font-semibold underline">
                      Change
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[draft.status] || 'bg-gray-100 text-gray-700'}`}>
              {draft.status}
            </span>
            {isOverdue && (
              <div className="mt-2 text-xs font-semibold text-red-600">Past due</div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Issued {formatDate(draft.issueDate || draft.createdAt)} | Due {formatDate(draft.dueDate)}
            </div>
          </div>
        </div>
        {!isCreate && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {progressSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-green-600' : 'bg-gray-300'}`} />
                <span className={step.done ? 'text-green-700 font-semibold' : 'text-gray-500'}>{step.label}</span>
                {idx < progressSteps.length - 1 && <span className="h-px w-6 bg-gray-200" />}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice subject</label>
          <input
            value={draft.subject || ''}
            onChange={(e) => updateDraft({ subject: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-base shadow-sm"
            disabled={!canEdit}
            placeholder="Subject"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Client details</h3>
              {canEdit && (
                editingContact ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelContactEdit}
                      className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-semibold text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={finishContactEdit}
                      className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button onClick={startContactEdit} className="text-sm font-semibold text-green-700 underline">
                    Edit
                  </button>
                )
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Billing address</div>
                <textarea
                  value={draft.billingAddress || ''}
                  onChange={(e) => updateDraft({ billingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  rows={3}
                  disabled={!canEdit || !editingContact}
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Service address</div>
                <textarea
                  value={draft.serviceAddress || ''}
                  onChange={(e) => updateDraft({ serviceAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  rows={3}
                  disabled={!canEdit || !editingContact}
                />
                {!draft.serviceAddress && draft.billingAddress && (
                  <div className="text-xs text-gray-500 mt-1">(Same as billing address)</div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Contact details</div>
                <div className="space-y-2">
                  <input
                    value={draft.contactPhone || ''}
                    onChange={(e) => updateDraft({ contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    placeholder="Phone"
                    disabled={!canEdit || !editingContact}
                  />
                  <input
                    value={draft.contactEmail || ''}
                    onChange={(e) => updateDraft({ contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    placeholder="Email"
                    disabled={!canEdit || !editingContact}
                  />
                  {onOpenClient && (
                    <button
                      onClick={() => onOpenClient(invoice.clientId)}
                      className="text-sm font-semibold text-green-700 underline"
                    >
                      View client
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Product / Service</h3>
              <button
                type="button"
                onClick={() => addLineItem()}
                className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-semibold"
                disabled={!canEdit}
              >
                Add Line Item
              </button>
            </div>

            <div className="space-y-4">
              {(draft.lineItems || []).map((item, idx) => {
                const itemType = item?.type || 'line_item';
                if (itemType === 'text') {
                  return (
                    <div key={`text-${idx}`} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        placeholder="Text block"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={3}
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <div className="text-right">
                          <button onClick={() => removeLineItem(idx)} className="text-xs font-semibold text-red-600">Remove</button>
                        </div>
                      )}
                    </div>
                  );
                }
                const lineTotal = (Number(item.qty || 0) * Number(item.price || 0));
                return (
                  <div key={`item-${idx}`} className="border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_0.4fr_0.6fr_0.6fr_auto] gap-3 items-start">
                      <div className="space-y-2">
                        <input
                          value={item.name || ''}
                          onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                          placeholder="Name"
                          disabled={!canEdit}
                        />
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                          rows={3}
                          placeholder="Description"
                          disabled={!canEdit}
                        />
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={item.qty || 0}
                        onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-right"
                        disabled={!canEdit}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          value={item.price || 0}
                          onChange={(e) => updateLineItem(idx, 'price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-right"
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          value={lineTotal.toFixed(2)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-right bg-gray-50"
                          disabled
                        />
                      </div>
                      {canEdit && (
                        <button onClick={() => removeLineItem(idx)} className="px-3 py-2 border border-red-200 rounded-lg text-red-600 text-sm font-semibold">
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-sm text-gray-600">
                      {item.serviceDate ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={toDateInput(item.serviceDate)}
                            onChange={(e) => updateLineItem(idx, 'serviceDate', toIsoDate(e.target.value))}
                            className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                            disabled={!canEdit}
                          />
                          {canEdit && (
                            <button onClick={() => updateLineItem(idx, 'serviceDate', '')} className="text-xs text-gray-500 underline">
                              Clear
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => updateLineItem(idx, 'serviceDate', new Date().toISOString())}
                          className="text-green-700 underline text-sm"
                          disabled={!canEdit}
                        >
                          Set Service Date
                        </button>
                      )}
                      {item.isOptional && <span className="text-xs text-amber-700">Optional</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {draft.lineItems?.length >= 100 && (
              <div className="text-xs text-gray-500 mt-3">Limit 100 line items</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Client message</h3>
            <textarea
              value={draft.clientMessage || ''}
              onChange={(e) => updateDraft({ clientMessage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={4}
              disabled={!canEdit}
            />
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {['Cheerful','Casual','Professional','Shorter'].map((persona) => (
                <button
                  key={persona}
                  type="button"
                  onClick={() => updateDraft({ clientMessage: rewriteText(draft.clientMessage || '', persona) })}
                  className="px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:text-gray-800"
                  disabled={!canEdit}
                >
                  Rewrite {persona}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Contract / Disclaimer</h3>
            <textarea
              value={draft.contractTerms || ''}
              onChange={(e) => updateDraft({ contractTerms: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={4}
              placeholder="Contract terms"
              disabled={!canEdit}
            />
            <textarea
              value={draft.disclaimers || ''}
              onChange={(e) => updateDraft({ disclaimers: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              placeholder="Disclaimers"
              disabled={!canEdit}
            />
            {canEdit && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Issued date</span>
                <input
                  type="date"
                  value={toDateInput(draft.issueDate || draft.createdAt)}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                  disabled={!canEdit}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Payment due</span>
                <select
                  value={draft.dueTerm || 'Due Today'}
                  onChange={(e) => handleDueTermChange(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                  disabled={!canEdit}
                >
                  <option>Due Today</option>
                  <option>Due on receipt</option>
                  <option>Net 7</option>
                  <option>Net 9</option>
                  <option>Net 14</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 60</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Ask client for review</span>
                <select
                  value={draft.askForReview ? 'Yes' : 'No'}
                  onChange={(e) => updateDraft({ askForReview: e.target.value === 'Yes' })}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                  disabled={!canEdit}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <button
                type="button"
                onClick={addCustomField}
                className="px-3 py-2 rounded-md border border-green-200 text-green-700 text-sm font-semibold"
                disabled={!canEdit}
              >
                Add Custom Field
              </button>
              {customFields.map((field, idx) => (
                <div key={`${field.key}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    value={field.key}
                    onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                    placeholder="Field"
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                    disabled={!canEdit}
                  />
                  <input
                    value={field.value}
                    onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                    placeholder="Value"
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                    disabled={!canEdit}
                  />
                  {canEdit && (
                    <button onClick={() => removeCustomField(idx)} className="text-xs font-semibold text-red-600">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Totals</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(totals.subtotalBeforeDiscount, currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <button
                  type="button"
                  onClick={() => setShowDiscount((v) => !v)}
                  className="text-green-700 font-semibold underline"
                  disabled={!canEdit}
                >
                  {showDiscount ? 'Hide Discount' : 'Add Discount'}
                </button>
              </div>
              {showDiscount && (
                <div className="flex gap-2">
                  <select
                    value={draft.quoteDiscountType || 'amount'}
                    onChange={(e) => updateDraft({ quoteDiscountType: e.target.value })}
                    className="px-2 py-2 border border-gray-200 rounded-xl text-sm"
                    disabled={!canEdit}
                  >
                    <option value="amount">Amount</option>
                    <option value="percent">Percent</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.quoteDiscountValue ?? 0}
                    onChange={(e) => updateDraft({ quoteDiscountValue: e.target.value })}
                    className="flex-1 px-2 py-2 border border-gray-200 rounded-xl text-sm"
                    disabled={!canEdit}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={draft.taxRate ?? 0}
                    onChange={(e) => updateDraft({ taxRate: e.target.value })}
                    className="w-20 px-2 py-1 border border-gray-200 rounded-md text-sm text-right"
                    disabled={!canEdit}
                  />
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
                <input
                  type="number"
                  step="0.01"
                  value={draft.depositApplied || ''}
                  onChange={(e) => updateDraft({ depositApplied: e.target.value })}
                  className="w-28 px-2 py-1 border border-gray-200 rounded-md text-sm text-right"
                  disabled={!canEdit}
                />
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Balance due</span>
                <span>{formatCurrency(balanceDue, currencyCode)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-800">Client view</span>
              <button
                type="button"
                onClick={() => setShowClientView((v) => !v)}
                className="text-sm font-semibold text-green-700 underline"
              >
                {showClientView ? 'Cancel' : 'Change'}
              </button>
            </div>
            {showClientView && (
              <div className="mt-3 text-sm text-gray-700 space-y-3">
                <div>
                  Adjust what your client will see on this invoice. To change the default for all future invoices, visit the{' '}
                  <span className="text-green-700 underline">PDF Style</span>.
                </div>
                <div className="flex flex-wrap gap-4">
                  {[
                    ['showQuantities', 'Quantities'],
                    ['showUnitCosts', 'Unit costs'],
                    ['showLineItemTotals', 'Line item totals'],
                    ['showTotals', 'Totals'],
                    ['showAccountBalance', 'Account balance'],
                    ['showLateStamp', 'Late stamp'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.clientViewSettings?.[key] !== false}
                        onChange={(e) => updateDraft({ clientViewSettings: { ...draft.clientViewSettings, [key]: e.target.checked } })}
                        className="h-4 w-4 accent-green-600"
                        disabled={!canEdit}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Invoice Payment Settings</h3>
            <div className="text-sm text-gray-600 mb-3">
              Disabling payment options on this invoice will not change your default payment preferences.
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <label className="flex items-center justify-between gap-3">
                <span>Accept card payments</span>
                <input
                  type="checkbox"
                  checked={draft.paymentSettings?.acceptCard ?? true}
                  onChange={(e) => updateDraft({ paymentSettings: { ...draft.paymentSettings, acceptCard: e.target.checked } })}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Accept bank payments (ACH)</span>
                <input
                  type="checkbox"
                  checked={draft.paymentSettings?.acceptBank ?? false}
                  onChange={(e) => updateDraft({ paymentSettings: { ...draft.paymentSettings, acceptBank: e.target.checked } })}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Allow partial payments</span>
                <input
                  type="checkbox"
                  checked={draft.paymentSettings?.allowPartialPayments ?? true}
                  onChange={(e) => updateDraft({ paymentSettings: { ...draft.paymentSettings, allowPartialPayments: e.target.checked } })}
                  disabled={!canEdit}
                />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Internal notes & attachments</h3>
            <textarea
              value={draft.internalNotes || ''}
              onChange={(e) => updateDraft({ internalNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={4}
              placeholder="Note details"
              disabled={!canEdit}
            />
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-sm text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <span>Drag your files here or</span>
                <label className="text-green-700 font-semibold cursor-pointer">
                  Select a File
                  <input type="file" className="hidden" onChange={handleAttachmentUpload} disabled={!canEdit} />
                </label>
              </div>
            </div>
            {(draft.attachments || []).length > 0 && (
              <ul className="space-y-2 text-sm">
                {(draft.attachments || []).map((file, idx) => (
                  <li key={`${file.url}-${idx}`} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline truncate">{file.name}</a>
                    {canEdit && (
                      <button onClick={() => onRemoveAttachment && onRemoveAttachment(draft, file.url)} className="text-xs text-red-600 font-semibold">
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEdit && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDraft({ ...invoice, lineItems: invoice.lineItems || [] })}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700"
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
