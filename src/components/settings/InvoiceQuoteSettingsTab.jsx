import React from 'react';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';

export default function InvoiceQuoteSettingsTab({ tab, companySettings, invoiceSettings, cs, csn, is, handleSaveSettings, handleSaveInvoiceSettings }) {
  if (tab === 'invoices') {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-100 mb-6">Invoice Settings</h3>

        <form onSubmit={handleSaveInvoiceSettings} className={sectionCls}>
          <h4 className={sectionTitle}>Numbering & Terms</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className={labelCls}>Invoice Prefix</label><input type="text" value={invoiceSettings.prefixInv || 'INV'} onChange={e => is({ prefixInv: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Next Number</label><input type="number" min="1" value={invoiceSettings.nextInvCn || 1} onChange={e => is({ nextInvCn: parseInt(e.target.value) || 1 })} className={inputCls} /></div>
            <div><label className={labelCls}>Padding</label><input type="number" min="1" max="8" value={invoiceSettings.padding || 4} onChange={e => is({ padding: parseInt(e.target.value) || 4 })} className={inputCls} /></div>
            <div>
              <label className={labelCls}>Default Payment Term</label>
              <select value={invoiceSettings.defaultTerm} onChange={e => is({ defaultTerm: e.target.value })} className={inputCls}>
                <option>Due Today</option><option>Due on Receipt</option><option>Net 7</option><option>Net 14</option><option>Net 15</option><option>Net 30</option><option>Net 60</option><option>Net 90</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Preview: {invoiceSettings.prefixInv || 'INV'}-{String(invoiceSettings.nextInvCn || 1).padStart(invoiceSettings.padding || 4, '0')}</p>
          <div className="mt-4 text-right"><button type="submit" className={saveBtnCls}>Save Numbering</button></div>
        </form>

        <form onSubmit={handleSaveSettings}>
          <div className={sectionCls}>
            <h4 className={sectionTitle}>Bank Details</h4>
            <p className="text-sm text-slate-400 mb-3">Shown on invoices for direct bank transfer payments.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Bank Name</label><input type="text" value={companySettings.invoiceBankDetails?.bankName || ''} onChange={e => csn('invoiceBankDetails', { bankName: e.target.value })} className={inputCls} placeholder="e.g., ANZ" /></div>
              <div><label className={labelCls}>Account Name</label><input type="text" value={companySettings.invoiceBankDetails?.accountName || ''} onChange={e => csn('invoiceBankDetails', { accountName: e.target.value })} className={inputCls} placeholder="e.g., Scaffld Ltd" /></div>
              <div><label className={labelCls}>Account Number</label><input type="text" value={companySettings.invoiceBankDetails?.accountNumber || ''} onChange={e => csn('invoiceBankDetails', { accountNumber: e.target.value })} className={inputCls} placeholder="e.g., 01-1234-5678900-00" /></div>
              <div><label className={labelCls}>Sort Code / BSB</label><input type="text" value={companySettings.invoiceBankDetails?.sortCode || ''} onChange={e => csn('invoiceBankDetails', { sortCode: e.target.value })} className={inputCls} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Payment Reference</label><input type="text" value={companySettings.invoiceBankDetails?.reference || ''} onChange={e => csn('invoiceBankDetails', { reference: e.target.value })} className={inputCls} placeholder="e.g., Use invoice number as reference" /></div>
            </div>
          </div>

          <div className={sectionCls}>
            <h4 className={sectionTitle}>Default Notes</h4>
            <textarea rows={3} value={companySettings.invoiceDefaultNotes || ''} onChange={e => cs({ invoiceDefaultNotes: e.target.value })} className={inputCls} placeholder="Default notes shown on every invoice (e.g., payment instructions, thank you message)" />
          </div>

          <div className={sectionCls}>
            <h4 className={sectionTitle}>Late Payment Fee</h4>
            <div className="space-y-4">
              <Toggle checked={companySettings.invoiceLateFee?.enabled || false} onChange={v => csn('invoiceLateFee', { enabled: v })} label="Charge late payment fee on overdue invoices" />
              {companySettings.invoiceLateFee?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className={labelCls}>Fee Type</label>
                    <select value={companySettings.invoiceLateFee?.type || 'percent'} onChange={e => csn('invoiceLateFee', { type: e.target.value })} className={inputCls}>
                      <option value="percent">Percentage (%)</option><option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Amount</label><input type="number" step="0.01" min="0" value={companySettings.invoiceLateFee?.amount || 0} onChange={e => csn('invoiceLateFee', { amount: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                  <div><label className={labelCls}>Grace Period (days)</label><input type="number" min="0" value={companySettings.invoiceLateFee?.graceDays || 7} onChange={e => csn('invoiceLateFee', { graceDays: parseInt(e.target.value) || 0 })} className={inputCls} /></div>
                </div>
              )}
            </div>
          </div>

          <div className={sectionCls}>
            <h4 className={sectionTitle}>Tax</h4>
            <Toggle checked={companySettings.taxInclusive || false} onChange={v => cs({ taxInclusive: v })} label="Prices are tax-inclusive by default" />
          </div>

          <div className="text-right"><button type="submit" className={saveBtnCls}>Save Invoice Settings</button></div>
        </form>
      </div>
    );
  }

  // quotes tab
  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Quote Settings</h3>

      <form onSubmit={handleSaveInvoiceSettings} className={sectionCls}>
        <h4 className={sectionTitle}>Numbering</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={labelCls}>Quote Prefix</label><input type="text" value={invoiceSettings.prefixQu || 'QU'} onChange={e => is({ prefixQu: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Next Number</label><input type="number" min="1" value={invoiceSettings.nextQu || 1} onChange={e => is({ nextQu: parseInt(e.target.value) || 1 })} className={inputCls} /></div>
          <div><label className={labelCls}>Job Prefix</label><input type="text" value={invoiceSettings.prefixJob || 'JOB'} onChange={e => is({ prefixJob: e.target.value })} className={inputCls} /></div>
        </div>
        <p className="text-xs text-slate-500 mt-2">Preview: {invoiceSettings.prefixQu || 'QU'}-{String(invoiceSettings.nextQu || 1).padStart(invoiceSettings.padding || 4, '0')}</p>
        <div className="mt-4 text-right"><button type="submit" className={saveBtnCls}>Save Numbering</button></div>
      </form>

      <form onSubmit={handleSaveSettings}>
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Defaults</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Default Validity (days)</label>
              <input type="number" min="1" value={companySettings.quoteValidityDays || 30} onChange={e => cs({ quoteValidityDays: parseInt(e.target.value) || 30 })} className={inputCls} />
              <p className="text-xs text-slate-500 mt-1">How long quotes remain valid after sending</p>
            </div>
            <div>
              <label className={labelCls}>Auto Follow-up (days)</label>
              <input type="number" min="0" value={companySettings.quoteAutoFollowUpDays || 0} onChange={e => cs({ quoteAutoFollowUpDays: parseInt(e.target.value) || 0 })} className={inputCls} />
              <p className="text-xs text-slate-500 mt-1">0 = disabled. Sends a follow-up email after X days</p>
            </div>
          </div>
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Default Notes</h4>
          <textarea rows={3} value={companySettings.quoteDefaultNotes || ''} onChange={e => cs({ quoteDefaultNotes: e.target.value })} className={inputCls} placeholder="Default notes shown on every quote" />
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Terms & Conditions</h4>
          <textarea rows={5} value={companySettings.quoteContractTerms || ''} onChange={e => cs({ quoteContractTerms: e.target.value })} className={inputCls} placeholder="Terms and conditions included with quotes" />
        </div>

        <div className="text-right"><button type="submit" className={saveBtnCls}>Save Quote Settings</button></div>
      </form>
    </div>
  );
}
