import { useMemo } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { db, storage, functions } from '../../firebase/config';
import { initialQuoteState, initialJobState, initialInvoiceSettings, STATUS_COLORS } from '../../constants';
import {
  getClientNameById, getClientById, formatDateTime,
  findClientProperty, buildPropertySnapshot,
  computeQuoteTotals, computeInvoiceDueDate,
  formatMoney, logAudit as rawLogAudit, renderTemplate,
} from './handlerUtils';
import { createClientHandlers } from './clientHandlers';
import { createQuoteHandlers } from './quoteHandlers';
import { createJobHandlers } from './jobHandlers';
import { createInvoiceHandlers } from './invoiceHandlers';
import { createSettingsHandlers } from './settingsHandlers';

/**
 * Orchestrator hook that composes domain-specific handler modules.
 * Keeps dashboard stats, filtered data, and cross-dependency wiring.
 */
export function useAppHandlers(userId, userProfile, appState) {
  const {
    clients, quotes, jobs, invoices, staff, quoteTemplates,
    companySettings, setCompanySettings,
    invoiceSettings, setInvoiceSettings,
    emailTemplates, setEmailTemplates,
    newQuote, setNewQuote, newJob, setNewJob,
    logoFile, setLogoFile,
    newInvite, setNewInvite, newTemplate, setNewTemplate, newStaff, setNewStaff,
    selectedClient, setSelectedClient,
    selectedProperty, setSelectedProperty,
    selectedJob, setSelectedJob,
    selectedQuote, setSelectedQuote,
    selectedInvoice, setSelectedInvoice,
    setActiveView, setShowJobForm,
    setInvoiceToPrint, setQuoteToPrint,
    invoiceCreateContext, setInvoiceCreateContext,
    setClientBeingEdited, setAutoAddProperty,
    publicQuoteContext, setPublicMessage, setPublicError,
    notifications,
  } = appState;

  // --- Bound utilities ---
  const boundLogAudit = (action, targetType, targetId, details) =>
    rawLogAudit(userId, userProfile, action, targetType, targetId, details);
  const boundGetClientById = (id) => getClientById(clients, id);
  const boundGetClientNameById = (id) => getClientNameById(clients, id);
  const boundFindClientProperty = (clientId, propertyId) => findClientProperty(clients, clientId, propertyId);
  const boundFormatMoney = (n) => formatMoney(companySettings, n);
  const stripeEnabled = Boolean(import.meta.env.VITE_FUNCTIONS_BASE_URL);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // --- Dashboard stats ---
  const dashboardStats = useMemo(() => {
    const activeJobs = jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress');
    const unscheduledJobs = jobs.filter(job => job.status === 'Unscheduled');
    const outstandingInvoices = invoices.filter(inv => (inv.status === 'Unpaid' || inv.status === 'Sent') && !inv.isCreditNote);
    const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const revenueThisMonth = invoices.filter(inv => inv.status === 'Paid' && inv.paidAt).reduce((sum, inv) => sum + (inv.total || 0), 0);
    return {
      activeJobsCount: activeJobs.length,
      requiresSchedulingCount: unscheduledJobs.length,
      outstandingAmount, revenueThisMonth,
      upcomingJobs: activeJobs.slice(0, 5),
      jobsRequiringScheduling: unscheduledJobs.slice(0, 5),
      invoicesAwaitingPayment: outstandingInvoices.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 5),
    };
  }, [jobs, invoices]);

  // --- Filtered data ---
  const filteredClients = useMemo(() => {
    const searchTerm = appState.clientSearchTerm;
    const tagFilter = appState.clientTagFilter;
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    const digits = searchTerm.replace(/\D/g, '');
    return clients.filter(client => {
      const nameMatch = (client.name || '').toLowerCase().includes(term);
      const emailMatch = (client.email || '').toLowerCase().includes(term);
      const tagMatch = (client.tags || []).some(t => (t || '').toLowerCase().includes(term));
      const phoneDigits = (client.phone || '').replace(/\D/g, '');
      const phoneMatch = digits ? phoneDigits.includes(digits) : false;
      const addressMatch = (client.address || '').toLowerCase().includes(term);
      const addressDigits = (client.address || '').replace(/\D/g, '');
      const addressDigitMatch = digits ? addressDigits.includes(digits) : false;
      const contactMatch = (client.contacts || []).some(c => {
        return (c.name || '').toLowerCase().includes(term) ||
          (c.email || '').toLowerCase().includes(term) ||
          (digits && (c.phone || '').replace(/\D/g, '').includes(digits));
      });
      const activeTagFilter = (tagFilter || []).length === 0 || (client.tags || []).some(t => tagFilter.includes(t));
      return (nameMatch || emailMatch || phoneMatch || tagMatch || addressMatch || addressDigitMatch || contactMatch) && activeTagFilter;
    });
  }, [clients, appState.clientSearchTerm, appState.clientTagFilter]);

  const filteredQuotes = useMemo(() => {
    if (!appState.quoteStatusFilter || appState.quoteStatusFilter.length === 0) return quotes;
    return quotes.filter(q => appState.quoteStatusFilter.includes(q.status));
  }, [quotes, appState.quoteStatusFilter]);

  const filteredJobs = useMemo(() => {
    let base = jobs;
    if (appState.jobStatusFilter?.length > 0) base = base.filter(j => appState.jobStatusFilter.includes(j.status));
    if (appState.assigneeFilter) {
      base = appState.assigneeFilter === 'unassigned'
        ? base.filter(j => !j.assignees || j.assignees.length === 0)
        : base.filter(j => (j.assignees || []).includes(appState.assigneeFilter));
    }
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const inRange = (d) => {
      if (!d) return true;
      const dt = new Date(d);
      if (appState.scheduleRange === 'today') return dt >= startOfDay && dt <= endOfDay;
      if (appState.scheduleRange === 'week') return dt >= startOfWeek && dt <= endOfWeek;
      if (appState.scheduleRange === 'month') return dt >= startOfMonth && dt <= endOfMonth;
      return true;
    };
    return base.filter(j => inRange(j.start));
  }, [jobs, appState.jobStatusFilter, appState.assigneeFilter, appState.scheduleRange]);

  const filteredInvoices = useMemo(() => {
    if (!appState.invoiceStatusFilter || appState.invoiceStatusFilter.length === 0) return invoices;
    return invoices.filter(i => appState.invoiceStatusFilter.includes(i.status));
  }, [invoices, appState.invoiceStatusFilter]);

  // --- Auth ---
  const handleLogout = async () => { await signOut(getAuth()); };

  // --- Domain handlers ---
  const clientH = createClientHandlers({
    userId, db, clients, invoices,
    appState: { setActiveView, setClientBeingEdited, setAutoAddProperty, selectedClient, setSelectedClient, setSelectedProperty, selectedProperty },
    logAudit: boundLogAudit, findClientProperty: boundFindClientProperty,
  });

  const invoiceH = createInvoiceHandlers({
    userId, db, storage, quotes, invoiceSettings, companySettings, setCompanySettings,
    selectedInvoice, setSelectedInvoice, setActiveView, setInvoiceCreateContext,
    logAudit: boundLogAudit, findClientProperty: boundFindClientProperty,
    buildPropertySnapshot, getClientById: boundGetClientById,
    computeQuoteTotals, computeInvoiceDueDate,
  });

  const settingsH = createSettingsHandlers({
    userId, db, functions, clients, companySettings, setCompanySettings,
    invoiceSettings, setInvoiceSettings, emailTemplates, setEmailTemplates,
    logoFile, setLogoFile, selectedQuote, setSelectedQuote,
    selectedInvoice, setSelectedInvoice,
    newInvite, setNewInvite, newTemplate, setNewTemplate, newStaff, setNewStaff,
    quoteTemplates, logAudit: boundLogAudit, getClientById: boundGetClientById,
    renderTemplate, userProfile, storage,
  });

  const quoteH = createQuoteHandlers({
    userId, db, clients, quotes, companySettings, setCompanySettings,
    invoiceSettings, newQuote, setNewQuote, newJob, setNewJob,
    selectedQuote, setSelectedQuote, selectedJob, setSelectedJob,
    setActiveView, setShowJobForm, setInvoiceCreateContext, setSelectedInvoice,
    publicQuoteContext, setPublicMessage, setPublicError, userProfile,
    logAudit: boundLogAudit, findClientProperty: boundFindClientProperty,
    buildPropertySnapshot, computeQuoteTotals, getClientNameById: boundGetClientNameById,
    sendQuote: settingsH.handleSendQuote,
    sendQuoteText: settingsH.handleSendQuoteText,
  });

  const jobH = createJobHandlers({
    userId, db, storage, newJob, setNewJob, selectedJob, setSelectedJob, setShowJobForm,
    logAudit: boundLogAudit, findClientProperty: boundFindClientProperty,
    buildPropertySnapshot, getClientNameById: boundGetClientNameById,
    createInvoiceFromJob: invoiceH.handleCreateInvoiceFromJob,
  });

  return {
    // Utilities
    getClientNameById: boundGetClientNameById,
    getClientById: boundGetClientById,
    formatDateTime, unreadNotificationsCount,
    statusColors: STATUS_COLORS,
    stripeEnabled, formatMoney: boundFormatMoney,
    findClientProperty: boundFindClientProperty,
    buildPropertySnapshot,
    computeQuoteTotals, computeInvoiceDueDate,
    dashboardStats,
    filteredClients, filteredQuotes, filteredJobs, filteredInvoices,

    // Auth
    handleLogout,

    // Domain handlers (spread from sub-modules)
    ...clientH,
    ...quoteH,
    ...jobH,
    ...invoiceH,
    ...settingsH,
  };
}
