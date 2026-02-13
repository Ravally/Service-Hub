import React, { useEffect, useMemo, useState } from 'react';
import { FileTextIcon } from './icons';
import { formatCurrency } from '../utils';
import { computeTotals } from '../utils/calculations';
import { rewriteText } from '../utils/textUtils';
import { MAX_LINE_ITEMS, initialLineItem } from '../constants';
import CustomFieldEditor from './common/CustomFieldEditor';

const buildLineItem = (opts = {}) => ({
  ...initialLineItem,
  imageUrl: '',
  ...opts,
});

export default function QuoteCreateForm({
  quote,
  setQuote,
  clients = [],
  staff = [],
  quoteTemplates = [],
  companySettings,
  onSave,
  onCancel,
}) {
  const [templateId, setTemplateId] = useState('');
  const [showClientView, setShowClientView] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [applyLegalDefaults, setApplyLegalDefaults] = useState(false);

  const totals = useMemo(() => computeTotals(quote), [quote]);
  const requiredDeposit = quote.depositRequiredAmount || (quote.depositRequiredPercent ? (totals.total * (quote.depositRequiredPercent / 100)) : 0);
  const itemCount = (quote.lineItems || []).length;
  const canAddItems = itemCount < MAX_LINE_ITEMS;
  const activeClient = useMemo(() => clients.find((c) => c.id === quote.clientId), [clients, quote.clientId]);
  const propertyOptions = Array.isArray(activeClient?.properties) ? activeClient.properties : [];

  useEffect(() => {
    if (!quote.lineItems || quote.lineItems.length === 0) {
      setQuote(prev => ({ ...prev, lineItems: [buildLineItem()] }));
    }
    if (!quote.clientViewSettings) {
      const defaults = companySettings?.quoteClientViewSettings || {
        showQuantities: true,
        showUnitPrices: true,
        showLineItemTotals: true,
        showTotals: true,
      };
      setQuote(prev => ({ ...prev, clientViewSettings: defaults }));
    }
  }, [quote.lineItems, quote.clientViewSettings, companySettings, setQuote]);

  const updateQuote = (patch) => setQuote(prev => ({ ...prev, ...patch }));
  const updateLineItem = (idx, field, value) => setQuote(prev => {
    const next = [...(prev.lineItems || [])];
    next[idx] = { ...next[idx], [field]: value };
    return { ...prev, lineItems: next };
  });

  const addLineItem = (opts = {}) => {
    if (!canAddItems) return;
    setQuote(prev => ({ ...prev, lineItems: [...(prev.lineItems || []), buildLineItem(opts)] }));
  };
  const removeLineItem = (idx) => setQuote(prev => ({ ...prev, lineItems: (prev.lineItems || []).filter((_, i) => i !== idx) }));

  const addFromTemplate = () => {
    const tmpl = quoteTemplates.find(t => t.id === templateId);
    if (!tmpl) return;
    addLineItem({ name: tmpl.name, description: tmpl.description || '', price: parseFloat(tmpl.price) || 0 });
    setTemplateId('');
  };

  const applyRewriteToItem = (idx, persona) => {
    const current = quote.lineItems?.[idx]?.description || '';
    updateLineItem(idx, 'description', rewriteText(current, persona));
  };
  const applyRewriteToClientMessage = (persona) => {
    updateQuote({ clientMessage: rewriteText(quote.clientMessage || '', persona) });
  };

  const customFields = Array.isArray(quote.customFields) ? quote.customFields : [];

  return (
    <div className="bg-charcoal p-8 rounded-2xl shadow-lg mb-8 border border-slate-700/30 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
            <FileTextIcon className="h-5 w-5" />
          </span>
          <h2 className="text-3xl font-bold text-slate-100">New Quote</h2>
        </div>
        <button onClick={onCancel} className="text-sm font-semibold text-slate-400 hover:text-slate-200">Back to Quotes</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="border border-slate-700/30 rounded-2xl p-6 bg-charcoal/80">
            <div className="space-y-6">
              <input
                type="text"
                value={quote.title || ''}
                onChange={(e) => updateQuote({ title: e.target.value })}
                placeholder="Title"
                className="w-full px-4 py-4 border border-slate-700/30 rounded-2xl text-lg shadow-sm"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Select a client</label>
                  <select
                    value={quote.clientId}
                    onChange={(e) => {
                      const nextClientId = e.target.value;
                      const nextClient = clients.find((c) => c.id === nextClientId);
                      const nextProps = Array.isArray(nextClient?.properties) ? nextClient.properties : [];
                      const nextPrimary = nextProps.find((p) => p.isPrimary) || nextProps[0] || null;
                      updateQuote({ clientId: nextClientId, propertyId: nextPrimary?.uid || nextPrimary?.id || '' });
                    }}
                    className="w-full px-4 py-3 border border-slate-700/30 rounded-2xl text-base shadow-sm"
                  >
                    <option value="">Select a client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {propertyOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Property</label>
                    <select
                      value={quote.propertyId || ''}
                      onChange={(e) => updateQuote({ propertyId: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-700/30 rounded-2xl text-base shadow-sm"
                    >
                      <option value="">Select property</option>
                      {propertyOptions.map((p, idx) => (
                        <option key={p.uid || p.id || idx} value={p.uid || p.id || String(idx)}>
                          {p.label || p.street1 || `Property ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Salesperson</label>
                  <select
                    value={quote.salesperson || ''}
                    onChange={(e) => updateQuote({ salesperson: e.target.value })}
                    className="w-full px-4 py-3 border border-transparent rounded-full text-base bg-[#e9e4d9] text-slate-300 font-semibold shadow-sm"
                  >
                    <option value="">Salesperson</option>
                    {staff.map(s => <option key={s.id || s.email || s.name} value={s.name || s.email}>{s.name || s.email}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-400 mb-2">Custom fields</div>
                <CustomFieldEditor
                  entityType="quotes"
                  customFields={customFields}
                  onChange={(updated) => updateQuote({ customFields: updated })}
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-700/30 rounded-2xl p-6 bg-charcoal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-slate-100">Product / Service</h3>
              <div className="flex items-center gap-2">
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="px-3 py-2 border border-slate-700/30 rounded-full text-sm shadow-sm">
                  <option value="">Templates</option>
                  {quoteTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="button" onClick={addFromTemplate} className="px-3 py-2 rounded-full border border-slate-700/30 text-sm shadow-sm">Add</button>
              </div>
            </div>

            <div className="space-y-4">
              {(quote.lineItems || []).map((item, idx) => {
                const itemType = item?.type || 'line_item';
                if (itemType === 'text') {
                  return (
                    <div key={`text-${idx}`} className="border border-slate-700/30 rounded-xl p-3 space-y-2">
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        placeholder="Text block"
                        className="w-full px-3 py-2 border border-slate-700 rounded-md"
                        rows={3}
                      />
                      <div className="text-right">
                        <button type="button" onClick={() => removeLineItem(idx)} className="text-xs font-semibold text-red-600">Remove</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={`item-${idx}`} className="border border-slate-700/30 rounded-2xl p-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="pt-4">
                        <div className="grid grid-cols-2 gap-1">
                          {Array.from({ length: 6 }).map((_, dotIdx) => (
                            <span key={dotIdx} className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                        <input
                          value={item.name || ''}
                          onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                          placeholder="Name"
                          className="px-4 py-3 border border-slate-700/30 rounded-2xl shadow-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          value={item.qty || 0}
                          onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                          placeholder="Quantity"
                          className="px-4 py-3 border border-slate-700/30 rounded-2xl shadow-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          value={item.unitCost || 0}
                          onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)}
                          placeholder="Unit cost"
                          className="px-4 py-3 border border-slate-700/30 rounded-2xl shadow-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          value={item.price || 0}
                          onChange={(e) => updateLineItem(idx, 'price', e.target.value)}
                          placeholder="Unit price"
                          className="px-4 py-3 border border-slate-700/30 rounded-2xl shadow-sm"
                        />
                        <input
                          value={formatCurrency((item.qty || 0) * (item.price || 0))}
                          disabled
                          className="px-4 py-3 border border-slate-700/30 rounded-2xl bg-midnight/60 text-slate-400 shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                      <div>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full px-4 py-3 border border-slate-700/30 rounded-2xl shadow-sm"
                          rows={3}
                        />
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          {['Cheerful','Casual','Professional','Shorter'].map(persona => (
                            <button
                              key={persona}
                              type="button"
                              onClick={() => applyRewriteToItem(idx, persona)}
                              className="px-2 py-1 rounded-full border border-slate-700/30 text-slate-400 hover:text-slate-100"
                            >
                              Rewrite {persona}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="border-2 border-dashed border-slate-700/30 rounded-2xl flex items-center justify-center text-slate-500 text-sm">
                        <input
                          value={item.imageUrl || ''}
                          onChange={(e) => updateLineItem(idx, 'imageUrl', e.target.value)}
                          placeholder="Image URL"
                          className="w-full h-full px-4 py-3 bg-transparent text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!item.isOptional}
                          onChange={(e) => updateLineItem(idx, 'isOptional', e.target.checked)}
                        />
                        Mark as optional
                      </label>
                      <button type="button" onClick={() => removeLineItem(idx)} className="text-xs font-semibold text-red-600">Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button type="button" disabled={!canAddItems} onClick={() => addLineItem()} className="px-5 py-2.5 rounded-full bg-green-700 text-white text-sm font-semibold disabled:bg-slate-600 shadow-sm">New line item</button>
              <button type="button" disabled={!canAddItems} onClick={() => addLineItem({ isOptional: true })} className="px-5 py-2.5 rounded-full border border-slate-700/30 text-green-700 text-sm font-semibold disabled:text-slate-600 shadow-sm">New optional line item</button>
              <button type="button" disabled={!canAddItems} onClick={() => addLineItem({ type: 'text', description: '' })} className="px-5 py-2.5 rounded-full border border-slate-700/30 text-green-700 text-sm font-semibold disabled:text-slate-600 shadow-sm">New text</button>
              {!canAddItems && <span className="text-xs text-slate-400">Limit {MAX_LINE_ITEMS} items</span>}
            </div>
          </div>

          <div className="border border-slate-700/30 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-full border border-slate-700/30 flex items-center justify-center text-xs text-slate-400">CV</span>
              <span className="text-lg font-semibold text-slate-200">Client view</span>
              <button type="button" onClick={() => setShowClientView(v => !v)} className="text-sm font-semibold text-green-700 underline">
                {showClientView ? 'Cancel' : 'Change'}
              </button>
            </div>
            {showClientView && (
              <div className="mt-4 text-sm text-slate-300 space-y-3">
                <div>
                  Adjust what your client will see on this quote. To change the default for all future quotes, visit the{' '}
                  <span className="text-green-700 underline">PDF Style</span>.
                </div>
                <div className="flex flex-wrap gap-6">
                  {['showQuantities','showUnitPrices','showLineItemTotals','showTotals'].map(key => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={quote.clientViewSettings?.[key] !== false}
                        onChange={(e) => updateQuote({ clientViewSettings: { ...quote.clientViewSettings, [key]: e.target.checked } })}
                        className="h-5 w-5 accent-green-600"
                      />
                        {key === 'showQuantities' && 'Quantities'}
                        {key === 'showUnitPrices' && 'Unit prices'}
                        {key === 'showLineItemTotals' && 'Line item totals'}
                        {key === 'showTotals' && 'Totals'}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-700/30 rounded-2xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Client message</h3>
            <textarea
              value={quote.clientMessage || ''}
              onChange={(e) => updateQuote({ clientMessage: e.target.value })}
              placeholder="Message to the client"
              className="w-full px-3 py-2 border border-slate-700 rounded-md"
              rows={4}
            />
            <div className="flex flex-wrap gap-2 text-xs">
              {['Cheerful','Casual','Professional','Shorter'].map(persona => (
                <button
                  key={persona}
                  type="button"
                  onClick={() => applyRewriteToClientMessage(persona)}
                  className="px-2 py-1 rounded-full border border-slate-700/30 text-slate-400 hover:text-slate-100"
                >
                  Rewrite {persona}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-slate-700/30 rounded-2xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">Contract / Disclaimer</h3>
            <textarea
              value={quote.contractTerms || ''}
              onChange={(e) => updateQuote({ contractTerms: e.target.value })}
              placeholder="Contract terms"
              className="w-full px-3 py-2 border border-slate-700 rounded-md"
              rows={4}
            />
            <textarea
              value={quote.disclaimers || ''}
              onChange={(e) => updateQuote({ disclaimers: e.target.value })}
              placeholder="Disclaimers"
              className="w-full px-3 py-2 border border-slate-700 rounded-md"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={applyLegalDefaults}
                onChange={(e) => setApplyLegalDefaults(e.target.checked)}
              />
              Apply to all future quotes
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-slate-700/30 rounded-2xl p-6 bg-charcoal">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Totals</h3>
            <div className="space-y-5 text-sm">
              <div className="flex items-center justify-between border-b border-slate-700/30 pb-4">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(totals.subtotalBeforeDiscount)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-700/30 pb-4">
                <span>Discount</span>
                <button type="button" onClick={() => setShowDiscount(v => !v)} className="text-green-700 font-semibold underline">
                  {showDiscount ? 'Hide Discount' : 'Add Discount'}
                </button>
              </div>
              {showDiscount && (
                <div className="flex gap-2 -mt-2">
                  <select
                    value={quote.quoteDiscountType || 'amount'}
                    onChange={(e) => updateQuote({ quoteDiscountType: e.target.value })}
                    className="px-2 py-2 border border-slate-700/30 rounded-xl"
                  >
                    <option value="amount">Amount</option>
                    <option value="percent">Percent</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={quote.quoteDiscountValue ?? 0}
                    onChange={(e) => updateQuote({ quoteDiscountValue: e.target.value })}
                    className="flex-1 px-2 py-2 border border-slate-700/30 rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-700/30 pb-4">
                <span>Tax</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={quote.taxRate ?? 0}
                    onChange={(e) => updateQuote({ taxRate: e.target.value })}
                    className="w-24 px-3 py-2 border border-slate-700/30 rounded-xl text-right"
                  />
                  <span>%</span>
                  <span className="font-semibold">{formatCurrency(totals.taxAmount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-700/30 pb-4 text-2xl font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Required deposit</span>
                <button type="button" onClick={() => setShowDeposit(v => !v)} className="text-green-700 font-semibold underline">
                  {showDeposit ? 'Hide' : 'Add Required Deposit'}
                </button>
              </div>
              {showDeposit && (
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.01"
                    value={quote.depositRequiredAmount || ''}
                    onChange={(e) => updateQuote({ depositRequiredAmount: e.target.value })}
                    placeholder="Deposit amount"
                    className="w-full px-3 py-2 border border-slate-700/30 rounded-xl"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={quote.depositRequiredPercent || ''}
                    onChange={(e) => updateQuote({ depositRequiredPercent: e.target.value })}
                    placeholder="Deposit percent"
                    className="w-full px-3 py-2 border border-slate-700/30 rounded-xl"
                  />
                  <div className="text-xs text-slate-400">Calculated deposit: {formatCurrency(requiredDeposit)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-700/30 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Deposit payment settings</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <label className="flex items-center justify-between gap-3">
                <span>Accept card payments</span>
                <input
                  type="checkbox"
                  checked={quote.depositSettings?.acceptCard ?? true}
                  onChange={(e) => updateQuote({ depositSettings: { ...quote.depositSettings, acceptCard: e.target.checked } })}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Accept bank payments (ACH)</span>
                <input
                  type="checkbox"
                  checked={quote.depositSettings?.acceptBank ?? false}
                  onChange={(e) => updateQuote({ depositSettings: { ...quote.depositSettings, acceptBank: e.target.checked } })}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Require payment method on file</span>
                <input
                  type="checkbox"
                  checked={quote.depositSettings?.requireMethodOnFile ?? false}
                  onChange={(e) => updateQuote({ depositSettings: { ...quote.depositSettings, requireMethodOnFile: e.target.checked } })}
                />
              </label>
              <div className="text-xs text-slate-400">Updating this quote will not change the default preferences.</div>
            </div>
          </div>

          <div className="border border-slate-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => onSave && onSave('save', { applyLegalDefaults })}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-l-lg hover:bg-green-700"
              >
                Save Quote
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSaveMenuOpen(v => !v)}
                  className="px-3 py-2 bg-green-600 text-white font-semibold rounded-r-lg hover:bg-green-700"
                >
                  v
                </button>
                {saveMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-charcoal border border-slate-700/30 rounded-xl shadow-lg z-20 text-sm">
                    <div className="px-4 py-2 text-xs text-slate-400">Save and...</div>
                    <button type="button" onClick={() => onSave && onSave('email', { applyLegalDefaults })} className="w-full text-left px-4 py-2 hover:bg-midnight/60">Send as Email</button>
                    <button type="button" onClick={() => onSave && onSave('text', { applyLegalDefaults })} className="w-full text-left px-4 py-2 hover:bg-midnight/60">Send as Text Message</button>
                    <button type="button" onClick={() => onSave && onSave('convert', { applyLegalDefaults })} className="w-full text-left px-4 py-2 hover:bg-midnight/60">Convert to Job</button>
                    <button type="button" onClick={() => onSave && onSave('mark_awaiting', { applyLegalDefaults })} className="w-full text-left px-4 py-2 hover:bg-midnight/60">Mark as Awaiting Response</button>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2">Saving will keep the quote in Draft unless you pick another action.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
