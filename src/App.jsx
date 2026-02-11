import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, setDoc, getDocs, deleteDoc, getDoc, where, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from './firebase/config';

// Import Constants
import { JOB_STATUSES, initialQuoteState, initialJobState, initialCompanySettings, initialInvoiceSettings } from './constants';

// Import all our Icons
import { 
  UserPlusIcon, UsersIcon, FileTextIcon, PlusCircleIcon, Trash2Icon,
  CalendarIcon, InvoiceIcon, BellIcon, LayoutDashboardIcon, BriefcaseIcon,
  DollarSignIcon, TrendingUpIcon, SettingsIcon, PrinterIcon, AtSignIcon, PhoneIcon, MapPinIcon
} from './components/icons';

// Import all our View Components
import ClientDetailView from './components/ClientDetailView';
import JobDetailView from './components/JobDetailView';
import Sidebar from './components/Sidebar';
import DashboardCards from './components/DashboardCards';
import JobsBoard from './components/JobsBoard';
import JobsList from './components/JobsList';
import CalendarView from './components/CalendarView';
import InvoicePrintView from './components/InvoicePrintView';
import QuotePrintView from './components/QuotePrintView';
import QuoteDetailView from './components/QuoteDetailView';
import QuoteCreateForm from './components/QuoteCreateForm';
import InvoiceDetailView from './components/InvoiceDetailView';
import InvoiceCreateFlow from './components/InvoiceCreateFlow';
import PublicQuoteApproval from './components/PublicQuoteApproval';
import PublicClientPortal from './components/PublicClientPortal';
import Auth from './components/Auth';
import QuotesList from './components/QuotesList';
import InvoicesList from './components/InvoicesList';
import PropertyDetailView from './components/PropertyDetailView';
import ClientsList from './components/ClientsList';
import CreateClient from './components/CreateClient';

export default function App() {
  // --- All application state now lives here in the main App component ---
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [quoteTemplates, setQuoteTemplates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [companySettings, setCompanySettings] = useState(initialCompanySettings);
  const [invoiceSettings, setInvoiceSettings] = useState(initialInvoiceSettings);
  const [emailTemplates, setEmailTemplates] = useState({
    invoiceSubject: 'Invoice {{documentNumber}} from {{companyName}}',
    invoiceBody: 'Hi {{clientName}},\n\nPlease find your invoice {{documentNumber}} for {{total}}.\n\nView/print it from the app.\n\nThanks,\n{{companyName}}',
    quoteSubject: 'Quote {{documentNumber}} from {{companyName}}',
    quoteBody: 'Hi {{clientName}},\n\nPlease find your quote {{documentNumber}} for {{total}}.\n\nView/approve it from the app.\n\nThanks,\n{{companyName}}',
  });
  
  const [newQuote, setNewQuote] = useState(initialQuoteState);
  const [newJob, setNewJob] = useState(initialJobState);
  const [logoFile, setLogoFile] = useState(null);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'member' });
  
  const [newTemplate, setNewTemplate] = useState({ name: '', price: 0 });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'tech', color: '' });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  // --- State for controlling the UI ---
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [quoteToPrint, setQuoteToPrint] = useState(null);
  const [invoiceCreateContext, setInvoiceCreateContext] = useState({ clientId: '', jobIds: [], mode: 'job' });
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientTagFilter, setClientTagFilter] = useState([]); // array of selected tag strings
  // Edit/Create Client routing helpers
  const [clientBeingEdited, setClientBeingEdited] = useState(null);
  const [autoAddProperty, setAutoAddProperty] = useState(false);
  
  
  const [showJobForm, setShowJobForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
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
  }); // 'today' | 'week' | 'month'
  const [calendarDate, setCalendarDate] = useState(new Date());

  // --- Public Quote Approval (token-based) ---
  const [publicQuoteContext, setPublicQuoteContext] = useState(null); // { uid, token, quote, client }
  const [publicMessage, setPublicMessage] = useState('');
  const [publicError, setPublicError] = useState('');
  const [publicPortalContext, setPublicPortalContext] = useState(null); // { uid, clientId }

  // Detect public quote approval token from URL and fetch the quote/client
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('quoteToken');
    if (!token) return;
    (async () => {
      try {
        const parts = token.split('.');
        if (parts.length < 2) { setPublicError('Invalid link.'); return; }
        const uid = parts[0];
        const quoteId = parts[1];
        const auth = getAuth();
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) { /* ignore; rules may allow read anyway */ }
        }
        const qSnap = await getDoc(doc(db, `users/${uid}/quotes`, quoteId));
        if (!qSnap.exists()) { setPublicError('Quote not found.'); return; }
        const quote = { id: qSnap.id, ...qSnap.data() };
        if (!quote.openedAt) {
          try {
            const openedAt = new Date().toISOString();
            await updateDoc(doc(db, `users/${uid}/quotes`, quoteId), { openedAt });
            quote.openedAt = openedAt;
          } catch (err) {
            console.warn('Unable to record quote open time:', err?.message || err);
          }
        }
        const cSnap = quote.clientId ? await getDoc(doc(db, `users/${uid}/clients`, quote.clientId)) : null;
        const client = cSnap && cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } : null;
        setPublicQuoteContext({ uid, token, quote, client });
      } catch (err) {
        console.error('Public approval error:', err);
        setPublicError('Unable to load approval link.');
      }
    })();
  }, []);

  // Detect public client portal token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portalToken');
    if (!token) return;
    const parts = token.split('.');
    if (parts.length < 2) { setPublicError('Invalid portal link.'); return; }
    const uid = parts[0];
    const clientId = parts[1];
    (async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) {}
        }
        // Verify client exists
        const cSnap = await getDoc(doc(db, `users/${uid}/clients`, clientId));
        if (!cSnap.exists()) { setPublicError('Client not found.'); return; }
        setPublicPortalContext({ uid, clientId });
      } catch (err) {
        console.error('Portal load error:', err);
        setPublicError('Unable to load portal.');
      }
    })();
  }, []);
  
  

  // --- Effect for fetching notes for a selected client ---
  useEffect(() => {
    if (userId && selectedClient) {
      const notesPath = `users/${userId}/clients/${selectedClient.id}/notes`;
      const q = query(collection(db, notesPath));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setClientNotes(notesData);
      });
      return () => unsubscribe();
    }
  }, [userId, selectedClient]);

  // --- Firebase Authentication Effect ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data());
        } else {
          // Check for an invite
          const invitesQuery = query(collection(db, 'invites'), where("email", "==", user.email.toLowerCase()));
          const invitesSnapshot = await getDocs(invitesQuery);
          
          let userRole = 'member'; // Default role
          if (!invitesSnapshot.empty) {
            const inviteDoc = invitesSnapshot.docs[0];
            userRole = inviteDoc.data().role;
            await deleteDoc(inviteDoc.ref); // Delete invite after claiming
          } else {
            // If no invite, check if they are the VERY first user ever.
            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            if (usersSnapshot.empty) {
              userRole = 'admin'; // First user is always admin
            } else {
              // Block sign-up if not invited and not the first user
              alert("Sign-up failed: No invitation found for this email address.");
              await signOut(auth);
              return;
            }
          }
          
          const newUserProfile = {
            email: user.email,
            role: userRole,
            createdAt: new Date().toISOString(),
          };

          await setDoc(userDocRef, newUserProfile);
          setUserProfile(newUserProfile);
        }
      } else {
        setUserId(null);
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore Data Subscription Effect ---
  useEffect(() => {
    if (!userId) return; 

    const collectionsConfig = {
      clients: setClients,
      quotes: setQuotes,
      jobs: (data) => setJobs(data.sort((a, b) => new Date(a.start) - new Date(b.start))),
      invoices: setInvoices,
      notifications: (data) => setNotifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))),
      quoteTemplates: setQuoteTemplates,
      staff: setStaff,
    };
    const unsubscribes = Object.entries(collectionsConfig).map(([name, setter]) => {
      const path = `users/${userId}/${name}`;
      const q = query(collection(db, path));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data);
      });
    });
    
    const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      setCompanySettings(docSnap.exists() ? { ...initialCompanySettings, ...docSnap.data() } : initialCompanySettings);
    });
    unsubscribes.push(unsubSettings);

    const invoiceSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    const unsubInvSettings = onSnapshot(invoiceSettingsRef, (snap) => {
      setInvoiceSettings(snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : initialInvoiceSettings);
    });
    unsubscribes.push(unsubInvSettings);

    const emailTplRef = doc(db, `users/${userId}/settings/emailTemplates`);
    const unsubEmailTpl = onSnapshot(emailTplRef, (snap) => {
      if (snap.exists()) setEmailTemplates(prev => ({ ...prev, ...snap.data() }));
    });
    unsubscribes.push(unsubEmailTpl);

    const fetchInitialData = async () => {
      try {
        const clientPath = `users/${userId}/clients`;
        await getDocs(collection(db, clientPath));
        setIsLoading(false);
      } catch (err) {
        setError("Could not connect to database.");
        setIsLoading(false);
      }
    }
    
    fetchInitialData();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [userId]);

  // --- Memoized Calculations ---
  const dashboardStats = useMemo(() => {
    const activeJobs = jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress');
    // Exclude any credit notes from counts; compute outstanding as sum of totals for unpaid/sent invoices
    const outstandingInvoices = invoices.filter(invoice => (invoice.status === 'Unpaid' || invoice.status === 'Sent') && !invoice.isCreditNote);
    const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueThisMonth = invoices.filter(inv => inv.status === 'Paid' && inv.paidAt).reduce((sum, inv) => sum + (inv.total || 0), 0);
    return {
        activeJobsCount: activeJobs.length,
        outstandingAmount,
        revenueThisMonth,
        upcomingJobs: activeJobs.slice(0, 5),
        invoicesAwaitingPayment: outstandingInvoices.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 5),
    };
  }, [jobs, invoices]);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients;
    const term = clientSearchTerm.toLowerCase();
    const digits = clientSearchTerm.replace(/\D/g, '');
    return clients.filter(client => {
      const nameMatch = (client.name || '').toLowerCase().includes(term);
      const emailMatch = (client.email || '').toLowerCase().includes(term);
      const tagMatch = (client.tags || []).some(t => (t || '').toLowerCase().includes(term));
      const phoneDigits = (client.phone || '').replace(/\D/g, '');
      const phoneMatch = digits ? phoneDigits.includes(digits) : false;
      const addressMatchText = (client.address || '').toLowerCase().includes(term);
      const addressDigits = (client.address || '').replace(/\D/g, '');
      const addressMatchDigits = digits ? addressDigits.includes(digits) : false;
      const contactMatch = (client.contacts || []).some(c => {
        const cName = (c.name || '').toLowerCase().includes(term);
        const cEmail = (c.email || '').toLowerCase().includes(term);
        const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
        const cPhone = digits ? cPhoneDigits.includes(digits) : false;
        return cName || cEmail || cPhone;
      });
      const activeTagFilter = (clientTagFilter || []).length === 0 || (client.tags || []).some(t => clientTagFilter.includes(t));
      return (nameMatch || emailMatch || phoneMatch || tagMatch || addressMatchText || addressMatchDigits || contactMatch) && activeTagFilter;
    });
  }, [clients, clientSearchTerm, clientTagFilter]);

  const [quoteStatusFilter, setQuoteStatusFilter] = useState([]); // e.g., ['Draft','Sent']
  const filteredQuotes = useMemo(() => {
    if (!quoteStatusFilter || quoteStatusFilter.length === 0) return quotes;
    return quotes.filter(q => quoteStatusFilter.includes(q.status));
  }, [quotes, quoteStatusFilter]);

  const [jobStatusFilter, setJobStatusFilter] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' = all, 'unassigned' = jobs with no assignees, or a staffId
  const filteredJobs = useMemo(() => {
    let base = jobs;
    if (jobStatusFilter && jobStatusFilter.length > 0) {
      base = base.filter(j => jobStatusFilter.includes(j.status));
    }
    if (assigneeFilter) {
      if (assigneeFilter === 'unassigned') {
        base = base.filter(j => !j.assignees || j.assignees.length === 0);
      } else {
        base = base.filter(j => (j.assignees || []).includes(assigneeFilter));
      }
    }
    // Apply time range filter to scheduled jobs; keep unscheduled visible in List view
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const inRange = (d) => {
      if (!d) return true; // keep unscheduled jobs in List view
      const dt = new Date(d);
      if (scheduleRange === 'today') return dt >= startOfDay && dt <= endOfDay;
      if (scheduleRange === 'week') return dt >= startOfWeek && dt <= endOfWeek;
      if (scheduleRange === 'month') return dt >= startOfMonth && dt <= endOfMonth;
      return true;
    };
    return base.filter(j => inRange(j.start));
  }, [jobs, jobStatusFilter, assigneeFilter, scheduleRange]);

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState([]);
  const filteredInvoices = useMemo(() => {
    if (!invoiceStatusFilter || invoiceStatusFilter.length === 0) return invoices;
    return invoices.filter(i => invoiceStatusFilter.includes(i.status));
  }, [invoices, invoiceStatusFilter]);

  // --- Audit Log helper ---
  const logAudit = async (action, targetType, targetId, details = {}) => {
    try {
      if (!db || !userId) return;
      await addDoc(collection(db, `users/${userId}/auditLogs`), {
        action,
        targetType,
        targetId,
        actorId: userId,
        actorEmail: userProfile?.email || null,
        details,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Audit log skipped:', err?.message || err);
    }
  };

  // Persist scheduleRange preference
  useEffect(() => {
    try { localStorage.setItem('scheduleRange', scheduleRange); } catch {}
  }, [scheduleRange]);

  // Persist scheduleView preference
  useEffect(() => {
    try { localStorage.setItem('scheduleView', scheduleView); } catch {}
  }, [scheduleView]);

  // --- All Handler Functions ---
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };
  const getClientNameById = (clientId) => clients.find(c => c.id === clientId)?.name || 'Unknown Client';
  const getClientById = (clientId) => clients.find(c => c.id === clientId);
  const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const statusColors = {
    Draft: 'bg-gray-100 text-gray-800',
    'Awaiting Response': 'bg-yellow-100 text-yellow-800',
    'Changes Requested': 'bg-amber-100 text-amber-800',
    Approved: 'bg-green-100 text-green-800',
    Accepted: 'bg-green-100 text-green-800',
    Converted: 'bg-purple-100 text-purple-800',
    Archived: 'bg-gray-100 text-gray-600',
    Scheduled: 'bg-indigo-100 text-indigo-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    Completed: 'bg-green-100 text-green-800',
    Unpaid: 'bg-red-100 text-red-800',
    Sent: 'bg-blue-100 text-blue-800',
    Paid: 'bg-green-100 text-green-800',
  };
  const stripeEnabled = Boolean(import.meta.env.VITE_FUNCTIONS_BASE_URL);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const formatMoney = (n) => {
    const amount = Number(n || 0);
    const locale = companySettings?.locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    const currency = companySettings?.currencyCode;
    try {
      if (currency) return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    } catch (e) { /* ignore and fall back */ }
    const symbol = companySettings?.currencySymbol || '$';
    return symbol + amount.toFixed(2);
  };
  
  
  const handleCreateClientPage = async (data, options = {}) => {
      if (!db || !userId) return null;
      const cleanTags = (data.tags || []).map(t => (t || '').trim()).filter(Boolean);
      const cleanContacts = (data.contacts || []).map(c => ({
        role: (c.role||'').trim(),
        firstName: (c.firstName||'').trim(),
        lastName: (c.lastName||'').trim(),
        name: `${(c.firstName||'').trim()} ${(c.lastName||'').trim()}`.trim(),
        email: (c.email||'').trim(),
        phone: (c.phone||'').trim(),
        isBilling: !!c.isBilling,
        isPrimary: false,
        commPrefs: {
          quoteFollowups: !!(c.commPrefs && c.commPrefs.quoteFollowups),
          invoiceFollowups: !!(c.commPrefs && c.commPrefs.invoiceFollowups),
          visitReminders: !!(c.commPrefs && c.commPrefs.visitReminders),
          jobFollowups: !!(c.commPrefs && c.commPrefs.jobFollowups),
        },
      })).filter(c => c.firstName || c.lastName || c.email || c.phone);
      const phones = (data.phones || []).map(p => ({ label: (p.label||'').trim(), number: (p.number||'').trim() })).filter(p => p.label || p.number);
      const emails = (data.emails || []).map(e => ({ label: (e.label||'').trim(), address: (e.address||'').trim() })).filter(e => e.label || e.address);
      const properties = Array.isArray(data.properties) ? data.properties : [];
      const customFields = (data.customFields || []).filter(cf => (cf && (cf.key || cf.value))).map(cf => ({ key: (cf.key||'').trim(), value: (cf.value||'').trim() }));
      const base = {
        name: data.name,
        title: (data.title||'').trim(),
        firstName: (data.firstName||'').trim(),
        lastName: (data.lastName||'').trim(),
        company: (data.company||'').trim(),
        email: (data.email||'').trim(),
        phone: (data.phone||'').trim(),
        receivesTexts: !!data.receivesTexts,
        phones,
        emails,
        address: (data.address||'').trim(),
        tags: cleanTags,
        contacts: cleanContacts,
        leadSource: (data.leadSource||'').trim(),
        customFields,
        commPrefs: {
          quoteFollowups: !!(data.commPrefs && data.commPrefs.quoteFollowups),
          invoiceFollowups: !!(data.commPrefs && data.commPrefs.invoiceFollowups),
          visitReminders: !!(data.commPrefs && data.commPrefs.visitReminders),
          jobFollowups: !!(data.commPrefs && data.commPrefs.jobFollowups),
          askForReview: !!(data.commPrefs && data.commPrefs.askForReview),
        },
        properties,
      };
      if (options?.editClientId) {
        const patch = { ...base, updatedAt: new Date().toISOString() };
        await updateDoc(doc(db, `users/${userId}/clients`, options.editClientId), patch);
        await logAudit('update', 'client', options.editClientId, { fields: Object.keys(patch||{}) });
        setClientBeingEdited(null);
        setActiveView('clients');
        return options.editClientId;
      } else {
        const payload = { ...base, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, `users/${userId}/clients`), payload);
        await logAudit('create', 'client', docRef.id, { name: data.name });
        if (!options?.createAnother) setActiveView('clients');
        return docRef.id;
      }
  };
  const handleUpdateClient = async (clientId, data) => {
      if (!db || !userId) return;
      await updateDoc(doc(db, `users/${userId}/clients`, clientId), data);
      await logAudit('update', 'client', clientId, { fields: Object.keys(data || {}) });
  };
  const handleUpdateProperty = async (clientId, propertyId, updates) => {
    if (!clientId || !propertyId) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const props = Array.isArray(client.properties) ? client.properties : [];
    const nextProps = props.map((p, idx) => {
      const pid = p.uid || p.id || String(idx);
      if (pid !== propertyId) return p;
      return { ...p, ...updates };
    });
    await handleUpdateClient(clientId, { properties: nextProps });
    if (selectedClient?.id === clientId) setSelectedClient((prev) => ({ ...prev, properties: nextProps }));
    if (selectedProperty && (selectedProperty.uid || selectedProperty.id) === propertyId) {
      setSelectedProperty((prev) => ({ ...prev, ...updates }));
    }
  };
  const handleDeleteClient = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await deleteDoc(doc(db, `users/${userId}/clients`, clientId));
        await logAudit('delete', 'client', clientId);
        setSelectedClient(null);
        setSelectedProperty(null);
      } catch (error) { console.error("Error deleting client:", error); }
    }
  };
  const startNewQuote = (clientId = '') => {
    const clientViewDefaults = companySettings?.quoteClientViewSettings || initialQuoteState.clientViewSettings;
    const defaultProperty = findClientProperty(clientId, '');
    const defaultPropertyId = defaultProperty?.uid || defaultProperty?.id || '';
    setActiveView('createQuote');
    setSelectedQuote(null);
    setNewQuote({
      ...initialQuoteState,
      clientId,
      propertyId: defaultPropertyId,
      taxRate: companySettings?.defaultGstRate ?? initialQuoteState.taxRate ?? 15,
      contractTerms: companySettings?.quoteContractTerms || '',
      disclaimers: companySettings?.quoteDisclaimers || '',
      clientViewSettings: { ...clientViewDefaults },
      salesperson: userProfile?.name || userProfile?.email || '',
    });
  };
  // --- Client helper actions for ClientDetailView ---
  const startQuoteForClient = (c) => {
    try {
      setActiveView('quotes');
      startNewQuote(c?.id || '');
    } catch {}
  };
  const startJobForClient = (c) => {
    try {
      setActiveView('schedule');
      setShowJobForm(true);
      const nextProperty = findClientProperty(c?.id || '', '');
      const nextPropertyId = nextProperty?.uid || nextProperty?.id || '';
      setNewJob((j)=>({ ...j, clientId: c?.id || '', propertyId: nextPropertyId }));
    } catch {}
  };
  const startInvoiceCreate = ({ clientId = '', jobIds = [], mode = 'job' } = {}) => {
      setInvoiceCreateContext({ clientId, jobIds, mode });
      setSelectedInvoice(null);
      setActiveView('createInvoice');
    };
  const startInvoiceForClient = (c) => {
      startInvoiceCreate({ clientId: c?.id || '', jobIds: [], mode: 'ad_hoc' });
    };
  const startInvoiceForJob = (job) => {
      if (!job) return;
      startInvoiceCreate({ clientId: job.clientId, jobIds: [job.id], mode: 'job' });
    };
  const findClientProperty = (clientId, propertyId) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return null;
    const props = Array.isArray(client.properties) ? client.properties : [];
    if (propertyId) {
      return props.find((p, idx) => (p.uid || p.id || String(idx)) === propertyId) || null;
    }
    return props.find((p) => p.isPrimary) || props[0] || null;
  };
  const buildPropertySnapshot = (prop) => {
    if (!prop) return null;
    return {
      uid: prop.uid || prop.id || '',
      label: prop.label || '',
      street1: prop.street1 || '',
      street2: prop.street2 || '',
      city: prop.city || '',
      state: prop.state || '',
      zip: prop.zip || '',
      country: prop.country || '',
      taxRate: prop.taxRate || 'Default',
      lawnSizeWidth: prop.lawnSizeWidth || '',
      lawnSizeLength: prop.lawnSizeLength || '',
      lawnSizeUnit: prop.lawnSizeUnit || 'ft',
      accessCode: prop.accessCode || '',
      lockedGate: !!prop.lockedGate,
      lat: prop.lat || '',
      lng: prop.lng || '',
    };
  };
  const handleCollectPaymentForClient = async (c) => {
    try {
      const list = invoices.filter(i=>i.clientId===c.id && !i.isCreditNote && (i.status==='Unpaid' || i.status==='Sent'))
        .sort((a,b)=>new Date(b.issueDate||b.createdAt||0)-new Date(a.issueDate||a.createdAt||0));
      if (list.length===0) { alert('No unpaid/sent invoices for this client.'); return; }
      const inv = list[0];
      const amtStr = prompt(`Record payment for invoice ${inv.invoiceNumber || inv.id.substring(0,6)}. Enter amount:`);
      const amount = parseFloat(amtStr||'');
      if (!Number.isFinite(amount) || amount<=0) return;
      const invoiceDocRef = doc(db, `users/${userId}/invoices`, inv.id);
      const payments = Array.isArray(inv.payments)? [...inv.payments]:[];
      payments.push({ amount, method: 'Recorded', createdAt: new Date().toISOString() });
      let status = inv.status;
      const paidSoFar = payments.reduce((s,p)=>s+(p.amount||0),0);
      if ((paidSoFar)>= (inv.total||0)) status = 'Paid';
      await updateDoc(invoiceDocRef, { payments, status, paidAt: status==='Paid'? new Date().toISOString(): (inv.paidAt||null) });
      alert('Payment recorded.');
    } catch (e) { console.error(e); alert('Failed to record payment'); }
  };
  const viewAsClient = (c) => {
    try {
      const token = `${userId}.${c.id}`;
      const link = `${window.location.origin}${window.location.pathname}?portalToken=${encodeURIComponent(token)}`;
      window.open(link, '_blank');
    } catch {}
  };
  const downloadVCardForClient = (c) => {
    const fullName = c.name || '';
    const email = c.email || '';
    const phone = c.phone || '';
    const adr = (c.address||'').replace(/,/g,';');
    const v = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nTEL;TYPE=CELL:${phone}\nEMAIL:${email}\nADR;TYPE=WORK:;;${adr}\nEND:VCARD`;
    const blob = new Blob([v], { type: 'text/vcard' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(fullName||'client').replace(/[^a-z0-9_-]+/gi,'_')}.vcf`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  };
  const archiveClient = async (c) => {
    try { await handleUpdateClient(c.id, { archived: true, status: 'Archived' }); alert('Client archived'); }
    catch(e){ console.error(e); alert('Failed to archive client'); }
  };
  const startNewPropertyForClient = (c) => {
    if (!c) return;
    setClientBeingEdited(c);
    setAutoAddProperty(true);
    setActiveView('createClient');
  };
  const handleAddClientNote = async (clientId, noteText) => {
    if (!db || !userId || !noteText.trim()) return;
    await addDoc(collection(db, `users/${userId}/clients/${clientId}/notes`), {
      text: noteText,
      createdAt: new Date().toISOString(),
    });
  };
  
    const computeQuoteTotals = (q) => {
      const items = q.lineItems || [];
      let subtotalBeforeDiscount = 0;
      let lineDiscountTotal = 0;
      items.forEach(it => {
        const itemType = it?.type || 'line_item';
        if (itemType === 'text' || it?.isOptional) return;
        const qty = parseFloat(it.qty) || 0;
        const price = parseFloat(it.price) || 0;
        const lineSub = qty * price;
        subtotalBeforeDiscount += lineSub;
      const ldType = it.discountType || 'amount';
      const ldValueNum = parseFloat(it.discountValue || 0);
      const ldAmt = ldType === 'percent' ? (lineSub * (ldValueNum / 100)) : ldValueNum;
      lineDiscountTotal += (Number.isFinite(ldAmt) ? ldAmt : 0);
    });
    const quoteDiscType = q.quoteDiscountType || q.discountType || 'amount';
    const quoteDiscValue = parseFloat(q.quoteDiscountValue ?? q.discountValue ?? 0);
    const discountedSubtotal = Math.max(0, subtotalBeforeDiscount - lineDiscountTotal);
    const quoteDiscAmt = quoteDiscType === 'percent' ? (discountedSubtotal * (quoteDiscValue / 100)) : quoteDiscValue;
    const afterAllDiscounts = Math.max(0, discountedSubtotal - (Number.isFinite(quoteDiscAmt) ? quoteDiscAmt : 0));
    const taxRate = parseFloat(q.taxRate || 0);
    const taxAmount = afterAllDiscounts * (taxRate / 100);
    const total = afterAllDiscounts + taxAmount;
    const originalTax = subtotalBeforeDiscount * (taxRate / 100);
    const originalTotal = subtotalBeforeDiscount + originalTax;
    const totalSavings = Math.max(0, originalTotal - total);
      return {
        subtotalBeforeDiscount,
        lineDiscountTotal,
        quoteDiscountAmount: Number.isFinite(quoteDiscAmt) ? quoteDiscAmt : 0,
        taxAmount,
        total,
        originalTotal,
        totalSavings,
      };
    };
    const computeInvoiceDueDate = (iso, term) => {
      if (!iso) return '';
      const d = new Date(iso);
      const addDays = (days) => { const dd = new Date(d); dd.setDate(dd.getDate()+days); return dd.toISOString(); };
      const t = (term||'').toLowerCase();
      if (t === 'net 7' || t === '7 calendar days') return addDays(7);
      if (t === 'net 9') return addDays(9);
      if (t === 'net 14' || t === '14 calendar days') return addDays(14);
      if (t === 'net 15') return addDays(15);
      if (t === 'net 30' || t === '30 calendar days') return addDays(30);
      if (t === 'net 60') return addDays(60);
      return d.toISOString();
    };
  const sanitizeQuoteDraft = (draft) => {
      const customFields = (draft.customFields || [])
        .filter(cf => cf && (cf.key || cf.value))
        .map(cf => ({ key: (cf.key || '').trim(), value: (cf.value || '').trim() }));
      const lineItems = (draft.lineItems || []).slice(0, 100).map(it => ({ ...it }));
      const clientViewSettings = {
        showQuantities: draft.clientViewSettings?.showQuantities !== false,
        showUnitPrices: draft.clientViewSettings?.showUnitPrices !== false,
        showLineItemTotals: draft.clientViewSettings?.showLineItemTotals !== false,
        showTotals: draft.clientViewSettings?.showTotals !== false,
      };
      const prop = findClientProperty(draft.clientId, draft.propertyId);
      const propertySnapshot = draft.propertySnapshot || buildPropertySnapshot(prop);
      return {
        ...draft,
        status: 'Draft',
        customFields,
        lineItems,
        clientViewSettings,
        propertySnapshot,
      };
  };

  const createQuoteRecord = async (draft) => {
      if (!db || !userId) return null;
      const { subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total } = computeQuoteTotals(draft);
      const quoteBase = { ...draft, subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total, createdAt: new Date().toISOString() };
      const quotesCol = collection(db, `users/${userId}/quotes`);
      const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      let created = null;
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextQu || 1;
        const prefix = s.prefixQu || 'QU';
        const padding = s.padding ?? 4;
        const quoteNumber = `${prefix}-${pad(seq, padding)}`;
        const newDocRef = doc(quotesCol);
        tx.set(newDocRef, { ...quoteBase, quoteNumber });
        tx.set(invSettingsRef, { nextQu: seq + 1 }, { merge: true });
        created = { id: newDocRef.id, ...quoteBase, quoteNumber };
      });
      return created;
  };

  const createJobFromQuote = async (quote) => {
      if (!db || !userId || !quote) return null;
      const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      const jobNumber = await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextJob || 1;
        const prefix = s.prefixJob || 'JOB';
        const padding = s.padding ?? 4;
        const composed = `${prefix}-${pad(seq, padding)}`;
        tx.set(invSettingsRef, { nextJob: seq + 1 }, { merge: true });
        return composed;
      });
      const now = new Date().toISOString();
      const quoteProperty = findClientProperty(quote.clientId, quote.propertyId);
      const fallbackTitle = quote.lineItems?.[0]?.name || quote.lineItems?.[0]?.description || `Job for ${getClientNameById(quote.clientId)}`;
      const jobBase = {
        status: 'Unscheduled',
        clientId: quote.clientId,
        quoteId: quote.id,
        propertyId: quote.propertyId || quoteProperty?.uid || quoteProperty?.id || '',
        propertySnapshot: buildPropertySnapshot(quoteProperty),
        title: quote.title || fallbackTitle,
        jobNumber,
        createdAt: now,
        lineItems: quote.lineItems || [],
      };
      const refDoc = await addDoc(collection(db, `users/${userId}/jobs`), jobBase);
      await logAudit('create', 'job', refDoc.id, { fromQuoteId: quote.id });
      return { id: refDoc.id, ...jobBase };
  };

  const handleSaveQuoteAction = async (action = 'save', options = {}) => {
      if (!newQuote.clientId || !db || !userId) {
        alert('Please select a client before saving.');
        return;
      }
      const sanitized = sanitizeQuoteDraft(newQuote);
      const savedQuote = await createQuoteRecord(sanitized);
      if (!savedQuote) return;
      await logAudit('create', 'quote', savedQuote.id);

      if (options.applyLegalDefaults) {
        const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
        const updates = {
          quoteContractTerms: sanitized.contractTerms || '',
          quoteDisclaimers: sanitized.disclaimers || '',
        };
        await setDoc(settingsDocRef, updates, { merge: true });
        setCompanySettings(prev => ({ ...prev, ...updates }));
      }

      setNewQuote(initialQuoteState);
      setActiveView('quotes');

      if (action === 'email') {
        const sentAt = savedQuote.sentAt || new Date().toISOString();
        await handleSendQuote(savedQuote);
        setSelectedQuote({ ...savedQuote, status: 'Awaiting Response', sentAt });
        return;
      }
      if (action === 'text') {
        const sentAt = savedQuote.sentAt || new Date().toISOString();
        await handleSendQuoteText(savedQuote);
        setSelectedQuote({ ...savedQuote, status: 'Awaiting Response', sentAt });
        return;
      }
      if (action === 'mark_awaiting') {
        const sentAt = new Date().toISOString();
        await updateDoc(doc(db, `users/${userId}/quotes`, savedQuote.id), { status: 'Awaiting Response', sentAt });
        await logAudit('status_change', 'quote', savedQuote.id, { to: 'Awaiting Response' });
        setSelectedQuote({ ...savedQuote, status: 'Awaiting Response', sentAt });
        return;
      }
      if (action === 'convert') {
        const convertedAt = new Date().toISOString();
        await updateDoc(doc(db, `users/${userId}/quotes`, savedQuote.id), { status: 'Converted', convertedAt });
        await logAudit('status_change', 'quote', savedQuote.id, { to: 'Converted' });
        const job = await createJobFromQuote({ ...savedQuote, status: 'Converted', convertedAt });
        if (job) {
          setActiveView('jobs');
          setSelectedJob(job);
        }
        return;
      }
      setSelectedQuote(savedQuote);
  };
  const handleAcceptQuote = async (quoteId) => {
      if(!db || !userId) return;
      if (!window.confirm('Approve this quote? You will be able to schedule a job next.')) return;
      const now = new Date().toISOString();
      await updateDoc(doc(db, `users/${userId}/quotes`, quoteId), { status: 'Approved', approvedAt: now });
      await logAudit('approve', 'quote', quoteId);
      if (selectedQuote?.id === quoteId) setSelectedQuote(prev => ({ ...prev, status: 'Approved', approvedAt: now }));
  };
  const handleScheduleFromQuote = (quote) => {
      const fallbackTitle = quote.lineItems?.[0]?.name || quote.lineItems?.[0]?.description || `Job for ${getClientNameById(quote.clientId)}`;
      setNewJob({ ...initialJobState, clientId: quote.clientId, quoteId: quote.id, title: quote.title || fallbackTitle });
      setActiveView('schedule'); setShowJobForm(true);
  };
  const handleRevertQuoteToDraft = async (quoteId) => {
    if (!db || !userId) return;
    if (!window.confirm('Revert this quote to Draft? This will undo Sent status.')) return;
    await updateDoc(doc(db, `users/${userId}/quotes`, quoteId), { status: 'Draft' });
    await logAudit('revert', 'quote', quoteId, { to: 'Draft' });
    if (selectedQuote?.id === quoteId) setSelectedQuote(prev => ({...prev, status: 'Draft'}));
  };

  const handleMarkQuoteAwaiting = async (quote) => {
    if (!db || !userId || !quote?.id) return;
    const sentAt = quote.sentAt || new Date().toISOString();
    await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { status: 'Awaiting Response', sentAt });
    await logAudit('status_change', 'quote', quote.id, { to: 'Awaiting Response' });
    if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Awaiting Response', sentAt }));
  };

  const handleMarkQuoteApproved = async (quote, signerName) => {
    if (!db || !userId || !quote?.id) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
      status: 'Approved',
      approvalStatus: 'approved',
      approvedAt: now,
      approvedByName: (signerName || '').trim() || 'Approved',
    });
    await logAudit('approve', 'quote', quote.id);
    if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Approved', approvedAt: now }));
  };

  const handleArchiveQuote = async (quote) => {
    if (!db || !userId || !quote?.id) return;
    if (quote.status === 'Draft') {
      alert('Draft quotes must be marked as Awaiting Response before archiving.');
      return;
    }
    if (quote.status !== 'Awaiting Response' && quote.status !== 'Sent') {
      alert('Move the quote to Awaiting Response before archiving.');
      return;
    }
    await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { status: 'Archived', archived: true, archivedAt: new Date().toISOString() });
    await logAudit('archive', 'quote', quote.id);
    if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Archived', archived: true }));
  };

  const handleCreateSimilarQuote = async (quote) => {
    if (!db || !userId || !quote?.id) return;
    const quotesCol = collection(db, `users/${userId}/quotes`);
    const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    const pad = (n, width) => String(n).padStart(width ?? 4, '0');

    const clone = { ...quote };
    delete clone.id;
    delete clone.quoteNumber;
    delete clone.createdAt;
    delete clone.updatedAt;
    delete clone.publicApprovalToken;
    delete clone.approvalStatus;
    delete clone.approvedAt;
    delete clone.approvedByName;
    delete clone.archived;
    delete clone.archivedAt;
    delete clone._status;
    delete clone._clientName;
    delete clone._address;

    const { subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total } = computeQuoteTotals(clone);
    const quoteBase = {
      ...clone,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      subtotalBeforeDiscount,
      lineDiscountTotal,
      quoteDiscountAmount,
      taxAmount,
      total,
    };

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(invSettingsRef);
      const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
      const seq = s.nextQu || 1;
      const prefix = s.prefixQu || 'QU';
      const padding = s.padding ?? 4;
      const quoteNumber = `${prefix}-${pad(seq, padding)}`;
      const newDocRef = doc(quotesCol);
      tx.set(newDocRef, { ...quoteBase, quoteNumber });
      tx.set(invSettingsRef, { nextQu: seq + 1 }, { merge: true });
      return { id: newDocRef.id, quoteNumber };
    });
    await logAudit('create', 'quote', result.id, { sourceQuoteId: quote.id });
    setSelectedQuote({ id: result.id, ...quoteBase, quoteNumber: result.quoteNumber });
  };

  const handlePreviewQuoteAsClient = async (quote) => {
    if (!db || !userId || !quote?.id) return;
    let token = quote.publicApprovalToken;
    if (!token) {
      token = `${userId}.${quote.id}.${Math.random().toString(36).slice(2,10)}`;
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { publicApprovalToken: token });
    }
    const link = `${window.location.origin}${window.location.pathname}?quoteToken=${encodeURIComponent(token)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleCollectDeposit = async (quote) => {
    const amount = quote?.depositRequiredAmount || 0;
    alert(`Collect deposit: ${amount ? `$${amount}` : 'No deposit set'}. Stripe integration pending.`);
  };

  const handleCollectSignature = async (quote) => {
    const signer = window.prompt('Signer name for approval:');
    if (!signer) return;
    await handleMarkQuoteApproved(quote, signer);
  };

  // Generate a payment link (stub now; replace with Cloud Function call later)
  const handleGeneratePaymentLink = async (invoice) => {
    if (!db || !userId) return;
    try {
      const invoiceRef = doc(db, `users/${userId}/invoices`, invoice.id);
      if (invoice.paymentLink) {
        window.prompt('Payment link (copy):', invoice.paymentLink);
        return;
      }
      const base = import.meta.env?.VITE_FUNCTIONS_BASE_URL;
      if (base) {
        // Try to create a Stripe Checkout Session via deployed function
        const payload = {
          uid: userId,
          invoiceId: invoice.id,
          successUrl: window.location.origin + window.location.pathname + `?paid=1`,
          cancelUrl: window.location.href,
        };
        const res = await fetch(`${base.replace(/\/$/, '')}/api/createCheckoutSession`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create checkout session');
        const data = await res.json();
        const url = data.url;
        await updateDoc(invoiceRef, { paymentLink: url });
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(prev => ({ ...prev, paymentLink: url }));
        window.prompt('Payment link created (copy):', url);
      } else {
        // Stripe not configured; do not set a placeholder link.
        // The client portal will show a fallback "Pay Now (test)" button.
        alert('Stripe not configured yet. The Client Portal will show a test Pay Now button. To create real payment links, set VITE_FUNCTIONS_BASE_URL and deploy functions.');
      }
    } catch (err) {
      console.error('Payment link error:', err);
      alert('Failed to generate payment link.');
    }
  };

  // Progress invoicing removed per request

  // Generate or retrieve a public approval link for a Quote
  const handleGenerateQuoteApprovalLink = async (quote) => {
    if (!db || !userId) return;
    try {
      let token = quote.publicApprovalToken;
      if (!token) {
        token = `${userId}.${quote.id}.${Math.random().toString(36).slice(2,10)}`;
        await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { publicApprovalToken: token });
      }
      const link = `${window.location.origin}${window.location.pathname}?quoteToken=${encodeURIComponent(token)}`;
      window.prompt('Copy approval link:', link);
    } catch (err) {
      console.error('Generate approval link error:', err);
      alert('Failed to generate approval link.');
    }
  };

  // Public approve/decline handlers (used in PublicQuoteApproval)
  const publicApprove = async (signerName) => {
    try {
      const ctx = publicQuoteContext; if (!ctx) return;
      const now = new Date().toISOString();
      await updateDoc(doc(db, `users/${ctx.uid}/quotes`, ctx.quote.id), {
        status: 'Approved',
        approvalStatus: 'approved',
        approvedAt: now,
        approvedByName: (signerName || '').trim() || 'Client',
      });
      // Create job with a numbered sequence
      const invSettingsRef = doc(db, `users/${ctx.uid}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      const jobNumber = await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextJob || 1; const prefix = s.prefixJob || 'JOB'; const padding = s.padding ?? 4;
        const num = `${prefix}-${pad(seq, padding)}`;
        tx.set(invSettingsRef, { nextJob: seq + 1, prefixJob: prefix, padding }, { merge: true });
        return num;
      });
      await addDoc(collection(db, `users/${ctx.uid}/jobs`), {
        status: 'Draft',
        clientId: ctx.quote.clientId,
        quoteId: ctx.quote.id,
        title: ctx.quote.lineItems?.[0]?.description || `Job for ${ctx.client?.name || 'Client'}`,
        jobNumber,
        createdAt: now,
      });
      setPublicMessage('Quote approved. A draft job has been created.');
    } catch (err) {
      console.error('Public approve error:', err);
      setPublicError('Unable to approve quote.');
    }
  };
  const publicDecline = async (signerName) => {
    try {
      const ctx = publicQuoteContext; if (!ctx) return;
      const now = new Date().toISOString();
      await updateDoc(doc(db, `users/${ctx.uid}/quotes`, ctx.quote.id), {
        status: 'Changes Requested',
        approvalStatus: 'declined',
        declinedAt: now,
        declinedByName: (signerName || '').trim() || 'Client',
      });
      setPublicMessage('Quote declined.');
    } catch (err) {
      console.error('Public decline error:', err);
      setPublicError('Unable to decline quote.');
    }
  };
  const handleUpdateQuote = async (quoteId, data) => {
    if (!db || !userId) return;
    const existing = quotes.find(q => q.id === quoteId) || {};
    const calcSource = { ...existing, ...data };
    const { subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total } = computeQuoteTotals(calcSource);
    const nextClientId = data.clientId || existing.clientId;
    const nextPropertyId = data.propertyId || existing.propertyId;
    const prop = findClientProperty(nextClientId, nextPropertyId);
    const propertySnapshot = data.propertySnapshot || existing.propertySnapshot || buildPropertySnapshot(prop);
    const updatedData = { ...data, propertySnapshot, subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total };
    await updateDoc(doc(db, `users/${userId}/quotes`, quoteId), updatedData);
    if (selectedQuote?.id === quoteId) setSelectedQuote(prev => ({ ...prev, ...updatedData }));
  };
  const handleDeleteQuote = async (quoteId) => {
    if (window.confirm("Are you sure you want to delete this quote?")) {
      try {
        await deleteDoc(doc(db, `users/${userId}/quotes`, quoteId));
      } catch (error) { console.error("Error deleting quote:", error); }
    }
  };
  const handleArchiveQuotes = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const eligible = ids.filter(id => {
        const q = quotes.find(x => x.id === id);
        return q && (q.status === 'Awaiting Response' || q.status === 'Sent');
      });
      if (eligible.length !== ids.length) {
        alert('Only quotes in Awaiting Response can be archived.');
      }
      await Promise.all(eligible.map(id => updateDoc(doc(db, `users/${userId}/quotes`, id), { status: 'Archived', archived: true, archivedAt: new Date().toISOString() })));
    } catch (e) { console.error('Bulk archive quotes error', e); }
  };
  const handleBulkDeleteQuotes = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} quote(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db, `users/${userId}/quotes`, id))));
    } catch (e) { console.error('Bulk delete quotes error', e); }
  };
  const handleAddJob = async (e) => {
      e.preventDefault();
      if (!newJob.clientId || !newJob.title || !newJob.start || !db || !userId) return;
      const property = findClientProperty(newJob.clientId, newJob.propertyId);
      const propertyId = newJob.propertyId || property?.uid || property?.id || '';
      const propertySnapshot = buildPropertySnapshot(property);
      const jobNumber = await (async () => {
        const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
        const pad = (n, width) => String(n).padStart(width ?? 4, '0');
        const num = await runTransaction(db, async (tx) => {
          const snap = await tx.get(invSettingsRef);
          const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
          const seq = s.nextJob || 1; const prefix = s.prefixJob || 'JOB'; const padding = s.padding ?? 4;
          const composed = `${prefix}-${pad(seq, padding)}`;
          tx.set(invSettingsRef, { nextJob: seq + 1, prefixJob: prefix, padding }, { merge: true });
          return composed;
        });
        return num;
      })();
      await addDoc(collection(db, `users/${userId}/jobs`), { ...newJob, propertyId, propertySnapshot, jobNumber, assignees: newJob.assignees || [], createdAt: new Date().toISOString() });
      await logAudit('create', 'job', '(auto)', { title: newJob.title });
      if (newJob.quoteId) {
        await updateDoc(doc(db, `users/${userId}/quotes`, newJob.quoteId), {
          status: 'Converted',
          convertedAt: new Date().toISOString(),
        });
      }
      setNewJob(initialJobState); setShowJobForm(false);
  };
  const handleUpdateJobStatus = async (job, newStatus) => {
      if (!db || !userId) return;
      await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { status: newStatus });
      await logAudit('status_change', 'job', job.id, { from: job.status, to: newStatus });
      if (newStatus === 'Completed') handleCreateInvoiceFromJob(job);
  };
  const handleUploadJobAttachment = async (job, file) => {
    if (!db || !userId || !file) return;
    try {
      const key = `users/${userId}/jobs/${job.id}/attachments/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, key);
      const snap = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snap.ref);
      const record = { name: file.name, url, type: file.type || '', size: file.size || 0, createdAt: new Date().toISOString() };
      const next = [...(job.attachments || []), record];
      await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { attachments: next });
      if (selectedJob?.id === job.id) setSelectedJob(prev => ({ ...prev, attachments: next }));
      await logAudit('upload', 'job_attachment', job.id, { name: file.name, url });
      alert('Attachment uploaded');
    } catch (err) { console.error('Upload failed', err); alert('Upload failed'); }
  };
    const handleRemoveJobAttachment = async (job, url) => {
      if (!db || !userId) return;
      try {
        const next = (job.attachments || []).filter(a => a.url !== url);
        await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { attachments: next });
        if (selectedJob?.id === job.id) setSelectedJob(prev => ({ ...prev, attachments: next }));
        await logAudit('delete', 'job_attachment', job.id, { url });
      } catch (err) { console.error('Remove failed', err); alert('Remove failed'); }
    };
    const handleUploadInvoiceAttachment = async (invoice, file) => {
      if (!db || !userId || !file || !invoice?.id) return;
      try {
        const key = `users/${userId}/invoices/${invoice.id}/attachments/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, key);
        const snap = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snap.ref);
        const record = { name: file.name, url, type: file.type || '', size: file.size || 0, createdAt: new Date().toISOString() };
        const next = [...(invoice.attachments || []), record];
        await updateDoc(doc(db, `users/${userId}/invoices`, invoice.id), { attachments: next });
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(prev => ({ ...prev, attachments: next }));
        await logAudit('upload', 'invoice_attachment', invoice.id, { name: file.name, url });
        alert('Attachment uploaded');
      } catch (err) { console.error('Upload failed', err); alert('Upload failed'); }
    };
    const handleRemoveInvoiceAttachment = async (invoice, url) => {
      if (!db || !userId || !invoice?.id) return;
      try {
        const next = (invoice.attachments || []).filter(a => a.url !== url);
        await updateDoc(doc(db, `users/${userId}/invoices`, invoice.id), { attachments: next });
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(prev => ({ ...prev, attachments: next }));
        await logAudit('delete', 'invoice_attachment', invoice.id, { url });
      } catch (err) { console.error('Remove failed', err); alert('Remove failed'); }
    };
  const handleUpdateJobDetails = async (jobId, details) => {
      if (!db || !userId) return;
      await updateDoc(doc(db, `users/${userId}/jobs`, jobId), details);
  };
  const toggleNewJobAssignee = (staffId) => {
    setNewJob(j => {
      const ids = new Set(j.assignees || []);
      if (ids.has(staffId)) ids.delete(staffId); else ids.add(staffId);
      return { ...j, assignees: Array.from(ids) };
    });
  };
  
  const handleCreateInvoiceFromJob = async (job) => {
      if (!db || !userId) return null;
      const relatedQuote = quotes.find(q => q.id === job.quoteId);
      const client = getClientById(job.clientId);
      const baseLineItems = (job.lineItems && job.lineItems.length > 0)
        ? job.lineItems
        : (relatedQuote?.lineItems || [{ description: job.title, qty: 1, price: 0 }]);
      const normalizedLineItems = (baseLineItems || []).map((item) => ({
        type: item?.type || 'line_item',
        name: item?.name || item?.description || '',
        description: item?.description || item?.note || '',
        qty: Number(item?.qty ?? 1),
        price: Number(item?.price ?? 0),
        unitCost: Number(item?.unitCost ?? item?.cost ?? 0),
        isOptional: !!item?.isOptional,
        serviceDate: item?.serviceDate || '',
      }));
      const invTaxRate = (typeof relatedQuote?.taxRate === 'number') ? relatedQuote.taxRate : (companySettings?.defaultGstRate ?? 0);
      const invDiscType = relatedQuote?.quoteDiscountType ?? relatedQuote?.discountType ?? 'amount';
      const invDiscValue = parseFloat(relatedQuote?.quoteDiscountValue ?? relatedQuote?.discountValue ?? 0);
      const calc = computeQuoteTotals({ lineItems: normalizedLineItems, taxRate: invTaxRate, quoteDiscountType: invDiscType, quoteDiscountValue: invDiscValue });
      const jobProperty = job.propertySnapshot || findClientProperty(job.clientId, job.propertyId);
      const serviceAddress = jobProperty
        ? [jobProperty.label, jobProperty.street1, jobProperty.street2, [jobProperty.city, jobProperty.state, jobProperty.zip].filter(Boolean).join(' '), jobProperty.country].filter(Boolean).join(', ')
        : (client?.address || '');
      const invoiceData = {
          clientId: job.clientId,
          jobId: job.id,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          subject: job.title || relatedQuote?.title || 'For services rendered',
          lineItems: normalizedLineItems,
          billingAddress: client?.address || '',
          serviceAddress,
          contactPhone: client?.phone || '',
          contactEmail: client?.email || '',
          customFields: Array.isArray(relatedQuote?.customFields) ? relatedQuote.customFields : [],
          clientMessage: companySettings?.invoiceMessage || '',
          contractTerms: companySettings?.invoiceContractTerms || '',
          disclaimers: companySettings?.invoiceDisclaimers || '',
          clientViewSettings: companySettings?.invoiceClientViewSettings || {
            showQuantities: true,
            showUnitCosts: true,
            showLineItemTotals: true,
            showTotals: true,
            showAccountBalance: true,
            showLateStamp: false,
          },
          paymentSettings: companySettings?.invoicePaymentSettings || {
            acceptCard: true,
            acceptBank: false,
            allowPartialPayments: true,
          },
          askForReview: !!(client?.commPrefs && client.commPrefs.askForReview),
          depositApplied: 0,
          // carry over tax and discount context so UI and reporting are consistent
          taxRate: invTaxRate,
          quoteDiscountType: invDiscType,
          quoteDiscountValue: invDiscValue,
          subtotalBeforeDiscount: calc.subtotalBeforeDiscount,
          lineDiscountTotal: calc.lineDiscountTotal,
          quoteDiscountAmount: calc.quoteDiscountAmount,
          taxAmount: calc.taxAmount,
          originalTotal: calc.originalTotal,
          total: calc.total,
      };
      const invoicesCol = collection(db, `users/${userId}/invoices`);
      const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);

      const pad = (n, width) => String(n).padStart(width, '0');
      const computeDueDate = (iso, term) => {
        const d = new Date(iso);
        const addDays = (days) => { const dd = new Date(d); dd.setDate(dd.getDate()+days); return dd.toISOString(); };
        const t = (term||'').toLowerCase();
        if (t === 'net 7' || t === '7 calendar days') return addDays(7);
        if (t === 'net 9') return addDays(9);
        if (t === 'net 14' || t === '14 calendar days') return addDays(14);
        if (t === 'net 15') return addDays(15);
        if (t === 'net 30' || t === '30 calendar days') return addDays(30);
        if (t === 'net 60') return addDays(60);
        // Due Today / Due on receipt
        return d.toISOString();
      };

      const created = await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextInvCn || 1;
        const prefix = s.prefixInv || 'INV';
        const padding = s.padding ?? 4;
        const invoiceNumber = `${prefix}-${pad(seq, padding)}`;
        const issueDate = new Date().toISOString();
        const dueTerm = s.defaultTerm || 'Due Today';
        const dueDate = computeDueDate(issueDate, dueTerm);
        const newDocRef = doc(invoicesCol);
        const payload = { ...invoiceData, invoiceNumber, issueDate, dueTerm, dueDate };
        tx.set(newDocRef, payload);
        tx.set(invSettingsRef, { nextInvCn: seq + 1 }, { merge: true });
        return { id: newDocRef.id, ...payload };
      });
      await logAudit('create', 'invoice', created.id, { jobId: job.id });
      return created;
  };
  const handleCreateInvoiceFromDraft = async (draft) => {
    if (!db || !userId || !draft) return null;
    const normalizedItems = Array.isArray(draft.lineItems) ? draft.lineItems.map((item) => ({
      ...item,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      unitCost: Number(item.unitCost || 0),
    })) : [];
    const issueDate = draft.issueDate || new Date().toISOString();
    const dueTerm = draft.dueTerm || invoiceSettings.defaultTerm || 'Due Today';
    const dueDate = computeInvoiceDueDate(issueDate, dueTerm);
    const taxRate = (typeof draft.taxRate === 'number') ? draft.taxRate : (companySettings?.defaultGstRate ?? 0);
    const discType = draft.quoteDiscountType || draft.discountType || 'amount';
    const discValue = parseFloat(draft.quoteDiscountValue ?? draft.discountValue ?? 0);
    const calc = computeQuoteTotals({ lineItems: normalizedItems, taxRate, quoteDiscountType: discType, quoteDiscountValue: discValue });
    const invoiceData = {
      ...draft,
      lineItems: normalizedItems,
      status: draft.status || 'Draft',
      createdAt: draft.createdAt || new Date().toISOString(),
      issueDate,
      dueTerm,
      dueDate,
      taxRate,
      quoteDiscountType: discType,
      quoteDiscountValue: discValue,
      subtotalBeforeDiscount: calc.subtotalBeforeDiscount,
      lineDiscountTotal: calc.lineDiscountTotal,
      quoteDiscountAmount: calc.quoteDiscountAmount,
      taxAmount: calc.taxAmount,
      originalTotal: calc.originalTotal,
      total: calc.total,
    };
    delete invoiceData.id;
    const invoicesCol = collection(db, `users/${userId}/invoices`);
    const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    const pad = (n, width) => String(n).padStart(width, '0');
    const created = await runTransaction(db, async (tx) => {
      const snap = await tx.get(invSettingsRef);
      const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
      const seq = s.nextInvCn || 1;
      const prefix = s.prefixInv || 'INV';
      const padding = s.padding ?? 4;
      const invoiceNumber = `${prefix}-${pad(seq, padding)}`;
      const newDocRef = doc(invoicesCol);
      const payload = { ...invoiceData, invoiceNumber };
      tx.set(newDocRef, payload);
      tx.set(invSettingsRef, { nextInvCn: seq + 1 }, { merge: true });
      return { id: newDocRef.id, ...payload };
    });
    await logAudit('create', 'invoice', created.id, { jobIds: created.jobIds || [], jobId: created.jobId || null });
    setActiveView('invoices');
    setSelectedInvoice(created);
    setInvoiceCreateContext({ clientId: '', jobIds: [], mode: 'job' });
    return created;
  };
  const handleUpdateInvoiceStatus = async (invoiceId, newStatus) => {
      if (!db || !userId) return;
      const invoiceDocRef = doc(db, `users/${userId}/invoices`, invoiceId);
      const dataToUpdate = { status: newStatus };
      if (newStatus === 'Paid') dataToUpdate.paidAt = new Date().toISOString();
      if (newStatus === 'Sent') dataToUpdate.sentAt = new Date().toISOString();
      await updateDoc(invoiceDocRef, dataToUpdate);
      await logAudit('status_change', 'invoice', invoiceId, { to: newStatus });
      if (selectedInvoice?.id === invoiceId) setSelectedInvoice(prev => ({...prev, ...dataToUpdate}));
    };

  const handleUpdateInvoiceFields = async (invoiceId, fields) => {
    if (!db || !userId) return;
    const invoiceDocRef = doc(db, `users/${userId}/invoices`, invoiceId);
    await updateDoc(invoiceDocRef, fields);
    if (selectedInvoice?.id === invoiceId) setSelectedInvoice(prev => ({...prev, ...fields}));
  };
  // Credit Note issuance removed per request
  
  const handleMarkNotificationAsRead = async (id) => {
      if (!db || !userId) return;
      await updateDoc(doc(db, `users/${userId}/notifications`, id), { read: true });
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!newInvite.email) return alert("Please enter an email address to invite.");
    try {
      await addDoc(collection(db, 'invites'), {
        email: newInvite.email.toLowerCase(),
        role: newInvite.role,
        invitedBy: userProfile.email,
        createdAt: new Date().toISOString(),
      });
      alert(`Invitation sent to ${newInvite.email}!`);
      setNewInvite({ email: '', role: 'member' });
    } catch (error) {
      console.error("Error sending invitation: ", error);
      alert("Failed to send invitation.");
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name) return;
    await addDoc(collection(db, `users/${userId}/quoteTemplates`), newTemplate);
    setNewTemplate({ name: '', price: 0 });
  };
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await deleteDoc(doc(db, `users/${userId}/quoteTemplates`, id));
  };

  const handleSaveSettings = async (e) => {
      e.preventDefault();
      if (!db || !userId) return;
      alert('Saving settings...');
      const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
    await setDoc(settingsDocRef, companySettings, { merge: true });
    if (logoFile) {
      const logoRef = ref(storage, `users/${userId}/logo/company_logo`);
      try {
        const snapshot = await uploadBytes(logoRef, logoFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        await updateDoc(settingsDocRef, { logoUrl: downloadURL });
        setCompanySettings(prev => ({...prev, logoUrl: downloadURL}));
      } catch (error) { console.error("Error uploading logo: ", error); alert("Logo upload failed."); }
    }
      setLogoFile(null);
      alert('Settings saved successfully!');
    };
    const handleApplyInvoiceDefaults = async (updates = {}) => {
      if (!db || !userId) return;
      const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
      const next = { ...companySettings, ...updates };
      await setDoc(settingsDocRef, next, { merge: true });
      setCompanySettings(next);
    };

  const handleSaveInvoiceSettings = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    const ref = doc(db, `users/${userId}/settings/invoiceSettings`);
    await setDoc(ref, invoiceSettings, { merge: true });
    alert('Invoice settings saved');
  };

  const handleSaveEmailTemplates = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    const ref = doc(db, `users/${userId}/settings/emailTemplates`);
    await setDoc(ref, emailTemplates, { merge: true });
    alert('Email templates saved');
  };

  const renderTemplate = (tpl, variables) =>
    (tpl || '').replace(/\{\{(.*?)\}\}/g, (_, key) => variables[key.trim()] ?? '');

  const handleSendInvoice = async (invoice) => {
      if (!db || !userId) return;
      const client = getClientById(invoice.clientId);
      const variables = {
        clientName: client?.name || 'Client',
        companyName: companySettings?.name || 'Our Company',
        documentNumber: invoice.invoiceNumber || invoice.id.substring(0,8),
        total: `$${(invoice.total||0).toFixed(2)}`,
      };
      const subject = renderTemplate(emailTemplates.invoiceSubject, variables);
      const body = renderTemplate(emailTemplates.invoiceBody, variables);
      // Simulate send: create a notification and mark invoice Sent if not Paid
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Sent invoice ${variables.documentNumber} to ${client?.email || 'client'}`,
        createdAt: new Date().toISOString(),
        read: false,
      });
      if (invoice.status !== 'Paid') await handleUpdateInvoiceStatus(invoice.id, 'Sent');
      await logAudit('send', 'invoice', invoice.id);
      alert(`Simulated email sent:\nSubject: ${subject}\n\n${body}`);
    };

  const handleSendQuote = async (quote) => {
    if (!db || !userId) return;
    const client = getClientById(quote.clientId);
    const variables = {
      clientName: client?.name || 'Client',
      companyName: companySettings?.name || 'Our Company',
      documentNumber: quote.quoteNumber || quote.id.substring(0,8),
      total: `$${(quote.total||0).toFixed(2)}`,
    };
    const subject = renderTemplate(emailTemplates.quoteSubject, variables);
    const body = renderTemplate(emailTemplates.quoteBody, variables);
    await addDoc(collection(db, `users/${userId}/notifications`), {
      message: `Sent quote ${variables.documentNumber} to ${client?.email || 'client'}`,
      createdAt: new Date().toISOString(),
      read: false,
    });
    const sentAt = quote.sentAt || new Date().toISOString();
    if (quote.status === 'Draft' || quote.status === 'Awaiting Response' || quote.status === 'Sent') {
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { status: 'Awaiting Response', sentAt });
      if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({...prev, status: 'Awaiting Response', sentAt }));
    }
    await logAudit('send', 'quote', quote.id);
    alert(`Simulated email sent:\nSubject: ${subject}\n\n${body}`);
  };

  const handleSendQuoteText = async (quote) => {
      if (!db || !userId || !quote) return;
      const sentAt = quote.sentAt || new Date().toISOString();
      if (quote.status === 'Draft' || quote.status === 'Awaiting Response' || quote.status === 'Sent') {
        await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { status: 'Awaiting Response', sentAt });
        if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Awaiting Response', sentAt }));
      }
      await logAudit('send', 'quote', quote.id, { channel: 'text' });
      alert('Text messaging is not configured yet. This will send a secure approval link when SMS is enabled.');
    };

  // --- Conditional Rendering Logic ---
  // Render Public Quote Approval view when accessed via tokenized link
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

  // Render Public Client Portal when accessed via portal token
  if (publicPortalContext) {
    return (
      <PublicClientPortal uid={publicPortalContext.uid} clientId={publicPortalContext.clientId} company={companySettings} />
    );
  }

  if (!userId || !userProfile) {
    return <Auth />;
  }
  if (invoiceToPrint) {
    const clientForInvoice = getClientById(invoiceToPrint.clientId);
    return <InvoicePrintView 
        invoice={invoiceToPrint} 
        client={clientForInvoice} 
        company={companySettings} 
        statusColors={statusColors}
        onBack={() => setInvoiceToPrint(null)} 
    />
  }
  if (quoteToPrint) {
    const clientForQuote = getClientById(quoteToPrint.clientId);
    return <QuotePrintView 
        quote={quoteToPrint} 
        client={clientForQuote} 
        company={companySettings} 
        statusColors={statusColors}
        onBack={() => setQuoteToPrint(null)} 
    />
  }

  const newJobClient = clients.find((c) => c.id === newJob.clientId);
  const newJobProperties = Array.isArray(newJobClient?.properties) ? newJobClient.properties : [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex">
      <Sidebar
        activeView={activeView}
        setActiveView={(v) => { setActiveView(v); setSelectedClient(null); setSelectedProperty(null); setSelectedJob(null); setSelectedQuote(null); setSelectedInvoice(null); setSidebarOpen(false); }}
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

        {/* Replaced top tabs with left sidebar on desktop */}

        <main>
          {activeView === 'dashboard' && (
             <div>
              <DashboardCards
                quotes={quotes}
                jobs={jobs}
                invoices={invoices}
                onNewQuote={() => { startNewQuote(); }}
                onNewJob={() => { setActiveView('schedule'); setShowJobForm(true); }}
                formatMoney={formatMoney}
              />
              {/* Today's Appointments */}
              <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 font-semibold">Today's Appointments</div>
                {(() => {
                  const today = new Date().toDateString();
                  const todays = jobs.filter(j => j.start && new Date(j.start).toDateString() === today);
                  const total = todays.length;
                  const totalVal = todays.reduce((s,j)=>{
                    const q = quotes.find(x => x.id === j.quoteId);
                    return s + (q?.total || 0);
                  },0);
                  const active = todays.filter(j=>j.status==='In Progress').length;
                  const complete = todays.filter(j=>j.status==='Completed').length;
                  const toGo = Math.max(0, total - active - complete);
                  const Box = ({color,title,count,val}) => (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-md p-3 border border-gray-100">
                      <div className={`h-8 w-8 rounded-md text-white flex items-center justify-center font-bold`} style={{backgroundColor:color}}>{count}</div>
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

          {activeView === 'createClient' && (
            <CreateClient
              initialClient={clientBeingEdited}
              autoAddProperty={autoAddProperty}
              onBack={() => { setClientBeingEdited(null); setAutoAddProperty(false); setActiveView('clients'); }}
              onSave={(payload, opts) => { setAutoAddProperty(false); return handleCreateClientPage(payload, { ...(opts||{}), editClientId: clientBeingEdited?.id }); }}
            />
          )}

          {activeView === 'clients' && (
            <div>
              {selectedClient ? (
                selectedProperty ? (
                  <PropertyDetailView
                    client={selectedClient}
                    property={selectedProperty}
                    quotes={quotes}
                    jobs={jobs}
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
                    quotes={quotes}
                    jobs={jobs}
                    invoices={invoices}
                    notifications={notifications}
                    statusColors={statusColors}
                    formatDateTime={formatDateTime}
                    clientNotes={clientNotes}
                    onAddNote={handleAddClientNote}
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
                <div>
                    <ClientsList
                      clients={clients}
                      quotes={quotes}
                      jobs={jobs}
                      invoices={invoices}
                      onSelectClient={(c) => { setSelectedProperty(null); setSelectedClient(c); }}
                      onNewClientClick={() => { setActiveView('createClient'); }}
                    />
                  {/* legacy inline new client form removed
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200 animate-fade-in">
                      <form onSubmit={handleAddClient}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input type="text" name="name" id="name" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} placeholder="e.g., Jane Doe" required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                          </div>
                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input type="email" name="email" id="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} placeholder="e.g., jane.doe@example.com" required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                          </div>
                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input type="tel" name="phone" id="phone" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} placeholder="e.g., (555) 123-4567" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                          </div>
                          <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                            <input type="text" name="address" id="address" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})} placeholder="e.g., 123 Main St, Anytown, USA" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(newClient.tags || []).map((t, idx) => (
                                <span key={`${t}-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {t}
                                  <button type="button" onClick={() => removeNewClientTag(idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input type="text" value={newClientTagInput} onChange={(e) => setNewClientTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewClientTag(); } }} placeholder="Add a tag (e.g., Lead, VIP)" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                              <button type="button" onClick={addNewClientTag} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add</button>
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">Contacts</label>
                              <button type="button" onClick={addNewClientContact} className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200">+ Add Contact</button>
                            </div>
                            {(newClient.contacts || []).length === 0 && (<p className="text-xs text-gray-500 mb-2">No additional contacts. Add one above.</p>)}
                            <div className="space-y-3">
                              {(newClient.contacts || []).map((c, idx) => {
                                const invalidEmail = (c.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((c.email || '').trim());
                                return (
                                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                                    <input type="text" value={c.name || ''} onChange={(e) => updateNewClientContact(idx, 'name', e.target.value)} placeholder="Name" className="px-2 py-1 border border-gray-300 rounded-md shadow-sm"/>
                                    <div>
                                      <input type="email" value={c.email || ''} onChange={(e) => updateNewClientContact(idx, 'email', e.target.value)} placeholder="Email" aria-invalid={invalidEmail} className={`px-2 py-1 border rounded-md shadow-sm ${invalidEmail ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}/>
                                      {invalidEmail && <p className="text-xs text-red-600 mt-1">Please enter a valid email.</p>}
                                    </div>
                                    <input type="tel" value={c.phone || ''} onChange={(e) => updateNewClientContact(idx, 'phone', e.target.value)} placeholder="Phone" className="px-2 py-1 border border-gray-300 rounded-md shadow-sm"/>
                                    <div className="flex gap-2">
                                      <input type="text" value={c.role || ''} onChange={(e) => updateNewClientContact(idx, 'role', e.target.value)} placeholder="Role (e.g., Owner)" className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm"/>
                                      <button type="button" onClick={() => removeNewClientContact(idx)} className="px-2 py-1 text-red-600 hover:text-red-800 text-xs font-semibold">Remove</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 text-right">
                          <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75">Save Client</button>
                        </div>
                      </form>
                    </div>
                  */}
                </div>
              )}
            </div>
          )}

          {activeView === 'jobs' && (
            <div>
              {selectedJob ? (
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
                  onOpenClient={(clientId) => { const c = clients.find(c=>c.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
                  onUploadAttachment={(file) => handleUploadJobAttachment(selectedJob, file)}
                  onRemoveAttachment={(url) => handleRemoveJobAttachment(selectedJob, url)}
                  onCreateInvoice={(job) => startInvoiceForJob(job)}
                  onOpenQuote={(q) => { if (q) { setActiveView('quotes'); setSelectedQuote(q); } }}
                  backLabel={'Back to jobs'}
                  userRole={userProfile?.role}
                />
              ) : (
                <div>
                  <JobsList
                    jobs={jobs}
                    clients={clients}
                    quotes={quotes}
                    invoices={invoices}
                    onOpenJob={(job) => setSelectedJob(job)}
                    onNewJobClick={() => setShowJobForm(s=>!s)}
                    onManageJobForms={() => setActiveView('settings')}
                  />
                  {showJobForm && (
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200 animate-fade-in">
                      <form onSubmit={handleAddJob}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                            <select
                              value={newJob.clientId}
                              onChange={(e) => {
                                const nextClientId = e.target.value;
                                const nextProperty = findClientProperty(nextClientId, '');
                                const nextPropertyId = nextProperty?.uid || nextProperty?.id || '';
                                setNewJob({ ...newJob, clientId: nextClientId, propertyId: nextPropertyId });
                              }}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="" disabled>Select a client</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          {newJobProperties.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                              <select
                                value={newJob.propertyId || ''}
                                onChange={(e) => setNewJob({ ...newJob, propertyId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select property</option>
                                {newJobProperties.map((p, idx) => (
                                  <option key={p.uid || p.id || idx} value={p.uid || p.id || String(idx)}>
                                    {p.label || p.street1 || `Property ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={newJob.title}
                              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                              placeholder="e.g., House Wash - Front"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                            <select
                              value={newJob.jobType || 'one_off'}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                setNewJob((prev) => {
                                  const next = { ...prev, jobType: nextType };
                                  if (nextType === 'one_off') {
                                    next.schedule = 'One-time';
                                    next.billingFrequency = prev.billingFrequency || 'Upon job completion';
                                  } else if (nextType === 'recurring' && (!prev.schedule || prev.schedule === 'One-time')) {
                                    next.schedule = 'Weekly';
                                  }
                                  return next;
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="one_off">One-off job</option>
                              <option value="recurring">Recurring job</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                            <select
                              value={newJob.schedule || 'One-time'}
                              onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
                              disabled={(newJob.jobType || 'one_off') === 'one_off'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                            >
                              <option value="One-time">One-time</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Every 2 weeks">Every 2 weeks</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                            <input
                              type="datetime-local"
                              value={newJob.start || ''}
                              onChange={(e) => setNewJob({ ...newJob, start: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End (optional)</label>
                            <input
                              type="datetime-local"
                              value={newJob.end || ''}
                              onChange={(e) => setNewJob({ ...newJob, end: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={newJob.status}
                              onChange={(e) => setNewJob({ ...newJob, status: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label>
                            <select
                              value={newJob.billingFrequency || 'Upon job completion'}
                              onChange={(e) => setNewJob({ ...newJob, billingFrequency: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="Upon job completion">Upon job completion</option>
                              <option value="Per visit">Per visit</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Every 2nd visit">Every 2nd visit</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id="auto-payments"
                              type="checkbox"
                              checked={!!newJob.automaticPayments}
                              onChange={(e) => setNewJob({ ...newJob, automaticPayments: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <label htmlFor="auto-payments" className="text-sm font-medium text-gray-700">Automatic payments</label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                              value={newJob.notes || ''}
                              onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Special instructions, access details, etc."
                            />
                          </div>
                        </div>
                        <div className="mt-6 text-right">
                          <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Save Job</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeView === 'quotes' && (
            <div>
              {selectedQuote ? (
                <QuoteDetailView
                  quote={selectedQuote}
                  client={getClientById(selectedQuote.clientId)}
                  clients={clients}
                  onBack={() => setSelectedQuote(null)}
                  statusColors={statusColors}
                  onUpdate={handleUpdateQuote}
                  onSendEmail={handleSendQuote}
                  onSendText={handleSendQuoteText}
                  onPrint={(q) => setQuoteToPrint(q)}
                  onConvertToJob={handleScheduleFromQuote}
                  onCreateSimilar={handleCreateSimilarQuote}
                  onCollectDeposit={handleCollectDeposit}
                  onPreviewClient={handlePreviewQuoteAsClient}
                  onMarkAwaiting={handleMarkQuoteAwaiting}
                  onMarkApproved={handleMarkQuoteApproved}
                  onCollectSignature={handleCollectSignature}
                  onArchiveQuote={handleArchiveQuote}
                  onOpenClient={(clientId) => { const c = clients.find(c=>c.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
                  userRole={userProfile?.role}
                  defaultTaxRate={companySettings?.defaultGstRate}
                />
              ) : (
                <div>
                  <QuotesList
                    quotes={quotes}
                    clients={clients}
                    jobs={jobs}
                    onOpenQuote={(q)=> setSelectedQuote(q)}
                    onNewQuoteClick={() => startNewQuote()}
                    onArchiveQuotes={handleArchiveQuotes}
                    onDeleteQuotes={handleBulkDeleteQuotes}
                    onConvertQuote={handleScheduleFromQuote}
                    onSendQuote={handleSendQuote}
                  />
                  {/* Quote status filter chips */}
                  <div className="hidden mb-4 flex flex-wrap gap-2">
                    {['Draft','Awaiting Response','Approved','Converted','Archived'].map(s => {
                      const active = quoteStatusFilter.includes(s);
                      return (
                        <button key={s} onClick={() => setQuoteStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{s}</button>
                      );
                    })}
                    {quoteStatusFilter.length>0 && <button onClick={() => setQuoteStatusFilter([])} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Clear</button>}
                  </div>
                  <div className="hidden">{isLoading ? <div className="text-center p-10 text-gray-500">Loading...</div> : filteredQuotes.length === 0 ? <div className="text-center p-10 text-gray-500"><h3 className="text-lg font-medium">No quotes yet!</h3></div> : <ul className="divide-y divide-gray-200">{filteredQuotes.map(quote => (
                    <li key={quote.id} onClick={() => setSelectedQuote(quote)} className="list-row">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-blue-700">{getClientNameById(quote.clientId)}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusColors[quote.status]}`}>{quote.status}</span>
                          <p className="text-lg font-semibold text-gray-800 sm:hidden mt-2">${(quote.total || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center mt-4 sm:mt-0">
                          <div className="text-right mr-4">
                            <p className="text-base font-semibold text-gray-800 hidden sm:block">${(quote.total || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{quote.quoteNumber || `ID: ${quote.id.substring(0,6)}...`}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {(quote.status === 'Draft' || quote.status === 'Awaiting Response' || quote.status === 'Sent') && (userProfile?.role === 'admin' || userProfile?.role === 'manager') && <button onClick={(e) => { e.stopPropagation(); handleMarkQuoteApproved(quote);}} className="btn btn-green">Approve</button>}
                            {(quote.status === 'Approved' || quote.status === 'Accepted') && <button onClick={(e) => { e.stopPropagation(); handleScheduleFromQuote(quote);}} className="btn btn-blue">Schedule Job</button>}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id);}} className="p-2 text-gray-400 hover:text-red-600 rounded-md">
                              <Trash2Icon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}</ul>}</div>
                </div>
              )}
            </div>
          )}

          {activeView === 'createQuote' && (
            <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-[#f8f5f0] border-t-4 border-[#7a2f2f] px-4 sm:px-6 lg:px-8 py-6">
              <QuoteCreateForm
                quote={newQuote}
                setQuote={setNewQuote}
                clients={clients}
                staff={staff}
                quoteTemplates={quoteTemplates}
                companySettings={companySettings}
                onSave={handleSaveQuoteAction}
                onCancel={() => { setActiveView('quotes'); setNewQuote(initialQuoteState); }}
              />
            </div>
          )}

          {activeView === 'createInvoice' && (
            <div className="max-w-6xl mx-auto">
              <InvoiceCreateFlow
                clients={clients}
                jobs={jobs}
                invoices={invoices}
                companySettings={companySettings}
                invoiceSettings={invoiceSettings}
                initialClientId={invoiceCreateContext.clientId}
                initialJobIds={invoiceCreateContext.jobIds}
                initialMode={invoiceCreateContext.mode}
                onCancel={() => { setActiveView('invoices'); setSelectedInvoice(null); setInvoiceCreateContext({ clientId: '', jobIds: [], mode: 'job' }); }}
                onCreateInvoice={(draft) => handleCreateInvoiceFromDraft(draft)}
              />
            </div>
          )}

          {activeView === 'schedule' && (
            <div>
              {selectedJob ? (
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
                  onOpenClient={(clientId) => { const c = clients.find(c=>c.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
                  onUploadAttachment={(file) => handleUploadJobAttachment(selectedJob, file)}
                  onRemoveAttachment={(url) => handleRemoveJobAttachment(selectedJob, url)}
                  onCreateInvoice={(job) => startInvoiceForJob(job)}
                  onOpenQuote={(q) => { if (q) { setActiveView('quotes'); setSelectedQuote(q); } }}
                  userRole={userProfile?.role}
                />
              ) : (
                <div>
                  <div className="mb-6 flex justify-between items-center">
                    <div className="flex items-center">
                      <h2 className="text-2xl font-semibold text-gray-800 flex items-center"><CalendarIcon /> Schedule</h2>
                      <div className="ml-4 flex items-center gap-3">
                        <span className="isolate inline-flex rounded-md shadow-sm">
                          <button onClick={() => setScheduleView('list')} className={`relative inline-flex items-center rounded-l-md px-3 py-1 text-sm font-semibold ${scheduleView === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>List</button>
                          <button onClick={() => setScheduleView('calendar')} className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1 text-sm font-semibold ${scheduleView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>Calendar</button>
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Range</label>
                          <select value={scheduleRange} onChange={(e)=>setScheduleRange(e.target.value)} className="px-2 py-1 border border-gray-300 rounded-md text-xs">
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowJobForm(s => !s)} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"><PlusCircleIcon /><span>{showJobForm ? 'Cancel' : 'Schedule Job'}</span></button>
                  </div>
                  {showJobForm && (
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200 animate-fade-in">
                      <form onSubmit={handleAddJob}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                            <select
                              value={newJob.clientId}
                              onChange={(e) => {
                                const nextClientId = e.target.value;
                                const nextProperty = findClientProperty(nextClientId, '');
                                const nextPropertyId = nextProperty?.uid || nextProperty?.id || '';
                                setNewJob({ ...newJob, clientId: nextClientId, propertyId: nextPropertyId });
                              }}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="" disabled>Select a client</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          {newJobProperties.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                              <select
                                value={newJob.propertyId || ''}
                                onChange={(e) => setNewJob({ ...newJob, propertyId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select property</option>
                                {newJobProperties.map((p, idx) => (
                                  <option key={p.uid || p.id || idx} value={p.uid || p.id || String(idx)}>
                                    {p.label || p.street1 || `Property ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={newJob.title}
                              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                              placeholder="e.g., House Wash - Front"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                            <input
                              type="datetime-local"
                              value={newJob.start || ''}
                              onChange={(e) => setNewJob({ ...newJob, start: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End (optional)</label>
                            <input
                              type="datetime-local"
                              value={newJob.end || ''}
                              onChange={(e) => setNewJob({ ...newJob, end: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={newJob.status}
                              onChange={(e) => setNewJob({ ...newJob, status: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                              value={newJob.notes || ''}
                              onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Special instructions, access details, etc."
                            />
                          </div>
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
                        </div>
                        <div className="mt-6 text-right flex gap-2 justify-end">
                          <button type="button" onClick={() => setShowJobForm(false)} className="px-6 py-2 text-gray-700 font-semibold rounded-lg border border-gray-300">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Save Job</button>
                        </div>
                      </form>
                    </div>
                  )}
                  
                  {/* Job status filter chips */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {JOB_STATUSES.map(s => {
                      const active = jobStatusFilter.includes(s);
                      return (
                        <button key={s} onClick={() => setJobStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{s}</button>
                      );
                    })}
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-xs text-gray-600">Assignee</label>
                      <select value={assigneeFilter} onChange={(e)=>setAssigneeFilter(e.target.value)} className="px-2 py-1 border border-gray-300 rounded-md text-xs">
                        <option value="">All</option>
                        <option value="unassigned">Unassigned</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {(jobStatusFilter.length>0 || assigneeFilter) && <button onClick={() => { setJobStatusFilter([]); setAssigneeFilter(''); }} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Clear</button>}
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
                                  {groups[k]
                                    .sort((a,b)=> new Date(a.start||0) - new Date(b.start||0))
                                    .map(job => (
                                  <li key={job.id} onClick={() => setSelectedJob(job)} className="list-row">
                                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="font-semibold text-blue-700">{job.title}</p>
                                          <p className="text-sm text-gray-600">{getClientNameById(job.clientId)}</p>
                                          {(job.assignees && job.assignees.length>0) && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {job.assignees.map(id => {
                                                const s = staff.find(x=>x.id===id);
                                                return <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{backgroundColor: (s?.color || '#E5E7EB'), color: '#111827'}}>{s?.name || 'Unknown'}</span>
                                              })}
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
                        )
                      })()
                    )}</div>
                  ) : scheduleView === 'calendar' ? (
                    <CalendarView jobs={filteredJobs} staff={staff} calendarDate={calendarDate} setCalendarDate={setCalendarDate} onJobSelect={setSelectedJob} scheduleRange={scheduleRange} />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeView === 'invoices' && (
            <div>
              {selectedInvoice ? (
                  <InvoiceDetailView
                    invoice={selectedInvoice}
                    client={getClientById(selectedInvoice.clientId)}
                    company={companySettings}
                    onBack={() => setSelectedInvoice(null)}
                    statusColors={statusColors}
                    onUpdateStatus={handleUpdateInvoiceStatus}
                    onUpdateFields={handleUpdateInvoiceFields}
                    onSend={handleSendInvoice}
                    onPrint={(inv) => setInvoiceToPrint(inv)}
                    onGeneratePaymentLink={handleGeneratePaymentLink}
                    onUploadAttachment={(invoice, file) => handleUploadInvoiceAttachment(invoice, file)}
                    onRemoveAttachment={(invoice, url) => handleRemoveInvoiceAttachment(invoice, url)}
                    onApplyInvoiceDefaults={handleApplyInvoiceDefaults}
                    onOpenClient={(clientId) => { const c = clients.find(c=>c.id===clientId); if (c) { setActiveView('clients'); setSelectedProperty(null); setSelectedClient(c); } }}
                    userRole={userProfile?.role}
                    defaultTaxRate={companySettings?.defaultGstRate}
                    stripeEnabled={stripeEnabled}
                  />
              ) : (
                <div>
                  <InvoicesList
                    invoices={invoices}
                    clients={clients}
                    onOpenInvoice={(inv)=> setSelectedInvoice(inv)}
                    onNewInvoice={() => startInvoiceCreate()}
                  />
                  <div className="hidden">
                  <div className="mb-6 flex justify-between items-center"><h2 className="text-2xl font-semibold text-gray-800 flex items-center"><InvoiceIcon /> Invoices</h2></div>
                  {/* Invoice status filter chips */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {['Unpaid','Sent','Paid'].map(s => {
                      const active = invoiceStatusFilter.includes(s);
                      return (
                        <button key={s} onClick={() => setInvoiceStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{s}</button>
                      );
                    })}
                    {invoiceStatusFilter.length>0 && <button onClick={() => setInvoiceStatusFilter([])} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Clear</button>}
                  </div>
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">{isLoading ? <div className="text-center p-10 text-gray-500">Loading...</div> : filteredInvoices.length === 0 ? <div className="text-center p-10 text-gray-500"><h3 className="text-lg font-medium">No invoices yet!</h3></div> : <ul className="divide-y divide-gray-200">{filteredInvoices.map(invoice => (
                    <li key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="list-row">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-blue-700">{invoice.invoiceNumber || 'Unnumbered'} • {getClientNameById(invoice.clientId)}</p>
                          <p className="text-sm text-gray-500 mt-1">Issued: {new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()} • Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</p>
                          <span className={`sm:hidden inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusColors[invoice.status]}`}>{invoice.status}</span>
                        </div>
                        <div className="flex items-center mt-4 sm:mt-0">
                          <div className="text-right mr-4">
                            <p className="text-lg font-semibold text-gray-800">${(invoice.total || 0).toFixed(2)}</p>
                            <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${statusColors[invoice.status]}`}>{invoice.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(invoice.status === 'Unpaid' || invoice.status === 'Sent') && (userProfile?.role === 'admin' || userProfile?.role === 'manager') && <button onClick={(e) => { e.stopPropagation(); handleUpdateInvoiceStatus(invoice.id, 'Paid'); }} className="btn btn-green">Mark Paid</button>}
                            <button onClick={(e) => { e.stopPropagation(); setInvoiceToPrint(invoice); }} className="btn btn-gray flex items-center"><PrinterIcon /> Print</button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}</ul>}</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeView === 'settings' && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Company Settings</h2>
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <p className="text-sm text-gray-500">You are logged in as</p>
                  <p className="font-semibold">{userProfile?.email}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize mt-2">
                    {userProfile?.role}
                  </span>
                </div>
                <form onSubmit={handleSaveSettings}>
                    {userProfile?.role === 'admin' && (
                      <>
                        {/* Logo Preview and Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                            <div className="flex items-center gap-6">
                                {companySettings.logoUrl ? (
                                    <img src={companySettings.logoUrl} alt="Company Logo" className="h-20 w-auto object-contain rounded-md border p-1" />
                                ) : (
                                    <div className="h-20 w-20 flex items-center justify-center bg-gray-100 text-gray-400 rounded-md border">
                                        <BriefcaseIcon className="h-8 w-8" />
                                    </div>
                                )}
                                <input 
                                  type="file" 
                                  accept="image/png, image/jpeg"
                                  onChange={(e) => setLogoFile(e.target.files[0])}
                                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>

                         {/* Other Settings */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" value={companySettings.name} onChange={e => setCompanySettings({...companySettings, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                             <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label><input type="email" value={companySettings.email} onChange={e => setCompanySettings({...companySettings, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                             <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label><input type="tel" value={companySettings.phone} onChange={e => setCompanySettings({...companySettings, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" value={companySettings.address} onChange={e => setCompanySettings({...companySettings, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Default GST (%)</label><input type="number" step="0.01" value={companySettings.defaultGstRate ?? 15} onChange={e => setCompanySettings({...companySettings, defaultGstRate: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select value={companySettings.currencyCode || 'NZD'} onChange={(e)=> setCompanySettings({...companySettings, currencyCode: e.target.value, currencySymbol: e.target.value === 'NZD' ? '$' : companySettings.currencySymbol})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                                  <option value="NZD">NZD — New Zealand Dollar</option>
                                  <option value="USD">USD — US Dollar</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                                <select value={companySettings.locale || 'en-NZ'} onChange={(e)=> setCompanySettings({...companySettings, locale: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
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
                           <select value={invoiceSettings.defaultTerm} onChange={(e)=>setInvoiceSettings({...invoiceSettings, defaultTerm: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                             <option>Due Today</option>
                             <option>Due on receipt</option>
                             <option>Net 7</option>
                             <option>Net 9</option>
                             <option>Net 14</option>
                             <option>Net 15</option>
                             <option>Net 30</option>
                             <option>Net 60</option>
                           </select>
                         </div>
                       </div>
                       <div className="mt-4 text-right">
                         <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Save Invoice Settings</button>
                       </div>
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
                           <h4 className="font-semibold mb-2">Invoice Email</h4>
                           <label className="block text-sm text-gray-700 mb-1">Subject</label>
                           <input type="text" value={emailTemplates.invoiceSubject} onChange={(e)=>setEmailTemplates({...emailTemplates, invoiceSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm mb-2"/>
                           <label className="block text-sm text-gray-700 mb-1">Body</label>
                           <textarea rows={6} value={emailTemplates.invoiceBody} onChange={(e)=>setEmailTemplates({...emailTemplates, invoiceBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                         </div>
                         <div>
                           <h4 className="font-semibold mb-2">Quote Email</h4>
                           <label className="block text-sm text-gray-700 mb-1">Subject</label>
                           <input type="text" value={emailTemplates.quoteSubject} onChange={(e)=>setEmailTemplates({...emailTemplates, quoteSubject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm mb-2"/>
                           <label className="block text-sm text-gray-700 mb-1">Body</label>
                           <textarea rows={6} value={emailTemplates.quoteBody} onChange={(e)=>setEmailTemplates({...emailTemplates, quoteBody: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                         </div>
                       </div>
                       <div className="mt-4 text-sm text-gray-500">
                         <p>Available placeholders: {'{{clientName}}'}, {'{{companyName}}'}, {'{{documentNumber}}'}, {'{{total}}'}</p>
                       </div>
                       <div className="mt-4 text-right">
                         <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Save Email Templates</button>
                       </div>
                     </form>
                   </div>
                 )}
                {/* Logout Button Section */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                    <button 
                      onClick={handleLogout}
                      className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700"
                    >
                      Logout
                    </button>
                </div>
                {/* Staff Management Section - Only visible to Admins */}
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
                          <div className="mt-4 text-right">
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Add Staff</button>
                          </div>
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
                                  <div>
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-xs text-gray-500">{s.email || '—'} • {s.role || 'tech'}</p>
                                  </div>
                                </div>
                                <button onClick={async () => { if (!window.confirm('Remove this staff member?')) return; await deleteDoc(doc(db, `users/${userId}/staff`, s.id)); }} className="text-red-600 hover:text-red-800 text-sm font-semibold">Remove</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quote Templates - Admin */}
                {userProfile?.role === 'admin' && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Quote Templates</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3">Create Item Template</h4>
                      <form onSubmit={handleAddTemplate}>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                          <input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g., Small House Wash" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                          <input type="number" step="0.01" value={newTemplate.price} onChange={e => setNewTemplate({...newTemplate, price: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="mt-4 text-right">
                          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold">Save Template</button>
                        </div>
                      </form>
                    </div>

                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-semibold mb-3">Existing Item Templates</h4>
                        {quoteTemplates.length === 0 ? (
                          <p className="text-sm text-gray-500">No templates yet.</p>
                        ) : (
                          <ul className="divide-y divide-gray-200">
                            {quoteTemplates.map(t => (
                              <li key={t.id} className="py-3 flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{t.name}</p>
                                  <p className="text-xs text-gray-500">Unit Price: ${parseFloat(t.price || 0).toFixed(2)}</p>
                                </div>
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

          {['requests','reports','expenses','timesheets','apps'].includes(activeView) && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2" style={{textTransform:'capitalize'}}>{activeView}</h2>
              <p className="text-gray-600">This page is a placeholder. We’ll build this module next.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}






  // Generate Client Portal link
  const handleGenerateClientPortalLink = async (client) => {
    if (!db || !userId) return;
    try {
      let token = client.publicPortalToken;
      if (!token) {
        token = `${userId}.${client.id}.${Math.random().toString(36).slice(2,10)}`;
        await updateDoc(doc(db, `users/${userId}/clients`, client.id), { publicPortalToken: token });
      }
      const link = `${window.location.origin}${window.location.pathname}?portalToken=${encodeURIComponent(token)}`;
      // Open portal in a new tab for convenience and also show copy prompt
      try { window.open(link, '_blank', 'noopener'); } catch (_) {}
      window.prompt('Copy portal link:', link);
    } catch (err) {
      console.error('Generate portal link error:', err);
      alert('Failed to generate portal link.');
    }
  };
