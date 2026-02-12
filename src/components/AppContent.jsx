import React from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

import { JOB_STATUSES, initialQuoteState, initialJobState } from '../constants';
import { exportPayroll } from '../utils';

// Icons
import {
  PlusCircleIcon, CalendarIcon, InvoiceIcon, BellIcon, BriefcaseIcon,
  UsersIcon, FileTextIcon, DollarSignIcon, TrendingUpIcon,
} from './icons';

// View Components
import ClientDetailView from './ClientDetailView';
import JobDetailView from './JobDetailView';
import Sidebar from './Sidebar';
import DashboardCards from './DashboardCards';
import CalendarView from './CalendarView';
import InvoicePrintView from './InvoicePrintView';
import QuotePrintView from './QuotePrintView';
import QuoteDetailView from './QuoteDetailView';
import QuoteCreateForm from './QuoteCreateForm';
import InvoiceDetailView from './InvoiceDetailView';
import InvoiceCreateFlow from './InvoiceCreateFlow';
import PublicQuoteApproval from './PublicQuoteApproval';
import PublicClientPortal from './PublicClientPortal';
import Auth from './Auth';
import QuotesList from './QuotesList';
import InvoicesList from './InvoicesList';
import SettingsPage from './SettingsPage';
import PropertyDetailView from './PropertyDetailView';
import ClientsList from './ClientsList';
import CreateClient from './CreateClient';
import JobsList from './JobsList';
import TimesheetView from './timesheets/TimesheetView';

/**
 * Main application content component.
 * Handles all view routing and rendering.
 * Receives state, handlers, and auth data as props from App.jsx.
 */
export default function AppContent({ auth, appState, handlers }) {
  const { userId, userProfile } = auth;
  const {
    clients, quotes, jobs, invoices, staff, quoteTemplates, notifications, clientNotes,
    companySettings, invoiceSettings, emailTemplates,
    newQuote, setNewQuote, newJob, setNewJob,
    logoFile, setLogoFile,
    newInvite, setNewInvite, newTemplate, setNewTemplate, newStaff, setNewStaff,
    activeView, setActiveView,
    selectedClient, setSelectedClient,
    selectedProperty, setSelectedProperty,
    selectedJob, setSelectedJob,
    selectedQuote, setSelectedQuote,
    selectedInvoice, setSelectedInvoice,
    invoiceToPrint, setInvoiceToPrint,
    quoteToPrint, setQuoteToPrint,
    invoiceCreateContext, setInvoiceCreateContext,
    clientBeingEdited, setClientBeingEdited,
    autoAddProperty, setAutoAddProperty,
    showJobForm, setShowJobForm,
    showNotifications, setShowNotifications,
    sidebarOpen, setSidebarOpen,
    globalQuery, setGlobalQuery,
    quoteStatusFilter, setQuoteStatusFilter,
    jobStatusFilter, setJobStatusFilter,
    assigneeFilter, setAssigneeFilter,
    invoiceStatusFilter, setInvoiceStatusFilter,
    isLoading,
    scheduleView, updateScheduleView,
    scheduleRange, updateScheduleRange,
    calendarDate, setCalendarDate,
    publicQuoteContext, publicMessage, publicError, publicPortalContext,
    navigateToView,
    clientSearchTerm, setClientSearchTerm,
  } = appState;

  const {
    getClientNameById, getClientById, formatDateTime,
    unreadNotificationsCount, statusColors, stripeEnabled, formatMoney,
    findClientProperty, dashboardStats,
    filteredClients, filteredQuotes, filteredJobs, filteredInvoices,
    handleLogout,
    handleCreateClientPage, handleUpdateClient, handleUpdateProperty, handleDeleteClient,
    handleAddClientNote, handleGenerateClientPortalLink,
    handleCollectPaymentForClient, viewAsClient, downloadVCardForClient,
    archiveClient, startNewPropertyForClient,
    startNewQuote, startQuoteForClient, startJobForClient,
    startInvoiceCreate, startInvoiceForClient, startInvoiceForJob,
    handleSaveQuoteAction, handleScheduleFromQuote,
    handleMarkQuoteAwaiting, handleMarkQuoteApproved,
    handleArchiveQuote, handleCreateSimilarQuote, handlePreviewQuoteAsClient,
    handleCollectDeposit, handleCollectSignature,
    handleUpdateQuote, handleDeleteQuote, handleArchiveQuotes, handleBulkDeleteQuotes,
    publicApprove, publicDecline,
    handleAddJob, handleUpdateJobStatus, handleUpdateJobDetails,
    handleUploadJobAttachment, handleRemoveJobAttachment, toggleNewJobAssignee,
    handleCreateInvoiceFromDraft,
    handleUpdateInvoiceStatus, handleUpdateInvoiceFields,
    handleUploadInvoiceAttachment, handleRemoveInvoiceAttachment,
    handleGeneratePaymentLink, handleApplyInvoiceDefaults,
    handleSendInvoice, handleSendQuote, handleSendQuoteText,
    handleMarkNotificationAsRead,
    handleInviteUser, handleAddTemplate, handleDeleteTemplate,
    handleSaveSettings, handleSaveInvoiceSettings, handleSaveEmailTemplates,
  } = handlers;

  // --- Public views ---
  if (publicQuoteContext) {
    return (
      <PublicQuoteApproval
        quote={publicQuoteContext.quote}
        client={publicQuoteContext.client}
        company={companySettings}
        onApprove={publicApprove}
        onDecline={publicDecline}
        message={publicMessage}
        error={publicError}
      />
    );
  }

  if (publicPortalContext) {
    return <PublicClientPortal uid={publicPortalContext.uid} clientId={publicPortalContext.clientId} company={companySettings} />;
  }

  // Check if loading public view (has token in URL but context not loaded yet)
  const hasPublicToken = new URLSearchParams(window.location.search).has('quoteToken') ||
                         new URLSearchParams(window.location.search).has('portalToken');

  if (hasPublicToken && !publicQuoteContext && !publicPortalContext && !publicError) {
    return (
      <div className="min-h-screen bg-midnight/60 flex items-center justify-center p-6">
        <div className="bg-charcoal rounded-xl shadow-lg p-6 border border-slate-700/30 max-w-lg w-full text-center">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // --- Auth gate ---
  if (!userId || !userProfile) {
    return <Auth />;
  }

  // --- Print views ---
  if (invoiceToPrint) {
    const clientForInvoice = getClientById(invoiceToPrint.clientId);
    return <InvoicePrintView invoice={invoiceToPrint} client={clientForInvoice} company={companySettings} statusColors={statusColors} onBack={() => setInvoiceToPrint(null)} />;
  }
  if (quoteToPrint) {
    const clientForQuote = getClientById(quoteToPrint.clientId);
    return <QuotePrintView quote={quoteToPrint} client={clientForQuote} company={companySettings} statusColors={statusColors} onBack={() => setQuoteToPrint(null)} />;
  }

  const newJobClient = clients.find((c) => c.id === newJob.clientId);
  const newJobProperties = Array.isArray(newJobClient?.properties) ? newJobClient.properties : [];

  // --- Job Form (shared between jobs & schedule views) ---
  const renderJobForm = () => (
    <div className="bg-charcoal p-6 rounded-xl shadow-lg mb-8 border border-slate-700/30 animate-fade-in">
      <form onSubmit={handleAddJob}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Client</label>
            <select value={newJob.clientId} onChange={(e) => { const nextClientId = e.target.value; const nextProperty = findClientProperty(nextClientId, ''); const nextPropertyId = nextProperty?.uid || nextProperty?.id || ''; setNewJob({ ...newJob, clientId: nextClientId, propertyId: nextPropertyId }); }} required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal">
              <option value="" disabled>Select a client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {newJobProperties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Property</label>
              <select value={newJob.propertyId || ''} onChange={(e) => setNewJob({ ...newJob, propertyId: e.target.value })} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal">
                <option value="">Select property</option>
                {newJobProperties.map((p, idx) => <option key={p.uid || p.id || idx} value={p.uid || p.id || String(idx)}>{p.label || p.street1 || `Property ${idx + 1}`}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input type="text" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} placeholder="e.g., House Wash - Front" required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal" />
          </div>
          {activeView === 'jobs' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Type</label>
                <select value={newJob.jobType || 'one_off'} onChange={(e) => { const nextType = e.target.value; setNewJob((prev) => { const next = { ...prev, jobType: nextType }; if (nextType === 'one_off') { next.schedule = 'One-time'; next.billingFrequency = prev.billingFrequency || 'Upon job completion'; } else if (nextType === 'recurring' && (!prev.schedule || prev.schedule === 'One-time')) { next.schedule = 'Weekly'; } return next; }); }} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal">
                  <option value="one_off">One-off job</option>
                  <option value="recurring">Recurring job</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Schedule</label>
                <select value={newJob.schedule || 'One-time'} onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })} disabled={(newJob.jobType || 'one_off') === 'one_off'} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal disabled:bg-midnight/60 disabled:text-slate-500">
                  <option value="One-time">One-time</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Every 2 weeks">Every 2 weeks</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Start</label>
            <input type="datetime-local" value={newJob.start || ''} onChange={(e) => setNewJob({ ...newJob, start: e.target.value })} required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">End (optional)</label>
            <input type="datetime-local" value={newJob.end || ''} onChange={(e) => setNewJob({ ...newJob, end: e.target.value })} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select value={newJob.status} onChange={(e) => setNewJob({ ...newJob, status: e.target.value })} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal">
              {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {activeView === 'jobs' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Billing Frequency</label>
                <select value={newJob.billingFrequency || 'Upon job completion'} onChange={(e) => setNewJob({ ...newJob, billingFrequency: e.target.value })} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal">
                  <option value="Upon job completion">Upon job completion</option>
                  <option value="Per visit">Per visit</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Every 2nd visit">Every 2nd visit</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="auto-payments" type="checkbox" checked={!!newJob.automaticPayments} onChange={(e) => setNewJob({ ...newJob, automaticPayments: e.target.checked })} className="h-4 w-4" />
                <label htmlFor="auto-payments" className="text-sm font-medium text-slate-300">Automatic payments</label>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea value={newJob.notes || ''} onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-trellio-teal/30 focus:border-trellio-teal" placeholder="Special instructions, access details, etc." />
          </div>
          {activeView === 'schedule' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Assign Staff</label>
              {staff.length === 0 ? (
                <p className="text-sm text-slate-400">No staff yet. Add staff in Settings.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {staff.map(s => (
                    <label key={s.id} className="inline-flex items-center text-sm bg-midnight/60 px-2 py-1 rounded-md border">
                      <input type="checkbox" checked={(newJob.assignees || []).includes(s.id)} onChange={() => toggleNewJobAssignee(s.id)} className="mr-2" />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 text-right flex gap-2 justify-end">
          <button type="button" onClick={() => setShowJobForm(false)} className="px-6 py-2 text-slate-300 font-semibold rounded-lg border border-slate-700 hover:bg-midnight/60">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-trellio-teal text-white font-semibold rounded-lg shadow-md hover:bg-trellio-teal/80">Save Job</button>
        </div>
      </form>
    </div>
  );

  // --- Job Detail shared renderer ---
  const renderJobDetail = (backLabel) => (
    <JobDetailView
      job={selectedJob}
      client={clients.find(c => c.id === selectedJob.clientId) || null}
      quote={quotes.find(q => q.id === selectedJob.quoteId) || null}
      invoices={invoices}
      visits={selectedJob.visits || []}
      onBack={() => setSelectedJob(null)}
      onUpdate={handleUpdateJobDetails}
      getClientNameById={getClientNameById}
      formatDateTime={formatDateTime}
      statusColors={statusColors}
      staff={staff}
      onOpenClient={(clientId) => { const c = clients.find(cl=>cl.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
      onUploadAttachment={(file) => handleUploadJobAttachment(selectedJob, file)}
      onRemoveAttachment={(url) => handleRemoveJobAttachment(selectedJob, url)}
      onCreateInvoice={(job) => startInvoiceForJob(job)}
      onOpenQuote={(q) => { if (q) { setActiveView('quotes'); setSelectedQuote(q); } }}
      backLabel={backLabel}
      userRole={userProfile?.role}
    />
  );

  return (
    <div className="min-h-screen bg-midnight font-sans text-slate-100 flex">
      <Sidebar
        activeView={activeView}
        setActiveView={navigateToView}
        onCreateAction={(type) => {
          if (type === 'client') { setActiveView('createClient'); }
          else if (type === 'request') { setActiveView('requests'); }
          else if (type === 'quote') { startNewQuote(); }
          else if (type === 'job') { setActiveView('schedule'); setShowJobForm(true); }
          else if (type === 'invoice') { startInvoiceCreate(); }
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 max-w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-md border border-slate-700" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <span className="block w-5 h-0.5 bg-slate-300 mb-1"></span>
              <span className="block w-5 h-0.5 bg-slate-300 mb-1"></span>
              <span className="block w-5 h-0.5 bg-slate-300"></span>
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-display text-slate-100 tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
                    const name = userProfile?.firstName || ((userProfile?.email?.split('@')[0] || '').split(/[._-]/)[0].replace(/^./, c => c.toUpperCase()));
                    return name ? `${greeting}, ${name}` : greeting;
                  })()}
                </h1>
                {(() => {
                  const mode = import.meta.env.MODE;
                  if (mode === 'staging') return <span className="px-2 py-1 text-xs font-semibold rounded bg-harvest-amber/20 text-harvest-amber border border-harvest-amber/30">Staging</span>;
                  return null;
                })()}
              </div>
              <p className="hidden md:block text-sm text-slate-500 mt-0.5">Run smarter. Grow faster.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="hidden md:block">
              <input
                value={globalQuery}
                onChange={(e)=>setGlobalQuery(e.target.value)}
                onKeyDown={(e)=>{ if (e.key === 'Enter') { setActiveView('clients'); setClientSearchTerm(globalQuery); } }}
                placeholder="Search clients..."
                className="px-3 py-2 bg-charcoal border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20 w-64 transition-all"
                aria-label="Global search"
              />
            </div>
            <button onClick={() => setShowNotifications(s => !s)} className="relative text-slate-400 hover:text-trellio-teal transition-colors">
              <BellIcon />
              {unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-coral opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-signal-coral text-white text-xs items-center justify-center">{unreadNotificationsCount}</span></span>}
            </button>
            {showNotifications && (
              <div className="fixed right-6 top-16 w-96 bg-charcoal rounded-lg shadow-xl border border-slate-700/30 z-50 animate-fade-in-fast max-h-[60vh] overflow-y-auto">
                <div className="p-3 border-b border-slate-700/30 font-semibold text-sm text-slate-100">Notifications</div>
                <ul className="divide-y divide-slate-700/30">{notifications.map(n => (<li key={n.id} className={`p-3 text-sm ${!n.read ? 'bg-trellio-teal/10' : ''}`}><p className="text-slate-100">{n.message}</p><div className="flex justify-between items-center mt-1"><p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>{!n.read && <button onClick={() => handleMarkNotificationAsRead(n.id)} className="text-xs font-semibold text-trellio-teal hover:underline">Mark as read</button>}</div></li>))}</ul>
              </div>
            )}
          </div>
        </header>

        <main>
          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <div>
              <DashboardCards quotes={quotes} jobs={jobs} invoices={invoices} onNewQuote={() => { startNewQuote(); }} onNewJob={() => { setActiveView('schedule'); setShowJobForm(true); }} formatMoney={formatMoney} />
              <div className="mt-8 bg-charcoal rounded-xl shadow-lg border border-slate-700/30">
                <div className="px-4 py-3 border-b border-slate-700/30 font-semibold text-slate-100">Today's Appointments</div>
                {(() => {
                  const today = new Date().toDateString();
                  const todays = jobs.filter(j => j.start && new Date(j.start).toDateString() === today);
                  const total = todays.length;
                  const totalVal = todays.reduce((s,j)=>{ const q = quotes.find(x => x.id === j.quoteId); return s + (q?.total || 0); },0);
                  const active = todays.filter(j=>j.status==='In Progress').length;
                  const complete = todays.filter(j=>j.status==='Completed').length;
                  const toGo = Math.max(0, total - active - complete);
                  const Box = ({bgColor,title,count,val}) => (
                    <div className="flex items-center gap-3 bg-charcoal rounded-lg p-3 border border-slate-700/30">
                      <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold font-display ${bgColor}`}>{count}</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{title}</div>
                        <div className="text-xs font-mono text-slate-500">{formatMoney(val)}</div>
                      </div>
                    </div>
                  );
                  return (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Box bgColor="bg-slate-700" title="Total" count={total} val={totalVal} />
                      <Box bgColor="bg-muted" title="To Go" count={toGo} val={0} />
                      <Box bgColor="bg-blue-500" title="Active" count={active} val={0} />
                      <Box bgColor="bg-trellio-teal" title="Complete" count={complete} val={0} />
                    </div>
                  );
                })()}
              </div>

              {/* Upcoming Schedule + Revenue Summary */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Schedule */}
                <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-harvest-amber/10 text-harvest-amber"><CalendarIcon /></span>
                      <span className="font-semibold text-sm text-slate-100">Upcoming Schedule</span>
                    </div>
                    <button onClick={() => setActiveView('schedule')} className="text-xs text-trellio-teal hover:underline">View all</button>
                  </div>
                  <div className="p-4 max-h-[24rem] overflow-y-auto">
                    {(() => {
                      const now = new Date();
                      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                      const endRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8);
                      const upcoming = jobs
                        .filter(j => j.start && new Date(j.start) >= startOfTomorrow && new Date(j.start) < endRange)
                        .sort((a, b) => new Date(a.start) - new Date(b.start));
                      if (upcoming.length === 0) {
                        return <div className="text-center py-8 text-slate-500 text-sm">No upcoming jobs in the next 7 days.</div>;
                      }
                      const groups = {};
                      upcoming.forEach(j => {
                        const d = new Date(j.start);
                        const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
                        (groups[key] = groups[key] || []).push(j);
                      });
                      const dayLabel = (iso) => {
                        const d = new Date(iso);
                        const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                        if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
                        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      };
                      return Object.keys(groups).sort().map(key => (
                        <div key={key} className="mb-3 last:mb-0">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{dayLabel(key)}</div>
                          <div className="space-y-1.5">
                            {groups[key].map(job => (
                              <div key={job.id} onClick={() => { setSelectedJob(job); setActiveView('schedule'); }} className="flex items-center justify-between px-3 py-2 bg-midnight rounded-lg border border-slate-700/30 hover:border-trellio-teal/30 cursor-pointer transition-colors">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-trellio-teal truncate">{job.title}</p>
                                  <p className="text-xs text-slate-500">{new Date(job.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  {(job.assignees || []).slice(0, 2).map(id => {
                                    const s = staff.find(x => x.id === id);
                                    return <span key={id} className="inline-block h-5 w-5 rounded-full border-2 border-midnight" style={{ backgroundColor: s?.color || '#9CA3AF' }} title={s?.name || ''} />;
                                  })}
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${statusColors[job.status] || 'bg-slate-700/30 text-slate-300'}`}>{job.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Revenue Summary */}
                <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-trellio-teal/10 text-trellio-teal"><DollarSignIcon /></span>
                      <span className="font-semibold text-sm text-slate-100">Revenue Summary</span>
                    </div>
                    <button onClick={() => setActiveView('invoices')} className="text-xs text-trellio-teal hover:underline">View invoices</button>
                  </div>
                  <div className="p-5">
                    {(() => {
                      const now = new Date();
                      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                      const paidThisMonth = invoices
                        .filter(inv => inv.status === 'Paid' && inv.paidAt && new Date(inv.paidAt) >= monthStart)
                        .reduce((sum, inv) => sum + (inv.total || 0), 0);
                      const outstanding = invoices
                        .filter(inv => ['Sent', 'Unpaid', 'Partially Paid'].includes(inv.status))
                        .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.payments || []).reduce((ps, p) => ps + (p.amount || 0), 0)), 0);
                      const overdue = invoices
                        .filter(inv => ['Sent', 'Unpaid', 'Partially Paid'].includes(inv.status) && inv.dueDate && new Date(inv.dueDate) < now)
                        .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.payments || []).reduce((ps, p) => ps + (p.amount || 0), 0)), 0);
                      const total = paidThisMonth + outstanding;
                      const paidPct = total > 0 ? Math.round((paidThisMonth / total) * 100) : 0;
                      return (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-400">Revenue this month</div>
                            <div className="text-lg font-display font-semibold text-trellio-teal">{formatMoney(paidThisMonth)}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-400">Outstanding</div>
                            <div className="text-lg font-display font-semibold text-harvest-amber">{formatMoney(outstanding)}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-400">Overdue</div>
                            <div className="text-lg font-display font-semibold text-signal-coral">{formatMoney(overdue)}</div>
                          </div>
                          {/* Progress bar */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span>Collected vs Outstanding</span>
                              <span>{paidPct}% collected</span>
                            </div>
                            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-trellio-teal rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                            </div>
                          </div>
                          {/* Quick totals */}
                          <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Total invoiced this month</span>
                            <span className="text-sm font-semibold text-slate-100">{formatMoney(total)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-6 bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-signal-coral/10 text-signal-coral"><TrendingUpIcon /></span>
                    <span className="font-semibold text-sm text-slate-100">Recent Activity</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {(() => {
                    const timeAgo = (dateStr) => {
                      if (!dateStr) return '';
                      const diff = Date.now() - new Date(dateStr).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return 'Just now';
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h ago`;
                      const days = Math.floor(hrs / 24);
                      if (days === 1) return 'Yesterday';
                      if (days < 7) return `${days}d ago`;
                      return new Date(dateStr).toLocaleDateString();
                    };
                    const activities = [];
                    clients.forEach(c => {
                      if (c.createdAt) activities.push({ type: 'client', icon: <UsersIcon />, iconBg: 'bg-blue-500/10 text-blue-400', text: `New client added: ${c.name}`, date: c.createdAt, onClick: () => { setSelectedClient(c); setActiveView('clients'); } });
                    });
                    quotes.forEach(q => {
                      const cName = clients.find(c => c.id === q.clientId)?.name || 'Unknown';
                      if (q.createdAt) activities.push({ type: 'quote', icon: <FileTextIcon />, iconBg: 'bg-signal-coral/10 text-signal-coral', text: `Quote created for ${cName}`, date: q.createdAt, onClick: () => { setSelectedQuote(q); setActiveView('quotes'); } });
                      if (q.sentAt) activities.push({ type: 'quote', icon: <FileTextIcon />, iconBg: 'bg-signal-coral/10 text-signal-coral', text: `Quote sent to ${cName}`, date: q.sentAt, onClick: () => { setSelectedQuote(q); setActiveView('quotes'); } });
                    });
                    jobs.forEach(j => {
                      if (j.createdAt) activities.push({ type: 'job', icon: <BriefcaseIcon />, iconBg: 'bg-harvest-amber/10 text-harvest-amber', text: `Job created: ${j.title}`, date: j.createdAt, onClick: () => { setSelectedJob(j); setActiveView('jobs'); } });
                    });
                    invoices.forEach(inv => {
                      const cName = clients.find(c => c.id === inv.clientId)?.name || 'Unknown';
                      if (inv.createdAt) activities.push({ type: 'invoice', icon: <InvoiceIcon />, iconBg: 'bg-trellio-teal/10 text-trellio-teal', text: `Invoice created for ${cName}`, date: inv.createdAt, onClick: () => { setSelectedInvoice(inv); setActiveView('invoices'); } });
                      if (inv.paidAt) activities.push({ type: 'invoice', icon: <DollarSignIcon />, iconBg: 'bg-trellio-teal/10 text-trellio-teal', text: `Invoice paid by ${cName}`, date: inv.paidAt, onClick: () => { setSelectedInvoice(inv); setActiveView('invoices'); } });
                    });
                    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
                    const recent = activities.slice(0, 10);
                    if (recent.length === 0) {
                      return <div className="text-center py-8 text-slate-500 text-sm">No recent activity yet.</div>;
                    }
                    return recent.map((a, i) => (
                      <div key={`${a.type}-${i}`} onClick={a.onClick} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-dark/50 cursor-pointer transition-colors">
                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0 ${a.iconBg}`}>{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-100 truncate">{a.text}</p>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{timeAgo(a.date)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Create Client */}
          {activeView === 'createClient' && (
            <CreateClient
              initialClient={clientBeingEdited}
              autoAddProperty={autoAddProperty}
              onBack={() => { setClientBeingEdited(null); setAutoAddProperty(false); setActiveView('clients'); }}
              onSave={(payload, opts) => { setAutoAddProperty(false); return handleCreateClientPage(payload, { ...(opts||{}), editClientId: clientBeingEdited?.id }); }}
            />
          )}

          {/* Clients */}
          {activeView === 'clients' && (
            <div>
              {selectedClient ? (
                selectedProperty ? (
                  <PropertyDetailView
                    client={selectedClient} property={selectedProperty} quotes={quotes} jobs={jobs}
                    onBack={() => setSelectedProperty(null)}
                    onOpenQuote={(q) => { setActiveView('quotes'); setSelectedQuote(q); }}
                    onOpenJob={(j) => { setActiveView('schedule'); setSelectedJob(j); }}
                    onEditClient={(c) => { setSelectedProperty(null); setClientBeingEdited(c); setActiveView('createClient'); }}
                    onUpdateProperty={handleUpdateProperty}
                    onCreateQuote={startQuoteForClient}
                    onCreateJob={startJobForClient}
                  />
                ) : (
                  <ClientDetailView
                    client={selectedClient}
                    onBack={() => { setSelectedClient(null); setSelectedProperty(null); }}
                    onUpdate={handleUpdateClient}
                    handleDeleteClient={handleDeleteClient}
                    quotes={quotes} jobs={jobs} invoices={invoices} notifications={notifications}
                    statusColors={statusColors} formatDateTime={formatDateTime}
                    clientNotes={clientNotes} onAddNote={handleAddClientNote}
                    onGeneratePortalLink={handleGenerateClientPortalLink}
                    onCreateProperty={startNewPropertyForClient}
                    onCreateQuote={startQuoteForClient}
                    onCreateJob={startJobForClient}
                    onCreateInvoice={startInvoiceForClient}
                    onCollectPayment={handleCollectPaymentForClient}
                    onViewAsClient={viewAsClient}
                    onDownloadVCard={downloadVCardForClient}
                    onArchiveClient={archiveClient}
                    onOpenProperty={(prop) => setSelectedProperty(prop)}
                    onEditClient={(c) => { setClientBeingEdited(c); setActiveView('createClient'); }}
                    onOpenInvoice={(inv) => { setActiveView('invoices'); setSelectedInvoice(inv); }}
                    onOpenQuote={(q) => { setActiveView('quotes'); setSelectedQuote(q); }}
                    onOpenJob={(j) => { setActiveView('schedule'); setSelectedJob(j); }}
                    userRole={userProfile?.role}
                  />
                )
              ) : (
                <ClientsList
                  clients={clients} quotes={quotes} jobs={jobs} invoices={invoices}
                  onSelectClient={(c) => { setSelectedProperty(null); setSelectedClient(c); }}
                  onNewClientClick={() => { setActiveView('createClient'); }}
                />
              )}
            </div>
          )}

          {/* Jobs */}
          {activeView === 'jobs' && (
            <div>
              {selectedJob ? renderJobDetail('Back to jobs') : (
                <div>
                  <JobsList jobs={jobs} clients={clients} quotes={quotes} invoices={invoices} onOpenJob={(job) => setSelectedJob(job)} onNewJobClick={() => setShowJobForm(s=>!s)} onManageJobForms={() => setActiveView('settings')} />
                  {showJobForm && renderJobForm()}
                </div>
              )}
            </div>
          )}

          {/* Quotes */}
          {activeView === 'quotes' && (
            <div>
              {selectedQuote ? (
                <QuoteDetailView
                  quote={selectedQuote} client={getClientById(selectedQuote.clientId)} clients={clients}
                  onBack={() => setSelectedQuote(null)} statusColors={statusColors}
                  onUpdate={handleUpdateQuote} onSendEmail={handleSendQuote} onSendText={handleSendQuoteText}
                  onPrint={(q) => setQuoteToPrint(q)} onConvertToJob={handleScheduleFromQuote}
                  onCreateSimilar={handleCreateSimilarQuote} onCollectDeposit={handleCollectDeposit}
                  onPreviewClient={handlePreviewQuoteAsClient} onMarkAwaiting={handleMarkQuoteAwaiting}
                  onMarkApproved={handleMarkQuoteApproved} onCollectSignature={handleCollectSignature}
                  onArchiveQuote={handleArchiveQuote}
                  onOpenClient={(clientId) => { const c = clients.find(cl=>cl.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
                  userRole={userProfile?.role} defaultTaxRate={companySettings?.defaultGstRate}
                />
              ) : (
                <QuotesList
                  quotes={quotes} clients={clients} jobs={jobs}
                  onOpenQuote={(q)=> setSelectedQuote(q)} onNewQuoteClick={() => startNewQuote()}
                  onArchiveQuotes={handleArchiveQuotes} onDeleteQuotes={handleBulkDeleteQuotes}
                  onConvertQuote={handleScheduleFromQuote} onSendQuote={handleSendQuote}
                />
              )}
            </div>
          )}

          {/* Create Quote */}
          {activeView === 'createQuote' && (
            <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-charcoal border-t-4 border-signal-coral px-4 sm:px-6 lg:px-8 py-6">
              <QuoteCreateForm
                quote={newQuote} setQuote={setNewQuote}
                clients={clients} staff={staff} quoteTemplates={quoteTemplates}
                companySettings={companySettings} onSave={handleSaveQuoteAction}
                onCancel={() => { setActiveView('quotes'); setNewQuote(initialQuoteState); }}
              />
            </div>
          )}

          {/* Create Invoice */}
          {activeView === 'createInvoice' && (
            <div className="max-w-6xl mx-auto">
              <InvoiceCreateFlow
                clients={clients} jobs={jobs} invoices={invoices}
                companySettings={companySettings} invoiceSettings={invoiceSettings}
                initialClientId={invoiceCreateContext.clientId}
                initialJobIds={invoiceCreateContext.jobIds}
                initialMode={invoiceCreateContext.mode}
                onCancel={() => { setActiveView('invoices'); setSelectedInvoice(null); setInvoiceCreateContext({ clientId: '', jobIds: [], mode: 'job' }); }}
                onCreateInvoice={(draft) => handleCreateInvoiceFromDraft(draft)}
              />
            </div>
          )}

          {/* Schedule */}
          {activeView === 'schedule' && (
            <div>
              {selectedJob ? renderJobDetail(undefined) : (
                <div>
                  <div className="mb-6 flex justify-between items-center">
                    <div className="flex items-center">
                      <h2 className="text-2xl font-semibold font-display text-slate-100 flex items-center"><CalendarIcon /> Schedule</h2>
                      <div className="ml-4 flex items-center gap-3">
                        <span className="isolate inline-flex rounded-md shadow-sm">
                          <button onClick={() => updateScheduleView('list')} className={`relative inline-flex items-center rounded-l-md px-3 py-1 text-sm font-semibold transition-colors ${scheduleView === 'list' ? 'bg-trellio-teal text-white' : 'bg-charcoal text-slate-300 border border-slate-700 hover:bg-slate-dark'}`}>List</button>
                          <button onClick={() => updateScheduleView('calendar')} className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1 text-sm font-semibold transition-colors ${scheduleView === 'calendar' ? 'bg-trellio-teal text-white' : 'bg-charcoal text-slate-300 border border-slate-700 hover:bg-slate-dark'}`}>Calendar</button>
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">Range</label>
                          <select value={scheduleRange} onChange={(e)=>updateScheduleRange(e.target.value)} className="px-2 py-1 bg-charcoal border border-slate-700 text-slate-100 rounded-md text-xs focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20">
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowJobForm(s => !s)} className="flex items-center justify-center px-4 py-2 bg-trellio-teal text-white font-semibold rounded-lg shadow-md hover:bg-trellio-teal-deep focus:outline-none focus:ring-2 focus:ring-trellio-teal/40 transition-colors"><PlusCircleIcon /><span>{showJobForm ? 'Cancel' : 'Schedule Job'}</span></button>
                  </div>
                  {showJobForm && renderJobForm()}
                  {/* Job status filter chips */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {JOB_STATUSES.map(s => {
                      const active = jobStatusFilter.includes(s);
                      return <button key={s} onClick={() => appState.setJobStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-trellio-teal text-white border-trellio-teal' : 'bg-charcoal text-slate-300 border-slate-700'}`}>{s}</button>;
                    })}
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-xs text-slate-400">Assignee</label>
                      <select value={assigneeFilter} onChange={(e)=>appState.setAssigneeFilter(e.target.value)} className="px-2 py-1 bg-charcoal border border-slate-700 text-slate-100 rounded-md text-xs focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20">
                        <option value="">All</option>
                        <option value="unassigned">Unassigned</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {(jobStatusFilter.length>0 || assigneeFilter) && <button onClick={() => { appState.setJobStatusFilter([]); appState.setAssigneeFilter(''); }} className="px-2 py-1 rounded-full text-xs font-medium bg-charcoal text-slate-300 border border-slate-700">Clear</button>}
                  </div>
                  {scheduleView === 'list' ? (
                    <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 overflow-hidden">{isLoading ? <div className="text-center p-10 text-slate-400">Loading...</div> : filteredJobs.length === 0 ? <div className="text-center p-10 text-slate-400"><h3 className="text-lg font-medium">No jobs scheduled!</h3></div> : (
                      (() => {
                        const groups = filteredJobs.reduce((acc, job) => {
                          const d = job.start ? new Date(job.start) : null;
                          const key = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString() : 'unscheduled';
                          (acc[key] = acc[key] || []).push(job);
                          return acc;
                        }, {});
                        const keys = Object.keys(groups).sort();
                        return (
                          <div>
                            {keys.map(k => (
                              <div key={k} className="border-b border-slate-700/30 last:border-b-0">
                                <div className="bg-midnight px-4 py-2 text-sm font-semibold text-slate-300">{k === 'unscheduled' ? 'Unscheduled' : new Date(k).toLocaleDateString()}</div>
                                <ul className="divide-y divide-slate-700/30">
                                  {groups[k].sort((a,b)=> new Date(a.start||0) - new Date(b.start||0)).map(job => (
                                    <li key={job.id} onClick={() => setSelectedJob(job)} className="list-row cursor-pointer">
                                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="font-semibold text-trellio-teal">{job.title}</p>
                                          <p className="text-sm text-slate-400">{getClientNameById(job.clientId)}</p>
                                          {(job.assignees && job.assignees.length>0) && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {job.assignees.map(id => { const s = staff.find(x=>x.id===id); return <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{backgroundColor: (s?.color || '#E5E7EB'), color: '#111827'}}>{s?.name || 'Unknown'}</span> })}
                                            </div>
                                          )}
                                          <div className="mt-2"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>{job.status}</span></div>
                                        </div>
                                        <div className="flex flex-col items-start sm:items-end mt-4 sm:mt-0">
                                          <p className="text-md font-semibold text-slate-100">{formatDateTime(job.start)}</p>
                                          <div className="mt-2 w-40"><select value={job.status} onClick={(e) => e.stopPropagation()} onChange={(e) => handleUpdateJobStatus(job, e.target.value)} className="w-full p-1 bg-midnight border border-slate-700 text-slate-100 rounded-md shadow-sm text-xs focus:ring-trellio-teal/20 focus:border-trellio-teal"><option disabled>Change status...</option>{JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}</div>
                  ) : scheduleView === 'calendar' ? (
                    <CalendarView jobs={filteredJobs} staff={staff} calendarDate={calendarDate} setCalendarDate={setCalendarDate} onJobSelect={setSelectedJob} scheduleRange={scheduleRange} />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Invoices */}
          {activeView === 'invoices' && (
            <div>
              {selectedInvoice ? (
                <InvoiceDetailView
                  invoice={selectedInvoice} client={getClientById(selectedInvoice.clientId)}
                  company={companySettings} onBack={() => setSelectedInvoice(null)} statusColors={statusColors}
                  onUpdateStatus={handleUpdateInvoiceStatus} onUpdateFields={handleUpdateInvoiceFields}
                  onSend={handleSendInvoice} onPrint={(inv) => setInvoiceToPrint(inv)}
                  onGeneratePaymentLink={handleGeneratePaymentLink}
                  onUploadAttachment={(invoice, file) => handleUploadInvoiceAttachment(invoice, file)}
                  onRemoveAttachment={(invoice, url) => handleRemoveInvoiceAttachment(invoice, url)}
                  onApplyInvoiceDefaults={handleApplyInvoiceDefaults}
                  onOpenClient={(clientId) => { const c = clients.find(cl=>cl.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
                  userRole={userProfile?.role} defaultTaxRate={companySettings?.defaultGstRate}
                  stripeEnabled={stripeEnabled}
                />
              ) : (
                <InvoicesList invoices={invoices} clients={clients} onOpenInvoice={(inv)=> setSelectedInvoice(inv)} onNewInvoice={() => startInvoiceCreate()} />
              )}
            </div>
          )}

          {/* Settings */}
          {activeView === 'settings' && (
            <SettingsPage
              companySettings={companySettings}
              invoiceSettings={invoiceSettings}
              emailTemplates={emailTemplates}
              staff={staff}
              quoteTemplates={quoteTemplates}
              newStaff={newStaff}
              setNewStaff={setNewStaff}
              newTemplate={newTemplate}
              setNewTemplate={setNewTemplate}
              logoFile={logoFile}
              setLogoFile={setLogoFile}
              userProfile={userProfile}
              userId={userId}
              handleSaveSettings={handleSaveSettings}
              handleSaveInvoiceSettings={handleSaveInvoiceSettings}
              handleSaveEmailTemplates={handleSaveEmailTemplates}
              handleAddTemplate={handleAddTemplate}
              handleDeleteTemplate={handleDeleteTemplate}
              handleLogout={handleLogout}
              appState={appState}
            />
          )}

          {/* Timesheets */}
          {activeView === 'timesheets' && (
            <TimesheetView
              onExportPayroll={(entries, format) => {
                const startDate = entries[0]?.start;
                const endDate = entries[entries.length - 1]?.start;
                exportPayroll(entries, staff, clients, { startDate, endDate, format });
              }}
              onOpenJob={(job) => {
                setActiveView('schedule');
                setSelectedJob(job);
              }}
            />
          )}

          {/* Placeholder pages */}
          {['requests','reports','expenses','apps'].includes(activeView) && (() => {
            const pageConfig = {
              requests: {
                icon: <BellIcon className="h-12 w-12 text-trellio-teal" />,
                title: 'Service Requests',
                description: 'Accept and manage service requests from customers online. Streamline your intake process and never miss a lead.',
                features: [
                  'Accept requests from customers via online forms',
                  'Auto-create quotes from incoming requests',
                  'Track request status and response times',
                  'Customer self-service portal integration',
                ],
              },
              reports: {
                icon: <TrendingUpIcon className="h-12 w-12 text-trellio-teal" />,
                title: 'Reports & Analytics',
                description: 'Get actionable insights into your business performance with detailed reports and visual dashboards.',
                features: [
                  'Revenue and profit trend reports',
                  'Job completion and scheduling analytics',
                  'Staff productivity and utilisation dashboards',
                  'Client retention and growth metrics',
                ],
              },
              expenses: {
                icon: <DollarSignIcon className="h-12 w-12 text-trellio-teal" />,
                title: 'Expense Tracking',
                description: 'Log and categorise business expenses to keep your finances organised and tax-ready.',
                features: [
                  'Log expenses against jobs or projects',
                  'Attach receipts and documentation',
                  'Categorise by type for easy reporting',
                  'Export expense data for tax filing',
                ],
              },
              apps: {
                icon: <BriefcaseIcon className="h-12 w-12 text-trellio-teal" />,
                title: 'Apps & Integrations',
                description: 'Connect Trellio with the tools you already use to automate your workflows.',
                features: [
                  'Sync with accounting software (Xero, QuickBooks)',
                  'Payment gateway integrations (Stripe)',
                  'Calendar sync with Google and Outlook',
                  'Custom workflow automations',
                ],
              },
            };
            const config = pageConfig[activeView];
            return (
              <div className="min-h-[calc(100vh-12rem)] flex items-start justify-center pt-16">
                <div className="bg-charcoal rounded-xl border border-slate-700/30 p-10 max-w-lg w-full text-center">
                  <div className="flex justify-center mb-5">{config.icon}</div>
                  <h2 className="text-2xl font-semibold font-display text-slate-100 mb-2">{config.title}</h2>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-trellio-teal/15 text-trellio-teal mb-4">Coming Soon</span>
                  <p className="text-slate-400 text-sm mb-6">{config.description}</p>
                  <div className="text-left bg-midnight/60 rounded-lg p-5 border border-slate-700/20">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Planned Features</p>
                    <ul className="space-y-2">
                      {config.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-trellio-teal flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
