import React from 'react';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';

export default function IntegrationsPortalTab({ tab, companySettings, cs, csn, handleSaveSettings }) {
  if (tab === 'integrations') {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-100 mb-6">Integrations</h3>

        {/* Stripe */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-100">Stripe</h4>
              <p className="text-sm text-slate-400">Accept online payments via credit/debit card</p>
            </div>
            <Toggle checked={companySettings.integrations?.stripe?.enabled || false} onChange={v => csn('integrations', { stripe: { ...(companySettings.integrations?.stripe || {}), enabled: v } })} label="" />
          </div>
          {companySettings.integrations?.stripe?.enabled && (
            <div className="mt-3">
              <label className={labelCls}>Publishable Key</label>
              <input type="text" value={companySettings.integrations?.stripe?.publishableKey || ''} onChange={e => csn('integrations', { stripe: { ...(companySettings.integrations?.stripe || {}), publishableKey: e.target.value } })} className={inputCls + ' font-mono text-sm'} placeholder="pk_live_..." />
            </div>
          )}
        </div>

        {/* Accounting */}
        {[
          { key: 'xero', name: 'Xero', desc: 'Sync invoices and payments with Xero accounting' },
          { key: 'myob', name: 'MYOB', desc: 'Sync invoices and payments with MYOB' },
        ].map(intg => (
          <div key={intg.key} className={sectionCls}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-100">{intg.name}</h4>
                <p className="text-sm text-slate-400">{intg.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                {companySettings.integrations?.[intg.key]?.connected ? (
                  <span className="text-xs font-medium text-trellio-teal bg-trellio-teal/10 px-2 py-1 rounded">Connected</span>
                ) : (
                  <button type="button" className="px-3 py-1.5 text-sm font-medium border border-slate-700 rounded-md text-slate-300 hover:bg-midnight transition-colors">Connect</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Google Calendar */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-100">Google Calendar</h4>
              <p className="text-sm text-slate-400">Sync scheduled jobs and appointments</p>
            </div>
            {companySettings.integrations?.googleCalendar?.connected ? (
              <span className="text-xs font-medium text-trellio-teal bg-trellio-teal/10 px-2 py-1 rounded">Connected</span>
            ) : (
              <button type="button" className="px-3 py-1.5 text-sm font-medium border border-slate-700 rounded-md text-slate-300 hover:bg-midnight transition-colors">Connect</button>
            )}
          </div>
        </div>

        {/* SMS Provider */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-100">SMS Provider</h4>
              <p className="text-sm text-slate-400">Send appointment reminders via SMS</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Provider</label>
              <select value={companySettings.integrations?.smsProvider?.provider || 'none'} onChange={e => csn('integrations', { smsProvider: { ...(companySettings.integrations?.smsProvider || {}), provider: e.target.value } })} className={inputCls}>
                <option value="none">None</option><option value="twilio">Twilio</option><option value="messagebird">MessageBird</option><option value="vonage">Vonage</option>
              </select>
            </div>
            {companySettings.integrations?.smsProvider?.provider !== 'none' && (
              <div>
                <label className={labelCls}>API Key</label>
                <input type="password" value={companySettings.integrations?.smsProvider?.apiKey || ''} onChange={e => csn('integrations', { smsProvider: { ...(companySettings.integrations?.smsProvider || {}), apiKey: e.target.value } })} className={inputCls + ' font-mono text-sm'} />
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <button type="button" onClick={(e) => { e.preventDefault(); handleSaveSettings(e); }} className={saveBtnCls}>Save Integration Settings</button>
        </div>
      </div>
    );
  }

  // portal tab
  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Client Portal</h3>
      <form onSubmit={handleSaveSettings}>
        <div className={sectionCls}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-slate-100">Enable Client Portal</h4>
              <p className="text-sm text-slate-400">Give clients a self-service portal to view their documents and pay invoices</p>
            </div>
            <Toggle checked={companySettings.clientPortal?.enabled || false} onChange={v => csn('clientPortal', { enabled: v })} label="" />
          </div>
        </div>

        {companySettings.clientPortal?.enabled && (
          <>
            <div className={sectionCls}>
              <h4 className={sectionTitle}>Visibility</h4>
              <p className="text-sm text-slate-400 mb-3">Choose what clients can see in their portal.</p>
              <div className="space-y-3">
                <Toggle checked={companySettings.clientPortal?.showInvoices ?? true} onChange={v => csn('clientPortal', { showInvoices: v })} label="Invoices" />
                <Toggle checked={companySettings.clientPortal?.showQuotes ?? true} onChange={v => csn('clientPortal', { showQuotes: v })} label="Quotes" />
                <Toggle checked={companySettings.clientPortal?.showJobStatus ?? true} onChange={v => csn('clientPortal', { showJobStatus: v })} label="Job status" />
                <Toggle checked={companySettings.clientPortal?.showSchedule || false} onChange={v => csn('clientPortal', { showSchedule: v })} label="Upcoming schedule" />
              </div>
            </div>

            <div className={sectionCls}>
              <h4 className={sectionTitle}>Payments</h4>
              <Toggle checked={companySettings.clientPortal?.allowOnlinePayments ?? true} onChange={v => csn('clientPortal', { allowOnlinePayments: v })} label="Allow clients to pay invoices online" />
              {companySettings.clientPortal?.allowOnlinePayments && !companySettings.integrations?.stripe?.enabled && (
                <p className="text-xs text-harvest-amber mt-2">Requires Stripe integration to be enabled.</p>
              )}
            </div>
          </>
        )}

        <div className="text-right"><button type="submit" className={saveBtnCls}>Save Portal Settings</button></div>
      </form>
    </div>
  );
}
