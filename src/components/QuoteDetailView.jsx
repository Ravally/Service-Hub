
// src/components/QuoteDetailView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, EditIcon, FileTextIcon, PlusCircleIcon } from './icons';
import { formatCurrency, formatDate, computeTotals, hasPermission } from '../utils';
import { STATUS_COLORS } from '../constants';
import CustomFieldEditor from './common/CustomFieldEditor';

const SectionHeader = ({ title, onEdit, isEditing }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
    {onEdit && (
      <button onClick={onEdit} className="min-h-[44px] text-sm font-semibold text-scaffld-teal hover:text-scaffld-teal/80">
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
    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${value ? 'bg-scaffld-teal' : 'bg-slate-700'}`}
  >
    <span className={`h-4 w-4 bg-charcoal rounded-full transition-transform ${value ? 'translate-x-6' : ''}`} />
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

  const statusClass = STATUS_COLORS?.[quote.status] || 'bg-midnight text-slate-300';
  const canEdit = hasPermission(userRole, 'edit.quote');

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
      <button onClick={onBack} className="min-h-[44px] flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-scaffld-teal">
        <ChevronLeftIcon />
        Back to all quotes
      </button>

      <div className="bg-harvest-amber/10 border border-harvest-amber/30 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileTextIcon />
            <Pill className={statusClass}>{quote.status}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onConvertToJob && onConvertToJob(quote)}
              className="min-h-[44px] px-4 py-2 bg-scaffld-teal text-midnight rounded-lg text-sm font-semibold hover:bg-scaffld-teal/90"
            >
              Convert to Job
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="min-h-[44px] px-4 py-2 bg-charcoal border border-slate-700/30 rounded-lg text-sm font-semibold text-slate-100 hover:bg-charcoal/80"
              >
                More
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-charcoal border border-slate-700/30 rounded-xl shadow-lg z-30 text-sm">
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onConvertToJob && onConvertToJob(quote); setMenuOpen(false); }}>Convert to Job</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onCreateSimilar && onCreateSimilar(quote); setMenuOpen(false); }}>Create Similar Quote</button>
                  {!quote.depositCollected && (
                    <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onCollectDeposit && onCollectDeposit(quote); setMenuOpen(false); }}>Collect Deposit</button>
                  )}
                  <div className="px-4 pt-2 text-xs text-slate-500">Send as...</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onSendEmail && onSendEmail(quote); setMenuOpen(false); }}>Email</button>
                  {(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) && (
                    <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onSendText && onSendText(quote); setMenuOpen(false); }}>Text (SMS)</button>
                  )}
                  <div className="px-4 pt-2 text-xs text-slate-500">Mark as...</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onMarkAwaiting && onMarkAwaiting(quote); setMenuOpen(false); }}>Awaiting Response</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onMarkApproved && onMarkApproved(quote); setMenuOpen(false); }}>Approved</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onArchiveQuote && onArchiveQuote(quote); setMenuOpen(false); }}>Archived</button>
                  <div className="px-4 pt-2 text-xs text-slate-500">Client view</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onPreviewClient && onPreviewClient(quote); setMenuOpen(false); }}>Preview as Client</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onCollectSignature && onCollectSignature(quote); setMenuOpen(false); }}>Collect Signature</button>
                  <div className="px-4 pt-2 text-xs text-slate-500">Documents</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-midnight text-slate-100" onClick={() => { onPrint && onPrint(quote); setMenuOpen(false); }}>Download PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-4 truncate">{overviewDraft.title || `Quote for ${client?.name || 'Client'}`}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
          <span>Quote #{overviewDraft.quoteNumber || quote.quoteNumber || quote.id?.slice(0, 6)}</span>
          <span>Created {formatDate(quote.createdAt)}</span>
          {quote.approvedAt && <span>Approved {formatDate(quote.approvedAt)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
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
                  className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={overviewDraft.quoteNumber}
                    onChange={(e) => setOverviewDraft({ ...overviewDraft, quoteNumber: e.target.value })}
                    placeholder="Quote number"
                    className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                  />
                  <input
                    value={overviewDraft.salesperson}
                    onChange={(e) => setOverviewDraft({ ...overviewDraft, salesperson: e.target.value })}
                    placeholder="Assigned salesperson"
                    className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-2">Custom fields</div>
                  <CustomFieldEditor
                    entityType="quotes"
                    customFields={overviewDraft.customFields}
                    onChange={(updated) => setOverviewDraft(prev => ({ ...prev, customFields: updated }))}
                  />
                </div>
                <div className="text-right">
                  <button onClick={saveOverview} className="px-4 py-2 bg-scaffld-teal text-midnight rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-100">
                <div>
                  <div className="text-xs text-slate-400">Salesperson</div>
                  <div className="font-semibold">{overviewDraft.salesperson || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Required Deposit</div>
                  <div className="font-semibold">{formatCurrency(requiredDeposit)}</div>
                </div>
                <div className="md:col-span-2">
                  <CustomFieldEditor
                    entityType="quotes"
                    customFields={overviewDraft.customFields}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
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
                  className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                >
                  {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={clientDraft.propertyId}
                  onChange={(e) => setClientDraft({ ...clientDraft, propertyId: e.target.value })}
                  className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                >
                  <option value="">Select property</option>
                  {propertyOptions.map((p, idx) => (
                    <option key={p.uid || idx} value={p.uid || p.id || idx}>{p.label || p.street1 || 'Property'}</option>
                  ))}
                </select>
                <select
                  value={clientDraft.contactId}
                  onChange={(e) => setClientDraft({ ...clientDraft, contactId: e.target.value })}
                  className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                >
                  <option value="">Select contact</option>
                  {contactOptions.map((c, idx) => (
                    <option key={c.uid || idx} value={c.uid || c.id || idx}>{c.name || `${c.firstName || ''} ${c.lastName || ''}`}</option>
                  ))}
                </select>
                <div className="text-right md:col-span-2">
                  <button onClick={saveClient} className="px-4 py-2 bg-scaffld-teal text-midnight rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-100">
                <div>
                  <div className="text-xs text-slate-400">Client</div>
                  <button onClick={() => onOpenClient && onOpenClient(quote.clientId)} className="font-semibold text-scaffld-teal hover:underline">
                    {client?.name || 'Client'}
                  </button>
                  <div className="text-xs text-slate-400 mt-2">Property</div>
                  <div>{propertyAddress || 'No property on file'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Contact</div>
                  <div>{client?.phone || client?.phones?.[0]?.number || 'No phone'}</div>
                  <div className="text-scaffld-teal">{client?.email || client?.emails?.[0]?.address || 'No email'}</div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
            <SectionHeader
              title="Product / Service"
              onEdit={canEdit ? () => setEditingSection(editingSection === 'lineItems' ? '' : 'lineItems') : null}
              isEditing={editingSection === 'lineItems'}
            />
            {editingSection === 'lineItems' ? (
              <div className="space-y-4 text-sm">
                {lineItemsDraft.map((item, idx) => (
                  <div key={`${item.description}-${idx}`} className="border border-slate-700/30 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      value={item.name || ''}
                      onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.qty || 0}
                      onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                      placeholder="Quantity"
                      className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.unitCost || 0}
                      onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)}
                      placeholder="Unit cost"
                      className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.price || 0}
                      onChange={(e) => updateLineItem(idx, 'price', e.target.value)}
                      placeholder="Unit price"
                      className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                    />
                    <input
                        value={item.imageUrl || ''}
                        onChange={(e) => updateLineItem(idx, 'imageUrl', e.target.value)}
                        placeholder="Image URL"
                        className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                      />
                    </div>
                    <textarea
                      value={item.description || item.note || ''}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={!!item.isOptional}
                        onChange={(e) => updateLineItem(idx, 'isOptional', e.target.checked)}
                      />
                      Mark as optional
                    </label>
                    <div className="text-right">
                      <button onClick={() => removeLineItem(idx)} className="text-xs font-semibold text-signal-coral hover:text-signal-coral/80">Remove</button>
                    </div>
                  </div>
                ))}
                <button onClick={addLineItem} className="flex items-center gap-2 text-sm font-semibold text-scaffld-teal hover:text-scaffld-teal/80">
                  <PlusCircleIcon /> Add Line Item
                </button>
                <div className="text-right">
                  <button onClick={saveLineItems} className="px-4 py-2 bg-scaffld-teal text-midnight rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Save</button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[340px]">
                  <thead className="text-xs text-slate-400 border-b">
                    <tr>
                      <th className="text-left py-2">Line Item</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
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
                              <div className="text-slate-300">{item.description || item.name || 'Text'}</div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={`${item.description}-${idx}`} className="border-b last:border-b-0">
                          <td className="py-3">
                            <div className="font-semibold text-slate-100">{item.name || item.description}</div>
                            {item.description && <div className="text-xs text-slate-400">{item.description}</div>}
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
                </div>
                <div className="flex justify-end mt-4">
                  <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotalBeforeDiscount)}</span></div>
                    <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
                    <div className="flex justify-between text-xs text-slate-400"><span>Required deposit</span><span>{formatCurrency(requiredDeposit)}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
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
                  className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                />
                <div className="flex gap-2">
                  <select
                    value={financialDraft.quoteDiscountType}
                    onChange={(e) => setFinancialDraft({ ...financialDraft, quoteDiscountType: e.target.value })}
                    className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                  >
                    <option value="amount">Discount $</option>
                    <option value="percent">Discount %</option>
                  </select>
                  <input
                    type="number"
                    value={financialDraft.quoteDiscountValue}
                    onChange={(e) => setFinancialDraft({ ...financialDraft, quoteDiscountValue: e.target.value })}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100"
                  />
                </div>
                <input
                  type="number"
                  value={financialDraft.depositRequiredAmount}
                  onChange={(e) => setFinancialDraft({ ...financialDraft, depositRequiredAmount: e.target.value })}
                  placeholder="Required deposit amount"
                  className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                />
                <input
                  type="number"
                  value={financialDraft.depositRequiredPercent}
                  onChange={(e) => setFinancialDraft({ ...financialDraft, depositRequiredPercent: e.target.value })}
                  placeholder="Required deposit %"
                  className="px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                />
                <div className="md:col-span-2 text-right">
                  <button onClick={saveFinancials} className="px-4 py-2 bg-scaffld-teal text-midnight rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-100">
                <div>
                  <div className="text-xs text-slate-400">Tax rate</div>
                  <div className="font-semibold">{financialDraft.taxRate || 0}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Discount</div>
                  <div className="font-semibold">{financialDraft.quoteDiscountType === 'percent' ? `${financialDraft.quoteDiscountValue || 0}%` : formatCurrency(financialDraft.quoteDiscountValue || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Required deposit</div>
                  <div className="font-semibold">{formatCurrency(requiredDeposit)}</div>
                  {quote.depositCollected && (
                    <div className="text-xs text-scaffld-teal mt-1">
                      Collected {quote.depositMethod === 'stripe' ? 'via Stripe' : 'manually'}
                      {quote.depositCollectedAt && ` on ${new Date(quote.depositCollectedAt).toLocaleDateString()}`}
                    </div>
                  )}
                  {requiredDeposit > 0 && !quote.depositCollected && (
                    <div className="text-xs text-harvest-amber mt-1">Pending collection</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
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
                  className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                  rows={4}
                />
                <textarea
                  value={legalDraft.disclaimers}
                  onChange={(e) => setLegalDraft({ ...legalDraft, disclaimers: e.target.value })}
                  placeholder="Disclaimers"
                  className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 focus:border-scaffld-teal focus:ring-1 focus:ring-scaffld-teal/20"
                  rows={3}
                />
                <div className="text-right">
                  <button onClick={saveLegal} className="px-4 py-2 bg-scaffld-teal text-midnight rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Save</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-100 space-y-3">
                <div>{legalDraft.contractTerms || 'No contract terms added.'}</div>
                <div>{legalDraft.disclaimers || 'No disclaimer set.'}</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-100">
            <button className="min-h-[44px] px-3 py-1.5 rounded-full bg-midnight border border-slate-700/30">+ Add section</button>
            <button className="min-h-[44px] px-3 py-1.5 rounded-full bg-charcoal border border-slate-700/30">Introduction</button>
            <button className="min-h-[44px] px-3 py-1.5 rounded-full bg-charcoal border border-slate-700/30">Attachments</button>
            <button className="min-h-[44px] px-3 py-1.5 rounded-full bg-charcoal border border-slate-700/30">Images</button>
            <button className="min-h-[44px] px-3 py-1.5 rounded-full bg-charcoal border border-slate-700/30">Reviews</button>
            <button className="min-h-[44px] px-3 py-1.5 rounded-full bg-charcoal border border-slate-700/30">Client message</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Customize</h3>
            <div className="border border-slate-700/30 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-200">Deposit payment settings</div>
              <div className="flex items-center justify-between text-sm text-slate-100">
                <span>Accept card payments</span>
                <Toggle label="Accept card payments" value={depositDraft.acceptCard} onChange={(v) => setDepositDraft(prev => ({ ...prev, acceptCard: v }))} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-100">
                <span>Accept bank payments (ACH)</span>
                <Toggle label="Accept bank payments" value={depositDraft.acceptBank} onChange={(v) => setDepositDraft(prev => ({ ...prev, acceptBank: v }))} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-100">
                <span>Require payment method on file</span>
                <Toggle label="Require payment method" value={depositDraft.requireMethodOnFile} onChange={(v) => setDepositDraft(prev => ({ ...prev, requireMethodOnFile: v }))} />
              </div>
              <div className="text-xs text-slate-400">Updating this quote won't change default preferences.</div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold" onClick={() => setDepositDraft({
                  acceptCard: quote.depositSettings?.acceptCard ?? true,
                  acceptBank: quote.depositSettings?.acceptBank ?? false,
                  requireMethodOnFile: quote.depositSettings?.requireMethodOnFile ?? false,
                })}>Cancel</button>
                <button className="min-h-[44px] px-3 py-1.5 rounded-md bg-scaffld-teal text-white text-sm font-semibold" onClick={saveDepositSettings}>Save</button>
              </div>
            </div>
          </div>

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Notes</h3>
            <div className="border-2 border-dashed border-slate-700/30 rounded-2xl p-4 text-center text-sm text-slate-400">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Leave an internal note for yourself or a team member"
                className="w-full h-32 bg-transparent focus:outline-none text-sm text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold" onClick={() => setInternalNotes(quote.internalNotes || '')}>Cancel</button>
              <button className="min-h-[44px] px-3 py-1.5 rounded-md bg-scaffld-teal text-white text-sm font-semibold" onClick={saveNotes}>Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
