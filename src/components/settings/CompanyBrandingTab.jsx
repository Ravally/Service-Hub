import React from 'react';
import { PDF_LAYOUT_OPTIONS } from '../../constants/companyDefaults';
import { BriefcaseIcon } from '../icons';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls } from './settingsShared';

export default function CompanyBrandingTab({ tab, companySettings, cs, csn, logoFile, setLogoFile, handleSaveSettings }) {
  if (tab === 'company') {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-100 mb-6">Company Settings</h3>
        <form onSubmit={handleSaveSettings}>
          <div className="mb-6">
            <label className={labelCls + ' mb-2'}>Company Logo</label>
            <div className="flex items-center gap-6">
              {companySettings.logoUrl ? (
                <img src={companySettings.logoUrl} alt="Company Logo" className="h-20 w-auto object-contain rounded-md border border-slate-700/30 p-1" />
              ) : (
                <div className="h-20 w-20 flex items-center justify-center bg-midnight text-slate-500 rounded-md border border-slate-700/30"><BriefcaseIcon className="h-8 w-8" /></div>
              )}
              <input type="file" accept="image/png, image/jpeg" onChange={(e) => setLogoFile(e.target.files[0])} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-scaffld-teal/15 file:text-scaffld-teal hover:file:bg-scaffld-teal/25" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={labelCls}>Company Name</label><input type="text" value={companySettings.name} onChange={e => cs({ name: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Contact Email</label><input type="email" value={companySettings.email} onChange={e => cs({ email: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Phone Number</label><input type="tel" value={companySettings.phone} onChange={e => cs({ phone: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Address</label><input type="text" value={companySettings.address} onChange={e => cs({ address: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Default GST (%)</label><input type="number" step="0.01" value={companySettings.defaultGstRate ?? 15} onChange={e => cs({ defaultGstRate: parseFloat(e.target.value) })} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Currency</label>
                <select value={companySettings.currencyCode || 'NZD'} onChange={e => cs({ currencyCode: e.target.value, currencySymbol: e.target.value === 'NZD' ? '$' : companySettings.currencySymbol })} className={inputCls}>
                  <option value="NZD">NZD</option><option value="USD">USD</option><option value="AUD">AUD</option><option value="GBP">GBP</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Locale</label>
                <select value={companySettings.locale || 'en-NZ'} onChange={e => cs({ locale: e.target.value })} className={inputCls}>
                  <option value="en-NZ">English (NZ)</option><option value="en-US">English (US)</option><option value="en-AU">English (AU)</option><option value="en-GB">English (UK)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-6 text-right"><button type="submit" className={saveBtnCls}>Save Settings</button></div>
        </form>
      </div>
    );
  }

  // branding tab
  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Branding</h3>
      <form onSubmit={handleSaveSettings}>
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Brand Color</h4>
          <p className="text-sm text-slate-400 mb-3">This color is used on client-facing invoices, quotes, and the client portal.</p>
          <div className="flex items-center gap-4">
            <input type="color" value={companySettings.brandColor || '#0EA5A0'} onChange={e => cs({ brandColor: e.target.value })} className="w-16 h-10 p-1 border border-slate-700 rounded-md bg-midnight cursor-pointer" />
            <input type="text" value={companySettings.brandColor || '#0EA5A0'} onChange={e => cs({ brandColor: e.target.value })} className={inputCls + ' max-w-[140px] font-mono text-sm'} />
            <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: companySettings.brandColor || '#0EA5A0' }} />
          </div>
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>PDF Layout</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PDF_LAYOUT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => cs({ pdfLayout: opt.value })}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  (companySettings.pdfLayout || 'detailed') === opt.value
                    ? 'border-scaffld-teal bg-scaffld-teal/10 text-scaffld-teal'
                    : 'border-slate-700 hover:border-slate-500 text-slate-300'
                }`}
              >
                <p className="font-medium mb-1">{opt.label}</p>
                <p className="text-xs text-slate-400">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Document Footer</h4>
          <p className="text-sm text-slate-400 mb-3">Custom text shown at the bottom of all invoices and quotes (e.g., terms, payment info, company registration).</p>
          <textarea rows={4} value={companySettings.pdfFooterText || ''} onChange={e => cs({ pdfFooterText: e.target.value })} className={inputCls} placeholder="e.g., Payment due within 14 days. Bank: ANZ, Acc: 01-1234-5678900-00" />
        </div>

        <div className="text-right"><button type="submit" className={saveBtnCls}>Save Branding</button></div>
      </form>
    </div>
  );
}
