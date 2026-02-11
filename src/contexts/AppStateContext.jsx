import React, { createContext, useContext, useState } from 'react';
import { initialCompanySettings, initialInvoiceSettings, initialQuoteState, initialJobState } from '../constants';

const AppStateContext = createContext(null);

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export function AppStateProvider({ children }) {
  // Data collections
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [quoteTemplates, setQuoteTemplates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [clientNotes, setClientNotes] = useState([]);

  // Settings
  const [companySettings, setCompanySettings] = useState(initialCompanySettings);
  const [invoiceSettings, setInvoiceSettings] = useState(initialInvoiceSettings);
  const [emailTemplates, setEmailTemplates] = useState({
    // Invoice templates
    invoiceSubject: 'Invoice {{documentNumber}} from {{companyName}}',
    invoiceBody: 'Hi {{clientName}},\n\nPlease find your invoice {{documentNumber}} for {{total}}.\n\nView and pay online: {{paymentLink}}\n\nThanks,\n{{companyName}}',

    // Quote templates
    quoteSubject: 'Quote {{documentNumber}} from {{companyName}}',
    quoteBody: 'Hi {{clientName}},\n\nPlease find your quote {{documentNumber}} for {{total}}.\n\nView and approve it online: {{approvalLink}}\n\nThanks,\n{{companyName}}',

    // Quote follow-up templates
    quoteFollowupSubject: 'Following up on Quote {{documentNumber}}',
    quoteFollowupBody: 'Hi {{clientName}},\n\nJust following up on quote {{documentNumber}} that we sent. Have you had a chance to review it?\n\nView and approve: {{approvalLink}}\n\nPlease let us know if you have any questions!\n\nThanks,\n{{companyName}}',

    // Invoice reminder templates
    invoiceReminderSubject: 'Reminder: Invoice {{documentNumber}} Due {{dueDate}}',
    invoiceReminderBody: 'Hi {{clientName}},\n\nThis is a friendly reminder that invoice {{documentNumber}} for {{amountDue}} is due on {{dueDate}}.\n\nPay online: {{paymentLink}}\n\nThanks,\n{{companyName}}',

    // Overdue invoice templates
    overdueInvoiceSubject: 'Overdue: Invoice {{documentNumber}}',
    overdueInvoiceBody: 'Hi {{clientName}},\n\nInvoice {{documentNumber}} for {{amountDue}} is now {{daysOverdue}} days overdue.\n\nPay online: {{paymentLink}}\n\nPlease contact us if you have any questions.\n\nThanks,\n{{companyName}}',

    // Appointment reminder templates
    appointmentReminderSubject: 'Reminder: Appointment on {{appointmentDate}}',
    appointmentReminderBody: 'Hi {{clientName}},\n\nThis is a reminder about your appointment:\n\nDate: {{appointmentDate}}\nTime: {{appointmentTime}}\nService: {{jobTitle}}\n\nPlease let us know if you need to reschedule.\n\nThanks,\n{{companyName}}',

    // Job completion templates
    jobCompletionSubject: 'Work Completed: {{jobTitle}}',
    jobCompletionBody: 'Hi {{clientName}},\n\nWe\'ve completed the work for: {{jobTitle}}\n\nThank you for choosing {{companyName}}! We hope you\'re satisfied with our service.\n\nThanks,\n{{companyName}}',
  });

  // Form state
  const [newQuote, setNewQuote] = useState(initialQuoteState);
  const [newJob, setNewJob] = useState(initialJobState);
  const [logoFile, setLogoFile] = useState(null);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member' });
  const [newTemplate, setNewTemplate] = useState({ name: '', price: 0 });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'tech', color: '' });

  // UI State
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [quoteToPrint, setQuoteToPrint] = useState(null);
  const [invoiceCreateContext, setInvoiceCreateContext] = useState({ clientId: '', jobIds: [], mode: 'job' });

  // Client filters
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientTagFilter, setClientTagFilter] = useState([]);
  const [clientBeingEdited, setClientBeingEdited] = useState(null);
  const [autoAddProperty, setAutoAddProperty] = useState(false);

  // UI toggles
  const [showJobForm, setShowJobForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');

  // Filter state
  const [quoteStatusFilter, setQuoteStatusFilter] = useState([]);
  const [jobStatusFilter, setJobStatusFilter] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState([]);

  // Loading/error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Schedule view state
  const [scheduleView, setScheduleView] = useState(() => {
    try {
      const saved = localStorage.getItem('scheduleView');
      return saved === 'list' || saved === 'calendar' ? saved : 'list';
    } catch {
      return 'list';
    }
  });

  const [scheduleRange, setScheduleRange] = useState(() => {
    try {
      const saved = localStorage.getItem('scheduleRange');
      return saved === 'today' || saved === 'week' || saved === 'month' ? saved : 'month';
    } catch {
      return 'month';
    }
  });

  const [calendarDate, setCalendarDate] = useState(new Date());

  // Public contexts
  const [publicQuoteContext, setPublicQuoteContext] = useState(null);
  const [publicMessage, setPublicMessage] = useState('');
  const [publicError, setPublicError] = useState('');
  const [publicPortalContext, setPublicPortalContext] = useState(null);

  // Helper to persist schedule view settings
  const updateScheduleView = (view) => {
    setScheduleView(view);
    try { localStorage.setItem('scheduleView', view); } catch (e) {}
  };

  const updateScheduleRange = (range) => {
    setScheduleRange(range);
    try { localStorage.setItem('scheduleRange', range); } catch (e) {}
  };

  // Navigation helper: reset all selections when switching views
  const navigateToView = (view) => {
    setActiveView(view);
    setSelectedClient(null);
    setSelectedProperty(null);
    setSelectedJob(null);
    setSelectedQuote(null);
    setSelectedInvoice(null);
    setSidebarOpen(false);
  };

  const value = {
    // Data
    clients, setClients,
    quotes, setQuotes,
    jobs, setJobs,
    invoices, setInvoices,
    staff, setStaff,
    quoteTemplates, setQuoteTemplates,
    notifications, setNotifications,
    clientNotes, setClientNotes,

    // Settings
    companySettings, setCompanySettings,
    invoiceSettings, setInvoiceSettings,
    emailTemplates, setEmailTemplates,

    // Form state
    newQuote, setNewQuote,
    newJob, setNewJob,
    logoFile, setLogoFile,
    newInvite, setNewInvite,
    newTemplate, setNewTemplate,
    newStaff, setNewStaff,

    // UI State
    activeView, setActiveView,
    selectedClient, setSelectedClient,
    selectedProperty, setSelectedProperty,
    selectedJob, setSelectedJob,
    selectedQuote, setSelectedQuote,
    selectedInvoice, setSelectedInvoice,
    invoiceToPrint, setInvoiceToPrint,
    quoteToPrint, setQuoteToPrint,
    invoiceCreateContext, setInvoiceCreateContext,

    // Client filters
    clientSearchTerm, setClientSearchTerm,
    clientTagFilter, setClientTagFilter,
    clientBeingEdited, setClientBeingEdited,
    autoAddProperty, setAutoAddProperty,

    // UI toggles
    showJobForm, setShowJobForm,
    showNotifications, setShowNotifications,
    sidebarOpen, setSidebarOpen,
    globalQuery, setGlobalQuery,

    // Filter state
    quoteStatusFilter, setQuoteStatusFilter,
    jobStatusFilter, setJobStatusFilter,
    assigneeFilter, setAssigneeFilter,
    invoiceStatusFilter, setInvoiceStatusFilter,

    // Loading/error
    isLoading, setIsLoading,
    error, setError,

    // Schedule
    scheduleView, updateScheduleView,
    scheduleRange, updateScheduleRange,
    calendarDate, setCalendarDate,

    // Public contexts
    publicQuoteContext, setPublicQuoteContext,
    publicMessage, setPublicMessage,
    publicError, setPublicError,
    publicPortalContext, setPublicPortalContext,

    // Navigation helper
    navigateToView,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
