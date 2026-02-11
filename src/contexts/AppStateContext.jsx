import React, { createContext, useContext, useState } from 'react';
import { initialCompanySettings, initialInvoiceSettings } from '../constants';

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
    invoiceSubject: 'Invoice {{documentNumber}} from {{companyName}}',
    invoiceBody: 'Hi {{clientName}},\n\nPlease find your invoice {{documentNumber}} for {{total}}.\n\nView/print it from the app.\n\nThanks,\n{{companyName}}',
    quoteSubject: 'Quote {{documentNumber}} from {{companyName}}',
    quoteBody: 'Hi {{clientName}},\n\nPlease find your quote {{documentNumber}} for {{total}}.\n\nView/approve it from the app.\n\nThanks,\n{{companyName}}',
  });

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
    try {
      localStorage.setItem('scheduleView', view);
    } catch (e) {
      console.warn('Failed to save schedule view:', e);
    }
  };

  const updateScheduleRange = (range) => {
    setScheduleRange(range);
    try {
      localStorage.setItem('scheduleRange', range);
    } catch (e) {
      console.warn('Failed to save schedule range:', e);
    }
  };

  const value = {
    // Data
    clients,
    setClients,
    quotes,
    setQuotes,
    jobs,
    setJobs,
    invoices,
    setInvoices,
    staff,
    setStaff,
    quoteTemplates,
    setQuoteTemplates,
    notifications,
    setNotifications,
    clientNotes,
    setClientNotes,

    // Settings
    companySettings,
    setCompanySettings,
    invoiceSettings,
    setInvoiceSettings,
    emailTemplates,
    setEmailTemplates,

    // UI State
    activeView,
    setActiveView,
    selectedClient,
    setSelectedClient,
    selectedProperty,
    setSelectedProperty,
    selectedJob,
    setSelectedJob,
    selectedQuote,
    setSelectedQuote,
    selectedInvoice,
    setSelectedInvoice,
    invoiceToPrint,
    setInvoiceToPrint,
    quoteToPrint,
    setQuoteToPrint,
    invoiceCreateContext,
    setInvoiceCreateContext,

    // Client filters
    clientSearchTerm,
    setClientSearchTerm,
    clientTagFilter,
    setClientTagFilter,
    clientBeingEdited,
    setClientBeingEdited,
    autoAddProperty,
    setAutoAddProperty,

    // UI toggles
    showJobForm,
    setShowJobForm,
    showNotifications,
    setShowNotifications,

    // Schedule
    scheduleView,
    updateScheduleView,
    scheduleRange,
    updateScheduleRange,
    calendarDate,
    setCalendarDate,

    // Public contexts
    publicQuoteContext,
    setPublicQuoteContext,
    publicMessage,
    setPublicMessage,
    publicError,
    setPublicError,
    publicPortalContext,
    setPublicPortalContext,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
