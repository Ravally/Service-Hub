import React, { useState } from 'react';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';

function AccountingCard({ provider, label, desc, config, csn, onConnect, onDisconnect, onSyncNow }) {
  const [expanded, setExpanded] = useState(false);
  const connected = config?.connected || false;
  const displayName = config?.companyName || config?.organizationName || '';
  const lastSync = config?.lastSyncAt;
  const syncSettings = config?.syncSettings || {};

  const updateSyncSetting = (key, value) => {
    csn('integrations', {
      [provider]: { ...(config || {}), syncSettings: { ...syncSettings, [key]: value } },
    });
  };

  return (
    <div className={sectionCls}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-100">{label}</h4>
          <p className="text-sm text-slate-400">{desc}</p>
          {connected && displayName && (
            <p className="text-xs text-scaffld-teal mt-1">{displayName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="text-xs font-medium text-scaffld-teal bg-scaffld-teal/10 px-2 py-1 rounded">Connected</span>
              <button type="button" onClick={() => onSyncNow?.(provider)} className="px-3 py-1.5 text-sm font-medium border border-scaffld-teal rounded-md text-scaffld-teal hover:bg-scaffld-teal hover:text-white transition-colors">Sync Now</button>
              <button type="button" onClick={() => setExpanded(e => !e)} className="px-3 py-1.5 text-sm font-medium border border-slate-700 rounded-md text-slate-300 hover:bg-midnight transition-colors">{expanded ? 'Hide' : 'Settings'}</button>
              <button type="button" onClick={() => onDisconnect?.(provider)} className="px-3 py-1.5 text-sm font-medium border border-signal-coral rounded-md text-signal-coral hover:bg-signal-coral hover:text-white transition-colors">Disconnect</button>
            </>
          ) : (
            <button type="button" onClick={() => onConnect?.(provider)} className="px-3 py-1.5 text-sm font-medium border border-slate-700 rounded-md text-slate-300 hover:bg-midnight transition-colors">Connect</button>
          )}
        </div>
      </div>

      {connected && lastSync && (
        <p className="text-xs text-slate-500 mt-2">Last synced: {new Date(lastSync).toLocaleString()}</p>
      )}

      {connected && expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-3">
          <Toggle
            checked={config?.autoSync || false}
            onChange={v => csn('integrations', { [provider]: { ...(config || {}), autoSync: v } })}
            label="Auto-sync when invoices are sent or paid"
          />
          <div className="space-y-2">
            <Toggle checked={syncSettings.syncInvoices ?? true} onChange={v => updateSyncSetting('syncInvoices', v)} label="Sync invoices" />
            <Toggle checked={syncSettings.syncPayments ?? true} onChange={v => updateSyncSetting('syncPayments', v)} label="Sync payments" />
            <Toggle checked={syncSettings.syncContacts ?? true} onChange={v => updateSyncSetting('syncContacts', v)} label="Sync contacts" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className={labelCls}>Revenue Account Code</label>
              <input type="text" value={syncSettings.revenueAccountCode || ''} onChange={e => updateSyncSetting('revenueAccountCode', e.target.value)} className={inputCls + ' font-mono text-sm'} placeholder="e.g. 200" />
            </div>
            <div>
              <label className={labelCls}>Tax Account Code</label>
              <input type="text" value={syncSettings.taxAccountCode || ''} onChange={e => updateSyncSetting('taxAccountCode', e.target.value)} className={inputCls + ' font-mono text-sm'} placeholder="e.g. 820" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPortalTab({ tab, companySettings, cs, csn, handleSaveSettings, onConnectAccounting, onDisconnectAccounting, onSyncNow }) {
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

        {/* Accounting Integrations */}
        <AccountingCard
          provider="quickbooks"
          label="QuickBooks Online"
          desc="Sync invoices, payments, and contacts with QuickBooks"
          config={companySettings.integrations?.quickbooks}
          csn={csn}
          onConnect={onConnectAccounting}
          onDisconnect={onDisconnectAccounting}
          onSyncNow={onSyncNow}
        />
        <AccountingCard
          provider="xero"
          label="Xero"
          desc="Sync invoices, payments, and contacts with Xero accounting"
          config={companySettings.integrations?.xero}
          csn={csn}
          onConnect={onConnectAccounting}
          onDisconnect={onDisconnectAccounting}
          onSyncNow={onSyncNow}
        />

        {/* Google Calendar */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-100">Google Calendar</h4>
              <p className="text-sm text-slate-400">Sync scheduled jobs and appointments</p>
            </div>
            {companySettings.integrations?.googleCalendar?.connected ? (
              <span className="text-xs font-medium text-scaffld-teal bg-scaffld-teal/10 px-2 py-1 rounded">Connected</span>
            ) : (
              <button type="button" className="px-3 py-1.5 text-sm font-medium border border-slate-700 rounded-md text-slate-300 hover:bg-midnight transition-colors">Connect</button>
            )}
          </div>
        </div>

        {/* Twilio SMS */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-100">Twilio SMS</h4>
              <p className="text-sm text-slate-400">Send automated SMS notifications to clients</p>
            </div>
            {companySettings.integrations?.twilio?.connected && (
              <span className="text-xs font-medium text-scaffld-teal bg-scaffld-teal/10 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Account SID</label>
              <input type="text" value={companySettings.integrations?.twilio?.sid || ''} onChange={e => csn('integrations', { twilio: { ...(companySettings.integrations?.twilio || {}), sid: e.target.value } })} className={inputCls + ' font-mono text-sm'} placeholder="AC..." />
            </div>
            <div>
              <label className={labelCls}>Auth Token</label>
              <input type="password" value={companySettings.integrations?.twilio?.token || ''} onChange={e => csn('integrations', { twilio: { ...(companySettings.integrations?.twilio || {}), token: e.target.value } })} className={inputCls + ' font-mono text-sm'} placeholder="Your auth token" />
            </div>
            <div>
              <label className={labelCls}>From Number</label>
              <input type="text" value={companySettings.integrations?.twilio?.from || ''} onChange={e => csn('integrations', { twilio: { ...(companySettings.integrations?.twilio || {}), from: e.target.value } })} className={inputCls + ' font-mono text-sm'} placeholder="+1234567890" />
            </div>
          </div>
        </div>

        {/* SMS Automations */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Automated SMS Notifications</h4>
          <p className="text-sm text-slate-400 mb-4">Messages sent automatically on your behalf via Twilio.</p>
          {!(companySettings.integrations?.twilio?.sid && companySettings.integrations?.twilio?.token && companySettings.integrations?.twilio?.from) && (
            <p className="text-xs text-harvest-amber mb-3">Enter your Twilio credentials above to enable automated SMS.</p>
          )}
          <div className="space-y-3">
            <Toggle
              checked={companySettings.smsAutomation?.appointmentReminders || false}
              onChange={v => csn('smsAutomation', { appointmentReminders: v })}
              label="Appointment reminders — Send clients a reminder the day before their scheduled job"
            />
            <Toggle
              checked={companySettings.smsAutomation?.overdueReminders || false}
              onChange={v => csn('smsAutomation', { overdueReminders: v })}
              label="Overdue invoice reminders — Nudge clients about unpaid invoices (max once per week)"
            />
            <Toggle
              checked={companySettings.smsAutomation?.onMyWay || false}
              onChange={v => csn('smsAutomation', { onMyWay: v })}
              label="On-my-way notifications — Let clients know when you're heading to their job"
            />
            <Toggle
              checked={companySettings.smsAutomation?.jobCompletion || false}
              onChange={v => csn('smsAutomation', { jobCompletion: v })}
              label="Job completion notifications — Notify clients when their job is marked complete"
            />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Send appointment reminders at</label>
            <select
              value={companySettings.smsAutomation?.reminderTime || '18:00'}
              onChange={e => csn('smsAutomation', { reminderTime: e.target.value })}
              className={inputCls + ' w-auto'}
            >
              <option value="18:00">6:00 PM day before</option>
              <option value="08:00">8:00 AM day of</option>
              <option value="09:00">9:00 AM day of</option>
            </select>
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
