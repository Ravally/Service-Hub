import React, { useState } from 'react';
import {
  BriefcaseIcon, InvoiceIcon, FileTextIcon, UsersIcon, UserPlusIcon,
  BellIcon, PaletteIcon, ClockIcon, LinkIcon, CreditCardIcon, GlobeIcon, StarIcon, EditIcon,
} from './icons';
import CompanyBrandingTab from './settings/CompanyBrandingTab';
import InvoiceQuoteSettingsTab from './settings/InvoiceQuoteSettingsTab';
import EmailTemplatesTab from './settings/EmailTemplatesTab';
import StaffTemplatesTab from './settings/StaffTemplatesTab';
import SchedulingNotificationsTab from './settings/SchedulingNotificationsTab';
import IntegrationsPortalTab from './settings/IntegrationsPortalTab';
import BillingAccountTab from './settings/BillingAccountTab';
import BookingSettingsTab from './settings/BookingSettingsTab';
import ReviewSettingsTab from './settings/ReviewSettingsTab';
import CustomFieldsTab from './settings/CustomFieldsTab';
import { hasPermission } from '../utils';
import { useIsMobile } from '../hooks/ui';

export default function SettingsPage({
  companySettings, invoiceSettings, emailTemplates,
  staff, quoteTemplates,
  newStaff, setNewStaff, newTemplate, setNewTemplate,
  logoFile, setLogoFile,
  userProfile, userId,
  handleSaveSettings, handleSaveInvoiceSettings, handleSaveEmailTemplates,
  handleAddTemplate, handleDeleteTemplate, handleLogout,
  handleInviteUser,
  appState,
  onConnectAccounting, onDisconnectAccounting, onSyncNow,
}) {
  const isAdmin = hasPermission(userProfile?.role, 'settings.all');
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'company' : 'account');
  // On mobile, null = show nav list; non-null = show content panel
  const [mobilePanel, setMobilePanel] = useState(null);

  const handleTabSelect = (key) => {
    setActiveTab(key);
    if (isMobile) setMobilePanel(key);
  };

  const cs = (updates) => appState.setCompanySettings({ ...companySettings, ...updates });
  const csn = (key, updates) => cs({ [key]: { ...(companySettings[key] || {}), ...updates } });
  const is = (updates) => appState.setInvoiceSettings({ ...invoiceSettings, ...updates });

  const tabs = [
    ...(isAdmin ? [
      { key: 'company', label: 'Company', icon: BriefcaseIcon },
      { key: 'branding', label: 'Branding', icon: PaletteIcon },
      { key: 'divider-docs', divider: true, sectionLabel: 'Documents' },
      { key: 'invoices', label: 'Invoices', icon: InvoiceIcon },
      { key: 'quotes', label: 'Quotes', icon: FileTextIcon },
      { key: 'email', label: 'Email Templates', icon: FileTextIcon },
      { key: 'templates', label: 'Item Templates', icon: FileTextIcon },
      { key: 'customFields', label: 'Custom Fields', icon: EditIcon },
      { key: 'divider-ops', divider: true, sectionLabel: 'Operations' },
      { key: 'staff', label: 'Staff', icon: UsersIcon },
      { key: 'scheduling', label: 'Scheduling', icon: ClockIcon },
      { key: 'booking', label: 'Online Booking', icon: GlobeIcon },
      { key: 'reviews', label: 'Reviews', icon: StarIcon },
      { key: 'notifications', label: 'Notifications', icon: BellIcon },
      { key: 'divider-connect', divider: true, sectionLabel: 'Connections' },
      { key: 'integrations', label: 'Integrations', icon: LinkIcon },
      { key: 'portal', label: 'Client Portal', icon: GlobeIcon },
      { key: 'divider-billing', divider: true },
      { key: 'billing', label: 'Billing', icon: CreditCardIcon },
    ] : []),
    { key: 'account', label: 'Account', icon: UserPlusIcon },
  ];

  const renderTabContent = () => {
    if ((activeTab === 'company' || activeTab === 'branding') && isAdmin) {
      return <CompanyBrandingTab tab={activeTab} companySettings={companySettings} cs={cs} csn={csn} logoFile={logoFile} setLogoFile={setLogoFile} handleSaveSettings={handleSaveSettings} />;
    }
    if ((activeTab === 'invoices' || activeTab === 'quotes') && isAdmin) {
      return <InvoiceQuoteSettingsTab tab={activeTab} companySettings={companySettings} invoiceSettings={invoiceSettings} cs={cs} csn={csn} is={is} handleSaveSettings={handleSaveSettings} handleSaveInvoiceSettings={handleSaveInvoiceSettings} />;
    }
    if (activeTab === 'email' && isAdmin) {
      return <EmailTemplatesTab emailTemplates={emailTemplates} setEmailTemplates={appState.setEmailTemplates} handleSaveEmailTemplates={handleSaveEmailTemplates} />;
    }
    if ((activeTab === 'staff' || activeTab === 'templates') && isAdmin) {
      return <StaffTemplatesTab tab={activeTab} userId={userId} staff={staff} quoteTemplates={quoteTemplates} newStaff={newStaff} setNewStaff={setNewStaff} newTemplate={newTemplate} setNewTemplate={setNewTemplate} handleAddTemplate={handleAddTemplate} handleDeleteTemplate={handleDeleteTemplate} newInvite={appState.newInvite} setNewInvite={appState.setNewInvite} handleInviteUser={handleInviteUser} userEmail={userProfile?.email} />;
    }
    if (activeTab === 'customFields' && isAdmin) {
      return <CustomFieldsTab userId={userId} />;
    }
    if ((activeTab === 'scheduling' || activeTab === 'notifications') && isAdmin) {
      return <SchedulingNotificationsTab tab={activeTab} companySettings={companySettings} cs={cs} csn={csn} handleSaveSettings={handleSaveSettings} />;
    }
    if (activeTab === 'booking' && isAdmin) {
      return <BookingSettingsTab companySettings={companySettings} cs={cs} csn={csn} handleSaveSettings={handleSaveSettings} userId={userId} />;
    }
    if (activeTab === 'reviews' && isAdmin) {
      return <ReviewSettingsTab companySettings={companySettings} cs={cs} csn={csn} handleSaveSettings={handleSaveSettings} />;
    }
    if ((activeTab === 'integrations' || activeTab === 'portal') && isAdmin) {
      return <IntegrationsPortalTab tab={activeTab} companySettings={companySettings} cs={cs} csn={csn} handleSaveSettings={handleSaveSettings} onConnectAccounting={onConnectAccounting} onDisconnectAccounting={onDisconnectAccounting} onSyncNow={onSyncNow} />;
    }
    if (activeTab === 'billing' && isAdmin) {
      return <BillingAccountTab tab="billing" userProfile={userProfile} handleLogout={handleLogout} />;
    }
    if (activeTab === 'account') {
      return <BillingAccountTab tab="account" userProfile={userProfile} handleLogout={handleLogout} />;
    }
    return null;
  };

  const activeTabLabel = tabs.find(t => t.key === activeTab)?.label || 'Settings';

  // Mobile: full-screen nav pattern (list → tap → content with back button)
  if (isMobile) {
    return (
      <div className="space-y-4">
        {mobilePanel ? (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobilePanel(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-scaffld-teal transition-colors"
                aria-label="Back to settings"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              </button>
              <h2 className="text-xl font-bold font-display text-slate-100">{activeTabLabel}</h2>
            </div>
            <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4">
              {renderTabContent()}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold font-display text-slate-100">Settings</h2>
            <div className="bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden">
              {tabs.map((tab) => {
                if (tab.divider) {
                  return (
                    <div key={tab.key} className="px-4 pt-3 pb-1">
                      {tab.sectionLabel ? (
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{tab.sectionLabel}</p>
                      ) : (
                        <div className="border-t border-slate-700/30" />
                      )}
                    </div>
                  );
                }
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabSelect(tab.key)}
                    className="w-full min-h-[44px] flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-midnight/50 border-b border-slate-700/20 last:border-b-0 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop: side-by-side layout (unchanged)
  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-100">Settings</h2>

      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        <nav className="w-56 flex-shrink-0">
          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-2 sticky top-6">
            {tabs.map((tab) => {
              if (tab.divider) {
                return (
                  <div key={tab.key} className="mt-2 mb-1 px-3">
                    {tab.sectionLabel ? (
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pt-1">{tab.sectionLabel}</p>
                    ) : (
                      <div className="border-t border-slate-700/30" />
                    )}
                  </div>
                );
              }
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-scaffld-teal/10 text-scaffld-teal' : 'text-slate-300 hover:bg-midnight hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4 sm:p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
