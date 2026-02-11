
// src/components/QuoteDetailView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, EditIcon, FileTextIcon, PlusCircleIcon } from './icons';
import { formatCurrency, formatDate, computeTotals } from '../utils';
import { STATUS_COLORS } from '../constants';

const SectionHeader = ({ title, onEdit, isEditing }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {onEdit && (
      <button onClick={onEdit} className="text-sm font-semibold text-green-700 hover:text-green-800">
        <span className="inline-flex items-center gap-2"><EditIcon /> {isEditing ? 'Cancel' : 'Edit'}</span>
      </button>
    )}
  </div>
);

const Pill = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>{children}</span>
);

const Toggle = ({ label, value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${value ? 'bg-green-600' : 'bg-gray-200'}`}
  >
    <span className={`h-4 w-4 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : ''}`} />
    <span className="sr-only">{label}</span>
  </button>
);

export default function QuoteDetailView({
  quote,
  client,
  clients,
  onBack,
  onUpdate,
  statusColors,
  onSendEmail,
  onSendText,
  onPrint,
  onConvertToJob,
  onCreateSimilar,
  onCollectDeposit,
  onPreviewClient,
  onMarkAwaiting,
  onMarkApproved,
  onCollectSignature,
  onArchiveQuote,
  onOpenClient,
  userRole,
  defaultTaxRate,
}) {
  const [editingSection, setEditingSection] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const [overviewDraft, setOverviewDraft] = useState({
    title: '',
    quoteNumber: '',
    salesperson: '',
    customFields: [],
  });
  const [clientDraft, setClientDraft] = useState({
    clientId: '',
    propertyId: '',
    contactId: '',
  });
  const [lineItemsDraft, setLineItemsDraft] = useState([]);
  const [financialDraft, setFinancialDraft] = useState({
    taxRate: 0,
    quoteDiscountType: 'amount',
    quoteDiscountValue: 0,
    depositRequiredAmount: 0,
    depositRequiredPercent: 0,
  });
  const [legalDraft, setLegalDraft] = useState({ contractTerms: '', disclaimers: '' });
  const [depositDraft, setDepositDraft] = useState({ acceptCard: true, acceptBank: false, requireMethodOnFile: false });
  const [internalNotes, setInternalNotes] = useState('');
  useEffect(() => {
    setOverviewDraft({
      title: quote.title || `Quote for ${client?.name || 'Client'}`,
      quoteNumber: quote.quoteNumber || '',
      salesperson: quote.salesperson || '',
      customFields: Array.isArray(quote.customFields) ? quote.customFields : [],
    });
    setClientDraft({
      clientId: quote.clientId || '',
      propertyId: quote.propertyId || '',
      contactId: quote.contactId || '',
    });
    setLineItemsDraft(Array.isArray(quote.lineItems) ? quote.lineItems : []);
    setFinancialDraft({
      taxRate: (typeof quote.taxRate === 'number') ? quote.taxRate : (defaultTaxRate ?? 0),
      quoteDiscountType: quote.quoteDiscountType || quote.discountType || 'amount',
      quoteDiscountValue: quote.quoteDiscountValue ?? quote.discountValue ?? 0,
      depositRequiredAmount: quote.depositRequiredAmount || 0,
      depositRequiredPercent: quote.depositRequiredPercent || 0,
    });
    setLegalDraft({
      contractTerms: quote.contractTerms || '',
      disclaimers: quote.disclaimers || '',
    });
    setDepositDraft({
      acceptCard: quote.depositSettings?.acceptCard ?? true,
      acceptBank: quote.depositSettings?.acceptBank ?? false,
      requireMethodOnFile: quote.depositSettings?.requireMethodOnFile ?? false,
    });
    setInternalNotes(quote.internalNotes || '');
    setEditingSection('');
  }, [quote, client, defaultTaxRate]);

  const clientOptions = clients || [];
  const activeClient = clientOptions.find(c => c.id === clientDraft.clientId) || client;
  const propertyOptions = Array.isArray(activeClient?.properties) ? activeClient.properties : [];
  const activeProperty = propertyOptions.find((p, idx) => {
    const pid = p.uid || p.id || String(idx);
    return pid === clientDraft.propertyId || pid === quote.propertyId;
  });
  const snapshotAddress = quote?.propertySnapshot
    ? [quote.propertySnapshot.street1, quote.propertySnapshot.street2, [quote.propertySnapshot.city, quote.propertySnapshot.state, quote.propertySnapshot.zip].filter(Boolean).join(' '), quote.propertySnapshot.country].filter(Boolean).join(', ')
    : '';
  const propertyAddress = snapshotAddress || (activeProperty
    ? [activeProperty.street1, activeProperty.street2, [activeProperty.city, activeProperty.state, activeProperty.zip].filter(Boolean).join(' '), activeProperty.country].filter(Boolean).join(', ')
    : (client?.address || ''));
  const contactOptions = Array.isArray(activeClient?.contacts) ? activeClient.contacts : [];

  const totals = useMemo(() => computeTotals({ ...quote, ...financialDraft, lineItems: lineItemsDraft }), [quote, financialDraft, lineItemsDraft]);
  const requiredDeposit = financialDraft.depositRequiredAmount || (financialDraft.depositRequiredPercent ? (totals.total * (financialDraft.depositRequiredPercent / 100)) : 0);

  const statusClass = STATUS_COLORS?.[quote.status] || 'bg-gray-100 text-gray-700';
  const canEdit = userRole === 'admin' || userRole === 'manager';

  const addCustomField = () => setOverviewDraft(prev => ({ ...prev, customFields: [...prev.customFields, { key: '', value: '' }] }));
  const updateCustomField = (idx, field, value) => setOverviewDraft(prev => {
    const next = [...prev.customFields];
    next[idx] = { ...next[idx], [field]: value };
    return { ...prev, customFields: next };
  });
  const removeCustomField = (idx) => setOverviewDraft(prev => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== idx) }));

  const addLineItem = () => setLineItemsDraft(prev => ([...prev, { description: '', name: '', qty: 1, price: 0, note: '', isOptional: false, imageUrl: '' }]));
  const updateLineItem = (idx, field, value) => setLineItemsDraft(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], [field]: value };
    return next;
  });
  const removeLineItem = (idx) => setLineItemsDraft(prev => prev.filter((_, i) => i !== idx));

  const saveOverview = () => {
    onUpdate(quote.id, {
      title: overviewDraft.title,
      quoteNumber: overviewDraft.quoteNumber,
      salesperson: overviewDraft.salesperson,
      customFields: overviewDraft.customFields.filter(cf => cf.key || cf.value),
    });
    setEditingSection('');
  };
  const saveClient = () => {
    onUpdate(quote.id, {
      clientId: clientDraft.clientId,
      propertyId: clientDraft.propertyId,
      contactId: clientDraft.contactId,
    });
    setEditingSection('');
  };
  const saveLineItems = () => {
    onUpdate(quote.id, { lineItems: lineItemsDraft });
    setEditingSection('');
  };
  const saveFinancials = () => {
    onUpdate(quote.id, {
      taxRate: Number(financialDraft.taxRate || 0),
      quoteDiscountType: financialDraft.quoteDiscountType,
      quoteDiscountValue: Number(financialDraft.quoteDiscountValue || 0),
      depositRequiredAmount: Number(financialDraft.depositRequiredAmount || 0),
      depositRequiredPercent: Number(financialDraft.depositRequiredPercent || 0),
    });
    setEditingSection('');
  };
  const saveLegal = () => {
    onUpdate(quote.id, { contractTerms: legalDraft.contractTerms, disclaimers: legalDraft.disclaimers });
    setEditingSection('');
  };
  const saveDepositSettings = () => {
    onUpdate(quote.id, { depositSettings: depositDraft });
  };
  const saveNotes = () => onUpdate(quote.id, { internalNotes });

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800">
        <ChevronLeftIcon />
        Back to all quotes
      </button>

      <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileTextIcon />
            <Pill className={statusClass}>{quote.status}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onConvertToJob && onConvertToJob(quote)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
            >
              Convert to Job
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                More
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 text-sm">
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onConvertToJob && onConvertToJob(quote); setMenuOpen(false); }}>Convert to Job</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onCreateSimilar && onCreateSimilar(quote); setMenuOpen(false); }}>Create Similar Quote</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onCollectDeposit && onCollectDeposit(quote); setMenuOpen(false); }}>Collect Deposit</button>
                  <div className="px-4 pt-2 text-xs text-gray-400">Send as...</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onSendEmail && onSendEmail(quote); setMenuOpen(false); }}>Email</button>
                  {(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) && (
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onSendText && onSendText(quote); setMenuOpen(false); }}>Text (SMS)</button>
                  )}
                  <div className="px-4 pt-2 text-xs text-gray-400">Mark as...</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onMarkAwaiting && onMarkAwaiting(quote); setMenuOpen(false); }}>Awaiting Response</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onMarkApproved && onMarkApproved(quote); setMenuOpen(false); }}>Approved</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onArchiveQuote && onArchiveQuote(quote); setMenuOpen(false); }}>Archived</button>
                  <div className="px-4 pt-2 text-xs text-gray-400">Client view</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onPreviewClient && onPreviewClient(quote); setMenuOpen(false); }}>Preview as Client</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onCollectSignature && onCollectSignature(quote); setMenuOpen(false); }}>Collect Signature</button>
                  <div className="px-4 pt-2 text-xs text-gray-400">Documents</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { onPrint && onPrint(quote); setMenuOpen(false); }}>Download PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mt-4">{overviewDraft.title || `Quote for ${client?.name || 'Client'}`}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>Quote #{overviewDraft.quoteNumber || quote.quoteNumber || quote.id?.slice(0, 6)}</span>
          <span>Created {formatDate(quote.createdAt)}</span>
          {quote.approvedAt && <span>Approved {formatDate(quote.approvedAt)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <SectionHeader
              title="Overview"
              onEdit={canEdit ? () => setEditingSection(editingSection === 'overview' ? '' : 'overview') : null}
              isEditing={editingSection === 'overview'}
            />
            {editingSection === 'overview' ? (
              <div className="space-y-4 text-sm">
                <input
                  value={overviewDraft.title}
                  onChange={(e) => setOverviewDraft({ ...overviewDraft, title: e.target.value })}
                  placeholder="Quote title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={overviewDraft.quoteNumber}
                    onChange={(e) => setOverviewDraft({ ...overviewDraft, quoteNumber: e.target.value })}
                    placeholder="Quote number"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    value={overviewDraft.salesperson}
                    onChange={(e) => setOverviewDraft({ ...overviewDraft, salesperson: e.target.value })}
                    placeholder="Assigned salesperson"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2">Custom fields</div>
                  {overviewDraft.customFields.map((field, idx) => (
                    <div key={`${field.key}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                      <input
                        value={field.key}
                        onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                        placeholder="Field name"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        value={field.value}
                        onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <button onClick={() => removeCustomField(idx)} className="text-red-600 text-xs font-semibold">Remove</button>
                    </div>
                  ))}
                  <button onClick={addCustomField} className="text-sm font-semibold text-green-700 hover:text-green-800">+ Add field</button>
                </div>
                <div className="text-right">
                  <button onClick={saveOverview} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <div className="text-xs text-gray-500">Salesperson</div>
                  <div className="font-semibold">{overviewDraft.salesperson || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Required Deposit</div>
                  <div className="font-semibold">{formatCurrency(requiredDeposit)}</div>
                </div>
                {overviewDraft.customFields.map((field, idx) => (
                  <div key={`${field.key}-${idx}`}>
                    <div className="text-xs text-gray-500">{field.key || 'Custom field'}</div>
                    <div className="font-semibold">{field.value || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <SectionHeader
              title="Client Data"
              onEdit={canEdit ? () => setEditingSection(editingSection === 'client' ? '' : 'client') : null}
              isEditing={editingSection === 'client'}
            />
            {editingSection === 'client' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <select
                  value={clientDraft.clientId}
                  onChange={(e) => setClientDraft({ ...clientDraft, clientId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={clientDraft.propertyId}
                  onChange={(e) => setClientDraft({ ...clientDraft, propertyId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select property</option>
                  {propertyOptions.map((p, idx) => (
                    <option key={p.uid || idx} value={p.uid || p.id || idx}>{p.label || p.street1 || 'Property'}</option>
                  ))}
                </select>
                <select
                  value={clientDraft.contactId}
                  onChange={(e) => setClientDraft({ ...clientDraft, contactId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select contact</option>
                  {contactOptions.map((c, idx) => (
                    <option key={c.uid || idx} value={c.uid || c.id || idx}>{c.name || `${c.firstName || ''} ${c.lastName || ''}`}</option>
                  ))}
                </select>
                <div className="text-right md:col-span-2">
                  <button onClick={saveClient} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <div className="text-xs text-gray-500">Client</div>
                  <button onClick={() => onOpenClient && onOpenClient(quote.clientId)} className="font-semibold text-green-700 hover:underline">
                    {client?.name || 'Client'}
                  </button>
                  <div className="text-xs text-gray-500 mt-2">Property</div>
                  <div>{propertyAddress || 'No property on file'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Contact</div>
                  <div>{client?.phone || client?.phones?.[0]?.number || 'No phone'}</div>
                  <div className="text-green-700">{client?.email || client?.emails?.[0]?.address || 'No email'}</div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <SectionHeader
              title="Product / Service"
              onEdit={canEdit ? () => setEditingSection(editingSection === 'lineItems' ? '' : 'lineItems') : null}
              isEditing={editingSection === 'lineItems'}
            />
            {editingSection === 'lineItems' ? (
              <div className="space-y-4 text-sm">
                {lineItemsDraft.map((item, idx) => (
                  <div key={`${item.description}-${idx}`} className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      value={item.name || ''}
                      onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.qty || 0}
                      onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                      placeholder="Quantity"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.unitCost || 0}
                      onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)}
                      placeholder="Unit cost"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.price || 0}
                      onChange={(e) => updateLineItem(idx, 'price', e.target.value)}
                      placeholder="Unit price"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                        value={item.imageUrl || ''}
                        onChange={(e) => updateLineItem(idx, 'imageUrl', e.target.value)}
                        placeholder="Image URL"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <textarea
                      value={item.description || item.note || ''}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={!!item.isOptional}
                        onChange={(e) => updateLineItem(idx, 'isOptional', e.target.checked)}
                      />
                      Mark as optional
                    </label>
                    <div className="text-right">
                      <button onClick={() => removeLineItem(idx)} className="text-xs font-semibold text-red-600">Remove</button>
                    </div>
                  </div>
                ))}
                <button onClick={addLineItem} className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800">
                  <PlusCircleIcon /> Add Line Item
                </button>
                <div className="text-right">
                  <button onClick={saveLineItems} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Save</button>
                </div>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 border-b">
                    <tr>
                      <th className="text-left py-2">Line Item</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Unit Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quote.lineItems || []).map((item, idx) => {
                      const itemType = item?.type || 'line_item';
                      if (itemType === 'text') {
                        return (
                          <tr key={`${item.description}-${idx}`} className="border-b last:border-b-0">
                            <td className="py-3" colSpan={4}>
                              <div className="text-gray-700">{item.description || item.name || 'Text'}</div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={`${item.description}-${idx}`} className="border-b last:border-b-0">
                          <td className="py-3">
                            <div className="font-semibold text-gray-900">{item.name || item.description}</div>
                            {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                            {item.isOptional && <div className="text-xs text-amber-600">Optional line item</div>}
                          </td>
                          <td className="py-3 text-right">{item.qty}</td>
                          <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="py-3 text-right font-semibold">{formatCurrency((item.qty || 0) * (item.price || 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-end mt-4">
                  <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotalBeforeDiscount)}</span></div>
                    <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
                    <div className="flex justify-between text-xs text-gray-500"><span>Required deposit</span><span>{formatCurrency(requiredDeposit)}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <SectionHeader
              title="Financials"
              onEdit={canEdit ? () => setEditingSection(editingSection === 'financials' ? '' : 'financials') : null}
              isEditing={editingSection === 'financials'}
            />
            {editingSection === 'financials' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <input
                  type="number"
                  value={financialDraft.taxRate}
                  onChange={(e) => setFinancialDraft({ ...financialDraft, taxRate: e.target.value })}
                  placeholder="Tax rate (%)"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex gap-2">
                  <select
                    value={financialDraft.quoteDiscountType}
                    onChange={(e) => setFinancialDraft({ ...financialDraft, quoteDiscountType: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="amount">Discount $</option>
                    <option value="percent">Discount %</option>
                  </select>
                  <input
                    type="number"
                    value={financialDraft.quoteDiscountValue}
                    onChange={(e) => setFinancialDraft({ ...financialDraft, quoteDiscountValue: e.target.value })}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <input
                  type="number"
                  value={financialDraft.depositRequiredAmount}
                  onChange={(e) => setFinancialDraft({ ...financialDraft, depositRequiredAmount: e.target.value })}
                  placeholder="Required deposit amount"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  value={financialDraft.depositRequiredPercent}
                  onChange={(e) => setFinancialDraft({ ...financialDraft, depositRequiredPercent: e.target.value })}
                  placeholder="Required deposit %"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="md:col-span-2 text-right">
                  <button onClick={saveFinancials} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div>
                  <div className="text-xs text-gray-500">Tax rate</div>
                  <div className="font-semibold">{financialDraft.taxRate || 0}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Discount</div>
                  <div className="font-semibold">{financialDraft.quoteDiscountType === 'percent' ? `${financialDraft.quoteDiscountValue || 0}%` : formatCurrency(financialDraft.quoteDiscountValue || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Required deposit</div>
                  <div className="font-semibold">{formatCurrency(requiredDeposit)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <SectionHeader
              title="Contract / Disclaimer"
              onEdit={canEdit ? () => setEditingSection(editingSection === 'legal' ? '' : 'legal') : null}
              isEditing={editingSection === 'legal'}
            />
            {editingSection === 'legal' ? (
              <div className="space-y-3 text-sm">
                <textarea
                  value={legalDraft.contractTerms}
                  onChange={(e) => setLegalDraft({ ...legalDraft, contractTerms: e.target.value })}
                  placeholder="Contract terms"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                />
                <textarea
                  value={legalDraft.disclaimers}
                  onChange={(e) => setLegalDraft({ ...legalDraft, disclaimers: e.target.value })}
                  placeholder="Disclaimers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
                <div className="text-right">
                  <button onClick={saveLegal} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">Save</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 space-y-3">
                <div>{legalDraft.contractTerms || 'No contract terms added.'}</div>
                <div>{legalDraft.disclaimers || 'No disclaimer set.'}</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <button className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200">+ Add section</button>
            <button className="px-3 py-1 rounded-full bg-white border border-gray-200">Introduction</button>
            <button className="px-3 py-1 rounded-full bg-white border border-gray-200">Attachments</button>
            <button className="px-3 py-1 rounded-full bg-white border border-gray-200">Images</button>
            <button className="px-3 py-1 rounded-full bg-white border border-gray-200">Reviews</button>
            <button className="px-3 py-1 rounded-full bg-white border border-gray-200">Client message</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customize</h3>
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-gray-800">Deposit payment settings</div>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Accept card payments</span>
                <Toggle label="Accept card payments" value={depositDraft.acceptCard} onChange={(v) => setDepositDraft(prev => ({ ...prev, acceptCard: v }))} />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Accept bank payments (ACH)</span>
                <Toggle label="Accept bank payments" value={depositDraft.acceptBank} onChange={(v) => setDepositDraft(prev => ({ ...prev, acceptBank: v }))} />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Require payment method on file</span>
                <Toggle label="Require payment method" value={depositDraft.requireMethodOnFile} onChange={(v) => setDepositDraft(prev => ({ ...prev, requireMethodOnFile: v }))} />
              </div>
              <div className="text-xs text-gray-500">Updating this quote won't change default preferences.</div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold" onClick={() => setDepositDraft({
                  acceptCard: quote.depositSettings?.acceptCard ?? true,
                  acceptBank: quote.depositSettings?.acceptBank ?? false,
                  requireMethodOnFile: quote.depositSettings?.requireMethodOnFile ?? false,
                })}>Cancel</button>
                <button className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold" onClick={saveDepositSettings}>Save</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-sm text-gray-500">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Leave an internal note for yourself or a team member"
                className="w-full h-32 bg-transparent focus:outline-none text-sm text-gray-700"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold" onClick={() => setInternalNotes(quote.internalNotes || '')}>Cancel</button>
              <button className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold" onClick={saveNotes}>Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
