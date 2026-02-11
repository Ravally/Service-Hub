import React from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

import { JOB_STATUSES, initialQuoteState, initialJobState } from '../constants';

// Icons
import {
  PlusCircleIcon, CalendarIcon, InvoiceIcon, BellIcon, BriefcaseIcon,
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
import PropertyDetailView from './PropertyDetailView';
import ClientsList from './ClientsList';
import CreateClient from './CreateClient';
import JobsList from './JobsList';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 max-w-lg w-full text-center">
          <p className="text-gray-700">Loading...</p>
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
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200 animate-fade-in">
      <form onSubmit={handleAddJob}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select value={newJob.clientId} onChange={(e) => { const nextClientId = e.target.value; const nextProperty = findClientProperty(nextClientId, ''); const nextPropertyId = nextProperty?.uid || nextProperty?.id || ''; setNewJob({ ...newJob, clientId: nextClientId, propertyId: nextPropertyId }); }} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="" disabled>Select a client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {newJobProperties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select value={newJob.propertyId || ''} onChange={(e) => setNewJob({ ...newJob, propertyId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select property</option>
                {newJobProperties.map((p, idx) => <option key={p.uid || p.id || idx} value={p.uid || p.id || String(idx)}>{p.label || p.street1 || `Property ${idx + 1}`}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} placeholder="e.g., House Wash - Front" required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          {activeView === 'jobs' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select value={newJob.jobType || 'one_off'} onChange={(e) => { const nextType = e.target.value; setNewJob((prev) => { const next = { ...prev, jobType: nextType }; if (nextType === 'one_off') { next.schedule = 'One-time'; next.billingFrequency = prev.billingFrequency || 'Upon job completion'; } else if (nextType === 'recurring' && (!prev.schedule || prev.schedule === 'One-time')) { next.schedule = 'Weekly'; } return next; }); }} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="one_off">One-off job</option>
                  <option value="recurring">Recurring job</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <select value={newJob.schedule || 'One-time'} onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })} disabled={(newJob.jobType || 'one_off') === 'one_off'} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input type="datetime-local" value={newJob.start || ''} onChange={(e) => setNewJob({ ...newJob, start: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End (optional)</label>
            <input type="datetime-local" value={newJob.end || ''} onChange={(e) => setNewJob({ ...newJob, end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={newJob.status} onChange={(e) => setNewJob({ ...newJob, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {activeView === 'jobs' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label>
                <select value={newJob.billingFrequency || 'Upon job completion'} onChange={(e) => setNewJob({ ...newJob, billingFrequency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="Upon job completion">Upon job completion</option>
                  <option value="Per visit">Per visit</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Every 2nd visit">Every 2nd visit</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="auto-payments" type="checkbox" checked={!!newJob.automaticPayments} onChange={(e) => setNewJob({ ...newJob, automaticPayments: e.target.checked })} className="h-4 w-4" />
                <label htmlFor="auto-payments" className="text-sm font-medium text-gray-700">Automatic payments</label>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={newJob.notes || ''} onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Special instructions, access details, etc." />
          </div>
          {activeView === 'schedule' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Staff</label>
              {staff.length === 0 ? (
                <p className="text-sm text-gray-500">No staff yet. Add staff in Settings.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {staff.map(s => (
                    <label key={s.id} className="inline-flex items-center text-sm bg-gray-50 px-2 py-1 rounded-md border">
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
          <button type="button" onClick={() => setShowJobForm(false)} className="px-6 py-2 text-gray-700 font-semibold rounded-lg border border-gray-300">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Save Job</button>
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex">
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
            <button className="lg:hidden p-2 rounded-md border border-gray-200" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <span className="block w-5 h-0.5 bg-gray-700 mb-1"></span>
              <span className="block w-5 h-0.5 bg-gray-700 mb-1"></span>
              <span className="block w-5 h-0.5 bg-gray-700"></span>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Service Hub</h1>
              {(() => {
                const mode = import.meta.env.MODE;
                if (mode === 'staging') return <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">Staging</span>;
                return null;
              })()}
            </div>
            <p className="hidden md:block text-lg text-gray-600 mt-1">Your central dashboard for managing your business.</p>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="hidden md:block">
              <input
                value={globalQuery}
                onChange={(e)=>setGlobalQuery(e.target.value)}
                onKeyDown={(e)=>{ if (e.key === 'Enter') { setActiveView('clients'); setClientSearchTerm(globalQuery); } }}
                placeholder="Search clients..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
                aria-label="Global search"
              />
            </div>
            <button onClick={() => setShowNotifications(s => !s)} className="relative text-gray-500 hover:text-gray-700">
              <BellIcon />
              {unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadNotificationsCount}</span></span>}
            </button>
            {showNotifications && (
              <div className="fixed right-6 top-16 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-fade-in-fast max-h-[60vh] overflow-y-auto">
                <div className="p-3 border-b font-semibold text-sm">Notifications</div>
                <ul className="divide-y divide-gray-100">{notifications.map(n => (<li key={n.id} className={`p-3 text-sm ${!n.read ? 'bg-blue-50' : ''}`}><p>{n.message}</p><div className="flex justify-between items-center mt-1"><p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>{!n.read && <button onClick={() => handleMarkNotificationAsRead(n.id)} className="text-xs font-semibold text-blue-600 hover:underline">Mark as read</button>}</div></li>))}</ul>
              </div>
            )}
          </div>
        </header>

        <main>
          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <div>
              <DashboardCards quotes={quotes} jobs={jobs} invoices={invoices} onNewQuote={() => { startNewQuote(); }} onNewJob={() => { setActiveView('schedule'); setShowJobForm(true); }} formatMoney={formatMoney} />
              <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 font-semibold">Today's Appointments</div>
                {(() => {
                  const today = new Date().toDateString();
                  const todays = jobs.filter(j => j.start && new Date(j.start).toDateString() === today);
                  const total = todays.length;
                  const totalVal = todays.reduce((s,j)=>{ const q = quotes.find(x => x.id === j.quoteId); return s + (q?.total || 0); },0);
                  const active = todays.filter(j=>j.status==='In Progress').length;
                  const complete = todays.filter(j=>j.status==='Completed').length;
                  const toGo = Math.max(0, total - active - complete);
                  const Box = ({color,title,count,val}) => (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-md p-3 border border-gray-100">
                      <div className="h-8 w-8 rounded-md text-white flex items-center justify-center font-bold" style={{backgroundColor:color}}>{count}</div>
                      <div>
                        <div className="text-sm font-semibold">{title}</div>
                        <div className="text-xs text-gray-500">{formatMoney(val)}</div>
                      </div>
                    </div>
                  );
                  return (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Box color="#1F2937" title="Total" count={total} val={totalVal} />
                      <Box color="#6B7280" title="To Go" count={toGo} val={0} />
                      <Box color="#3B82F6" title="Active" count={active} val={0} />
                      <Box color="#22C55E" title="Complete" count={complete} val={0} />
                    </div>
                  );
                })()}
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
            <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-[#f8f5f0] border-t-4 border-[#7a2f2f] px-4 sm:px-6 lg:px-8 py-6">
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
                      <h2 className="text-2xl font-semibold text-gray-800 flex items-center"><CalendarIcon /> Schedule</h2>
                      <div className="ml-4 flex items-center gap-3">
                        <span className="isolate inline-flex rounded-md shadow-sm">
                          <button onClick={() => updateScheduleView('list')} className={`relative inline-flex items-center rounded-l-md px-3 py-1 text-sm font-semibold ${scheduleView === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>List</button>
                          <button onClick={() => updateScheduleView('calendar')} className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1 text-sm font-semibold ${scheduleView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>Calendar</button>
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Range</label>
                          <select value={scheduleRange} onChange={(e)=>updateScheduleRange(e.target.value)} className="px-2 py-1 border border-gray-300 rounded-md text-xs">
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowJobForm(s => !s)} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"><PlusCircleIcon /><span>{showJobForm ? 'Cancel' : 'Schedule Job'}</span></button>
                  </div>
                  {showJobForm && renderJobForm()}
                  {/* Job status filter chips */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {JOB_STATUSES.map(s => {
                      const active = jobStatusFilter.includes(s);
                      return <button key={s} onClick={() => appState.setJobStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{s}</button>;
                    })}
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-xs text-gray-600">Assignee</label>
                      <select value={assigneeFilter} onChange={(e)=>appState.setAssigneeFilter(e.target.value)} className="px-2 py-1 border border-gray-300 rounded-md text-xs">
                        <option value="">All</option>
                        <option value="unassigned">Unassigned</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {(jobStatusFilter.length>0 || assigneeFilter) && <button onClick={() => { appState.setJobStatusFilter([]); appState.setAssigneeFilter(''); }} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Clear</button>}
                  </div>
                  {scheduleView === 'list' ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">{isLoading ? <div className="text-center p-10 text-gray-500">Loading...</div> : filteredJobs.length === 0 ? <div className="text-center p-10 text-gray-500"><h3 className="text-lg font-medium">No jobs scheduled!</h3></div> : (
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
                              <div key={k} className="border-b last:border-b-0">
                                <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{k === 'unscheduled' ? 'Unscheduled' : new Date(k).toLocaleDateString()}</div>
                                <ul className="divide-y divide-gray-200">
                                  {groups[k].sort((a,b)=> new Date(a.start||0) - new Date(b.start||0)).map(job => (
                                    <li key={job.id} onClick={() => setSelectedJob(job)} className="list-row">
                                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="font-semibold text-blue-700">{job.title}</p>
                                          <p className="text-sm text-gray-600">{getClientNameById(job.clientId)}</p>
                                          {(job.assignees && job.assignees.length>0) && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {job.assignees.map(id => { const s = staff.find(x=>x.id===id); return <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{backgroundColor: (s?.color || '#E5E7EB'), color: '#111827'}}>{s?.name || 'Unknown'}</span> })}
                                            </div>
                                          )}
                                          <div className="mt-2"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>{job.status}</span></div>
                                        </div>
                                        <div className="flex flex-col items-start sm:items-end mt-4 sm:mt-0">
                                          <p className="text-md font-semibold text-gray-800">{formatDateTime(job.start)}</p>
                                          <div className="mt-2 w-40"><select value={job.status} onClick={(e) => e.stopPropagation()} onChange={(e) => handleUpdateJobStatus(job, e.target.value)} className="w-full p-1 border border-gray-300 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500"><option disabled>Change status...</option>{JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
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
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Company Settings</h2>
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-500">You are logged in as</p>
                <p className="font-semibold">{userProfile?.email}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize mt-2">{userProfile?.role}</span>
              </div>
              <form onSubmit={handleSaveSettings}>
                {userProfile?.role === 'admin' && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                      <div className="flex items-center gap-6">
                        {companySettings.logoUrl ? (
                          <img src={companySettings.logoUrl} alt="Company Logo" className="h-20 w-auto object-contain rounded-md border p-1" />
                        ) : (
                          <div className="h-20 w-20 flex items-center justify-center bg-gray-100 text-gray-400 rounded-md border"><BriefcaseIcon className="h-8 w-8" /></div>
                        )}
                        <input type="file" accept="image/png, image/jpeg" onChange={(e) => setLogoFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" value={companySettings.name} onChange={e => appState.setCompanySettings({...companySettings, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label><input type="email" value={companySettings.email} onChange={e => appState.setCompanySettings({...companySettings, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label><input type="tel" value={companySettings.phone} onChange={e => appState.setCompanySettings({...companySettings, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" value={companySettings.address} onChange={e => appState.setCompanySettings({...companySettings, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Default GST (%)</label><input type="number" step="0.01" value={companySettings.defaultGstRate ?? 15} onChange={e => appState.setCompanySettings({...companySettings, defaultGstRate: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                          <select value={companySettings.currencyCode || 'NZD'} onChange={(e)=> appState.setCompanySettings({...companySettings, currencyCode: e.target.value, currencySymbol: e.target.value === 'NZD' ? '$' : companySettings.currencySymbol})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="NZD">NZD -- New Zealand Dollar</option>
                            <option value="USD">USD -- US Dollar</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                          <select value={companySettings.locale || 'en-NZ'} onChange={(e)=> appState.setCompanySettings({...companySettings, locale: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="en-NZ">English (New Zealand)</option>
                            <option value="en-US">English (United States)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 text-right">
                      <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Save Settings</button>
                    </div>
                  </>
                )}
              </form>

              {/* Invoice Settings */}
              {userProfile?.role === 'admin' && (
                <div className="mt-10 border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Invoice Settings</h3>
                  <form onSubmit={handleSaveInvoiceSettings} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <select value={invoiceSettings.defaultTerm} onChange={(e)=>appState.setInvoiceSettings({...invoiceSettings, defaultTerm: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                          <option>Due Today</option><option>Due on receipt</option><option>Net 7</option><option>Net 9</option><option>Net 14</option><option>Net 15</option><option>Net 30</option><option>Net 60</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 text-right"><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Save Invoice Settings</button></div>
                  </form>
                </div>
              )}

              {/* Email Templates */}
              {userProfile?.role === 'admin' && (
                <div className="mt-10 border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Email Templates</h3>
                  <form onSubmit={handleSaveEmailTemplates} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-700">Invoice Emails</h4>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Subject</label>
                          <input type="text" value={emailTemplates.invoiceSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, invoiceSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Body</label>
                          <textarea rows={5} value={emailTemplates.invoiceBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, invoiceBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Reminder Subject</label>
                          <input type="text" value={emailTemplates.invoiceReminderSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, invoiceReminderSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Reminder Body</label>
                          <textarea rows={5} value={emailTemplates.invoiceReminderBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, invoiceReminderBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Overdue Invoice Subject</label>
                          <input type="text" value={emailTemplates.overdueInvoiceSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, overdueInvoiceSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Overdue Invoice Body</label>
                          <textarea rows={5} value={emailTemplates.overdueInvoiceBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, overdueInvoiceBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-700">Quote Emails</h4>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Subject</label>
                          <input type="text" value={emailTemplates.quoteSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, quoteSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Body</label>
                          <textarea rows={5} value={emailTemplates.quoteBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, quoteBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Follow-up Subject</label>
                          <input type="text" value={emailTemplates.quoteFollowupSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, quoteFollowupSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Follow-up Body</label>
                          <textarea rows={5} value={emailTemplates.quoteFollowupBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, quoteFollowupBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <h4 className="font-semibold mb-3 mt-6 text-blue-700">Other Templates</h4>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Reminder Subject</label>
                          <input type="text" value={emailTemplates.appointmentReminderSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, appointmentReminderSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Reminder Body</label>
                          <textarea rows={5} value={emailTemplates.appointmentReminderBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, appointmentReminderBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Job Completion Subject</label>
                          <input type="text" value={emailTemplates.jobCompletionSubject} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, jobCompletionSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Job Completion Body</label>
                          <textarea rows={5} value={emailTemplates.jobCompletionBody} onChange={(e)=>appState.setEmailTemplates({...emailTemplates, jobCompletionBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Available Placeholders:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                        <div>• <code>{'{{clientName}}'}</code> - Client's name</div>
                        <div>• <code>{'{{companyName}}'}</code> - Your company name</div>
                        <div>• <code>{'{{documentNumber}}'}</code> - Invoice/Quote number</div>
                        <div>• <code>{'{{total}}'}</code> - Total amount</div>
                        <div>• <code>{'{{amountDue}}'}</code> - Amount due</div>
                        <div>• <code>{'{{dueDate}}'}</code> - Due date</div>
                        <div>• <code>{'{{daysOverdue}}'}</code> - Days overdue</div>
                        <div>• <code>{'{{paymentLink}}'}</code> - Payment link</div>
                        <div>• <code>{'{{approvalLink}}'}</code> - Quote approval link</div>
                        <div>• <code>{'{{appointmentDate}}'}</code> - Appointment date</div>
                        <div>• <code>{'{{appointmentTime}}'}</code> - Appointment time</div>
                        <div>• <code>{'{{jobTitle}}'}</code> - Job title</div>
                      </div>
                    </div>
                    <div className="mt-4 text-right"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">Save All Email Templates</button></div>
                  </form>
                </div>
              )}

              {/* Logout */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <button onClick={handleLogout} className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Logout</button>
              </div>

              {/* Staff Management */}
              {userProfile?.role === 'admin' && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Staff</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3">Add Staff Member</h4>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const palette = ['#60A5FA','#34D399','#F59E0B','#F472B6','#A78BFA','#F87171','#2DD4BF','#FBBF24'];
                        const color = newStaff.color || palette[Math.floor(Math.random()*palette.length)];
                        await addDoc(collection(db, `users/${userId}/staff`), { ...newStaff, color });
                        setNewStaff({ name: '', email: '', role: 'tech', color: '' });
                      }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name:e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select value={newStaff.role} onChange={e=>setNewStaff({...newStaff, role:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option value="tech">Technician</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label><input type="color" value={newStaff.color || '#60A5FA'} onChange={e=>setNewStaff({...newStaff, color:e.target.value})} className="w-full h-10 p-1 border border-gray-300 rounded-md"/></div>
                        </div>
                        <div className="mt-4 text-right"><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Add Staff</button></div>
                      </form>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3">Current Staff</h4>
                      {staff.length === 0 ? <p className="text-sm text-gray-500">No staff yet.</p> : (
                        <ul className="divide-y divide-gray-200">
                          {staff.map(s => (
                            <li key={s.id} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color || '#9CA3AF' }}></span>
                                <div><p className="font-medium">{s.name}</p><p className="text-xs text-gray-500">{s.email || '-'} / {s.role || 'tech'}</p></div>
                              </div>
                              <button onClick={async () => {
                                if (!window.confirm('Remove this staff member?')) return;
                                await deleteDoc(doc(db, `users/${userId}/staff`, s.id));
                              }} className="text-red-600 hover:text-red-800 text-sm font-semibold">Remove</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quote Templates */}
              {userProfile?.role === 'admin' && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Quote Templates</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3">Create Item Template</h4>
                      <form onSubmit={handleAddTemplate}>
                        <div className="mb-3"><label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label><input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g., Small House Wash" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                        <div className="mb-3"><label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label><input type="number" step="0.01" value={newTemplate.price} onChange={e => setNewTemplate({...newTemplate, price: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                        <div className="mt-4 text-right"><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Save Template</button></div>
                      </form>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3">Existing Item Templates</h4>
                      {quoteTemplates.length === 0 ? <p className="text-sm text-gray-500">No templates yet.</p> : (
                        <ul className="divide-y divide-gray-200">
                          {quoteTemplates.map(t => (
                            <li key={t.id} className="py-3 flex items-center justify-between">
                              <div><p className="font-medium">{t.name}</p><p className="text-xs text-gray-500">Unit Price: ${parseFloat(t.price || 0).toFixed(2)}</p></div>
                              <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Delete</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Placeholder pages */}
          {['requests','reports','expenses','timesheets','apps'].includes(activeView) && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2" style={{textTransform:'capitalize'}}>{activeView}</h2>
              <p className="text-gray-600">This page is a placeholder. We'll build this module next.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
