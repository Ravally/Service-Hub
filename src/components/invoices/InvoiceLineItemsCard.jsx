import React, { useState } from 'react';
import { toDateInput, toIsoDate } from '../../utils';
import ClampButton from '../clamp/ClampButton';
import ClampIcon from '../clamp/ClampIcon';
import { aiService } from '../../services/aiService';

export default function InvoiceLineItemsCard({ draft, canEdit, updateLineItem, addLineItem, removeLineItem }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiError, setAiError] = useState(null);

  const handleImproveDescriptions = async () => {
    const items = (draft.lineItems || []).filter(i => i.type !== 'text' && i.description);
    if (items.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    setAiResults(null);
    try {
      const descriptions = items.map(i => i.description);
      const improved = await aiService.improveInvoiceDescriptions(descriptions);
      setAiResults(improved);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const applyImproved = () => {
    if (!aiResults) return;
    let resultIdx = 0;
    (draft.lineItems || []).forEach((item, idx) => {
      if (item.type !== 'text' && item.description && resultIdx < aiResults.length) {
        updateLineItem(idx, 'description', aiResults[resultIdx]);
        resultIdx++;
      }
    });
    setAiResults(null);
  };

  const hasDescriptions = (draft.lineItems || []).some(i => i.type !== 'text' && i.description);

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-slate-100">Product / Service</h3>
        <div className="flex items-center gap-2">
          {canEdit && hasDescriptions && (
            <ClampButton label="Clamp Improve" onClick={handleImproveDescriptions} loading={aiLoading} />
          )}
          <button type="button" onClick={() => addLineItem()} className="px-4 py-2 rounded-full bg-scaffld-teal text-white text-sm font-semibold hover:bg-scaffld-teal/90" disabled={!canEdit}>
            Add Line Item
          </button>
        </div>
      </div>

      {aiError && <div className="mb-3 text-xs text-signal-coral">{aiError}</div>}
      {aiResults && (
        <div className="mb-4 border border-clamp-border rounded-xl bg-clamp-soft p-4 space-y-3 animate-fade-in">
          <div className="text-xs font-semibold text-clamp flex items-center gap-1.5">
            <ClampIcon size={14} /> Improved Descriptions
          </div>
          <div className="space-y-2">
            {aiResults.map((desc, i) => (
              <div key={i} className="text-sm text-slate-200 bg-midnight/40 rounded-lg p-3 border border-slate-700/30">{desc}</div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={applyImproved} className="px-3 py-1.5 rounded-full bg-scaffld-teal/20 text-scaffld-teal text-xs font-semibold border border-scaffld-teal/30 hover:bg-scaffld-teal/30">
              Accept All
            </button>
            <button type="button" onClick={() => setAiResults(null)} className="px-3 py-1.5 rounded-full text-slate-400 text-xs font-semibold hover:text-slate-200">
              Keep originals
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(draft.lineItems || []).map((item, idx) => {
          const itemType = item?.type || 'line_item';
          if (itemType === 'text') {
            return (
              <div key={`text-${idx}`} className="border border-slate-700/30 rounded-xl p-3 space-y-2">
                <textarea value={item.description || ''} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Text block" className="w-full px-3 py-2 border border-slate-700 rounded-md text-sm bg-midnight text-slate-100 placeholder-slate-500" rows={3} disabled={!canEdit} />
                {canEdit && (
                  <div className="text-right"><button onClick={() => removeLineItem(idx)} className="text-xs font-semibold text-signal-coral">Remove</button></div>
                )}
              </div>
            );
          }
          const lineTotal = (Number(item.qty || 0) * Number(item.price || 0));
          return (
            <div key={`item-${idx}`} className="border border-slate-700/30 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_0.4fr_0.6fr_0.6fr_auto] gap-3 items-start">
                <div className="space-y-2">
                  <input value={item.name || ''} onChange={(e) => updateLineItem(idx, 'name', e.target.value)} className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm bg-midnight text-slate-100 placeholder-slate-500" placeholder="Name" disabled={!canEdit} />
                  <textarea value={item.description || ''} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm bg-midnight text-slate-100 placeholder-slate-500" rows={3} placeholder="Description" disabled={!canEdit} />
                </div>
                <input type="number" min="0" value={item.qty || 0} onChange={(e) => updateLineItem(idx, 'qty', e.target.value)} className="px-3 py-2 border border-slate-700/30 rounded-xl text-sm text-right bg-midnight text-slate-100" disabled={!canEdit} />
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <input type="number" min="0" value={item.price || 0} onChange={(e) => updateLineItem(idx, 'price', e.target.value)} className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm text-right bg-midnight text-slate-100" disabled={!canEdit} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <input value={lineTotal.toFixed(2)} className="w-full px-3 py-2 border border-slate-700/30 rounded-xl text-sm text-right bg-midnight text-slate-400" disabled />
                </div>
                {canEdit && (
                  <button onClick={() => removeLineItem(idx)} className="px-3 py-2 border border-signal-coral/30 rounded-lg text-signal-coral text-sm font-semibold">Delete</button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between text-sm text-slate-400">
                {item.serviceDate ? (
                  <div className="flex items-center gap-2">
                    <input type="date" value={toDateInput(item.serviceDate)} onChange={(e) => updateLineItem(idx, 'serviceDate', toIsoDate(e.target.value))} className="px-2 py-1 border border-slate-700/30 rounded-md text-sm bg-midnight text-slate-100" disabled={!canEdit} />
                    {canEdit && <button onClick={() => updateLineItem(idx, 'serviceDate', '')} className="text-xs text-slate-400 underline">Clear</button>}
                  </div>
                ) : (
                  <button onClick={() => updateLineItem(idx, 'serviceDate', new Date().toISOString())} className="text-scaffld-teal underline text-sm" disabled={!canEdit}>Set Service Date</button>
                )}
                {item.isOptional && <span className="text-xs text-amber-700">Optional</span>}
              </div>
            </div>
          );
        })}
      </div>
      {draft.lineItems?.length >= 100 && <div className="text-xs text-slate-400 mt-3">Limit 100 line items</div>}
    </div>
  );
}
