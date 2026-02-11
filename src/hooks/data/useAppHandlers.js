import { useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, setDoc, deleteDoc, getDoc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../../firebase/config';
import { initialQuoteState, initialJobState, initialInvoiceSettings, initialCompanySettings } from '../../constants';
import { generateQuoteSMSLink, generateInvoiceSMSLink, openSMSApp } from '../../utils';

/**
 * Hook that provides all CRUD/business logic handler functions.
 * Extracts ~1200 lines of handler code from the old App.jsx.
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
    setActiveView,
    setShowJobForm,
    setInvoiceToPrint, setQuoteToPrint,
    invoiceCreateContext, setInvoiceCreateContext,
    setClientBeingEdited, setAutoAddProperty,
    publicQuoteContext, setPublicMessage, setPublicError,
    notifications,
  } = appState;

  // --- Utility helpers ---
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

  // --- Audit Log helper ---
  const logAudit = async (action, targetType, targetId, details = {}) => {
    try {
      if (!db || !userId) return;
      await addDoc(collection(db, `users/${userId}/auditLogs`), {
        action, targetType, targetId,
        actorId: userId,
        actorEmail: userProfile?.email || null,
        details,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Audit log skipped:', err?.message || err);
    }
  };

  // --- Property helpers ---
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

  // --- Calculation helpers ---
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
      subtotalBeforeDiscount, lineDiscountTotal,
      quoteDiscountAmount: Number.isFinite(quoteDiscAmt) ? quoteDiscAmt : 0,
      taxAmount, total, originalTotal, totalSavings,
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

  const renderTemplate = (tpl, variables) =>
    (tpl || '').replace(/\{\{(.*?)\}\}/g, (_, key) => variables[key.trim()] ?? '');

  // --- Dashboard stats ---
  const dashboardStats = useMemo(() => {
    const activeJobs = jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress');
    const unscheduledJobs = jobs.filter(job => job.status === 'Unscheduled');
    const outstandingInvoices = invoices.filter(invoice => (invoice.status === 'Unpaid' || invoice.status === 'Sent') && !invoice.isCreditNote);
    const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const revenueThisMonth = invoices.filter(inv => inv.status === 'Paid' && inv.paidAt).reduce((sum, inv) => sum + (inv.total || 0), 0);
    return {
      activeJobsCount: activeJobs.length,
      requiresSchedulingCount: unscheduledJobs.length,
      outstandingAmount,
      revenueThisMonth,
      upcomingJobs: activeJobs.slice(0, 5),
      jobsRequiringScheduling: unscheduledJobs.slice(0, 5),
      invoicesAwaitingPayment: outstandingInvoices.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 5),
    };
  }, [jobs, invoices]);

  // --- Filtered data ---
  const filteredClients = useMemo(() => {
    const clientSearchTerm = appState.clientSearchTerm;
    const clientTagFilter = appState.clientTagFilter;
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
  }, [clients, appState.clientSearchTerm, appState.clientTagFilter]);

  const filteredQuotes = useMemo(() => {
    if (!appState.quoteStatusFilter || appState.quoteStatusFilter.length === 0) return quotes;
    return quotes.filter(q => appState.quoteStatusFilter.includes(q.status));
  }, [quotes, appState.quoteStatusFilter]);

  const filteredJobs = useMemo(() => {
    let base = jobs;
    if (appState.jobStatusFilter && appState.jobStatusFilter.length > 0) {
      base = base.filter(j => appState.jobStatusFilter.includes(j.status));
    }
    if (appState.assigneeFilter) {
      if (appState.assigneeFilter === 'unassigned') {
        base = base.filter(j => !j.assignees || j.assignees.length === 0);
      } else {
        base = base.filter(j => (j.assignees || []).includes(appState.assigneeFilter));
      }
    }
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
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
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  // --- Client Handlers ---
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
      phones, emails,
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

  const handleAddClientNote = async (clientId, noteText) => {
    if (!db || !userId || !noteText.trim()) return;
    await addDoc(collection(db, `users/${userId}/clients/${clientId}/notes`), {
      text: noteText,
      createdAt: new Date().toISOString(),
    });
  };

  const handleGenerateClientPortalLink = async (client) => {
    if (!db || !userId) return;
    try {
      let token = client.publicPortalToken;
      const now = new Date().toISOString();
      if (!token) {
        token = `${userId}.${client.id}.${Math.random().toString(36).slice(2,10)}`;
        await updateDoc(doc(db, `users/${userId}/clients`, client.id), {
          publicPortalToken: token,
          portalTokenCreatedAt: now,
        });
      }
      const link = `${window.location.origin}/?portalToken=${encodeURIComponent(token)}`;
      try { window.open(link, '_blank', 'noopener'); } catch (_) {}
      window.prompt('Copy portal link:', link);
    } catch (err) {
      console.error('Generate portal link error:', err);
      alert('Failed to generate portal link.');
    }
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
      const link = `${window.location.origin}/?portalToken=${encodeURIComponent(token)}`;
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

  // --- Quote Handlers ---
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

  const startQuoteForClient = (c) => {
    try { setActiveView('quotes'); startNewQuote(c?.id || ''); } catch {}
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
    return { ...draft, status: 'Draft', customFields, lineItems, clientViewSettings, propertySnapshot };
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
      jobNumber, createdAt: now,
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
      if (job) { setActiveView('jobs'); setSelectedJob(job); }
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
      status: 'Approved', approvalStatus: 'approved', approvedAt: now,
      approvedByName: (signerName || '').trim() || 'Approved',
    });
    await logAudit('approve', 'quote', quote.id);
    if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Approved', approvedAt: now }));
  };

  const handleArchiveQuote = async (quote) => {
    if (!db || !userId || !quote?.id) return;
    if (quote.status === 'Draft') { alert('Draft quotes must be marked as Awaiting Response before archiving.'); return; }
    if (quote.status !== 'Awaiting Response' && quote.status !== 'Sent') { alert('Move the quote to Awaiting Response before archiving.'); return; }
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
    delete clone.id; delete clone.quoteNumber; delete clone.createdAt; delete clone.updatedAt;
    delete clone.publicApprovalToken; delete clone.approvalStatus; delete clone.approvedAt;
    delete clone.approvedByName; delete clone.archived; delete clone.archivedAt;
    delete clone._status; delete clone._clientName; delete clone._address;
    const { subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total } = computeQuoteTotals(clone);
    const quoteBase = { ...clone, status: 'Draft', createdAt: new Date().toISOString(), subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total };
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
    const now = new Date().toISOString();
    if (!token) {
      token = `${userId}.${quote.id}.${Math.random().toString(36).slice(2,10)}`;
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
        publicApprovalToken: token,
        tokenCreatedAt: now,
      });
    }
    const link = `${window.location.origin}/?quoteToken=${encodeURIComponent(token)}`;
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

  const handleGenerateQuoteApprovalLink = async (quote) => {
    if (!db || !userId) return;
    try {
      let token = quote.publicApprovalToken;
      const now = new Date().toISOString();
      if (!token) {
        token = `${userId}.${quote.id}.${Math.random().toString(36).slice(2,10)}`;
        await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
          publicApprovalToken: token,
          tokenCreatedAt: now,
        });
      }
      const link = `${window.location.origin}/?quoteToken=${encodeURIComponent(token)}`;
      window.prompt('Copy approval link:', link);
    } catch (err) {
      console.error('Generate approval link error:', err);
      alert('Failed to generate approval link.');
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
      try { await deleteDoc(doc(db, `users/${userId}/quotes`, quoteId)); } catch (error) { console.error("Error deleting quote:", error); }
    }
  };

  const handleArchiveQuotes = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const eligible = ids.filter(id => {
        const q = quotes.find(x => x.id === id);
        return q && (q.status === 'Awaiting Response' || q.status === 'Sent');
      });
      if (eligible.length !== ids.length) { alert('Only quotes in Awaiting Response can be archived.'); }
      await Promise.all(eligible.map(id => updateDoc(doc(db, `users/${userId}/quotes`, id), { status: 'Archived', archived: true, archivedAt: new Date().toISOString() })));
    } catch (e) { console.error('Bulk archive quotes error', e); }
  };

  const handleBulkDeleteQuotes = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} quote(s)? This cannot be undone.`)) return;
    try { await Promise.all(ids.map(id => deleteDoc(doc(db, `users/${userId}/quotes`, id)))); } catch (e) { console.error('Bulk delete quotes error', e); }
  };

  // --- Public quote approve/decline ---
  const publicApprove = async (signerName) => {
    try {
      const ctx = publicQuoteContext; if (!ctx) return;
      const now = new Date().toISOString();
      await updateDoc(doc(db, `users/${ctx.uid}/quotes`, ctx.quote.id), {
        status: 'Approved', approvalStatus: 'approved', approvedAt: now,
        approvedByName: (signerName || '').trim() || 'Client',
      });
      setPublicMessage('Quote approved! Thank you for your business. We will be in touch shortly to schedule your service.');
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
        status: 'Changes Requested', approvalStatus: 'declined', declinedAt: now,
        declinedByName: (signerName || '').trim() || 'Client',
      });
      setPublicMessage('Quote declined.');
    } catch (err) {
      console.error('Public decline error:', err);
      setPublicError('Unable to decline quote.');
    }
  };

  // --- Job Handlers ---
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
      await updateDoc(doc(db, `users/${userId}/quotes`, newJob.quoteId), { status: 'Converted', convertedAt: new Date().toISOString() });
    }
    setNewJob(initialJobState); setShowJobForm(false);
  };

  const handleUpdateJobStatus = async (job, newStatus) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { status: newStatus });
    await logAudit('status_change', 'job', job.id, { from: job.status, to: newStatus });
    if (newStatus === 'Completed') handleCreateInvoiceFromJob(job);
  };

  const handleUpdateJobDetails = async (jobId, details) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/jobs`, jobId), details);
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

  const toggleNewJobAssignee = (staffId) => {
    setNewJob(j => {
      const ids = new Set(j.assignees || []);
      if (ids.has(staffId)) ids.delete(staffId); else ids.add(staffId);
      return { ...j, assignees: Array.from(ids) };
    });
  };

  // --- Invoice Handlers ---
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
      clientId: job.clientId, jobId: job.id, status: 'Draft', createdAt: new Date().toISOString(),
      subject: job.title || relatedQuote?.title || 'For services rendered',
      lineItems: normalizedLineItems,
      billingAddress: client?.address || '', serviceAddress,
      contactPhone: client?.phone || '', contactEmail: client?.email || '',
      customFields: Array.isArray(relatedQuote?.customFields) ? relatedQuote.customFields : [],
      clientMessage: companySettings?.invoiceMessage || '',
      contractTerms: companySettings?.invoiceContractTerms || '',
      disclaimers: companySettings?.invoiceDisclaimers || '',
      clientViewSettings: companySettings?.invoiceClientViewSettings || {
        showQuantities: true, showUnitCosts: true, showLineItemTotals: true, showTotals: true, showAccountBalance: true, showLateStamp: false,
      },
      paymentSettings: companySettings?.invoicePaymentSettings || {
        acceptCard: true, acceptBank: false, allowPartialPayments: true,
      },
      askForReview: !!(client?.commPrefs && client.commPrefs.askForReview),
      depositApplied: 0,
      taxRate: invTaxRate, quoteDiscountType: invDiscType, quoteDiscountValue: invDiscValue,
      subtotalBeforeDiscount: calc.subtotalBeforeDiscount, lineDiscountTotal: calc.lineDiscountTotal,
      quoteDiscountAmount: calc.quoteDiscountAmount, taxAmount: calc.taxAmount,
      originalTotal: calc.originalTotal, total: calc.total,
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
      ...item, qty: Number(item.qty || 0), price: Number(item.price || 0), unitCost: Number(item.unitCost || 0),
    })) : [];
    const issueDate = draft.issueDate || new Date().toISOString();
    const dueTerm = draft.dueTerm || invoiceSettings.defaultTerm || 'Due Today';
    const dueDate = computeInvoiceDueDate(issueDate, dueTerm);
    const taxRate = (typeof draft.taxRate === 'number') ? draft.taxRate : (companySettings?.defaultGstRate ?? 0);
    const discType = draft.quoteDiscountType || draft.discountType || 'amount';
    const discValue = parseFloat(draft.quoteDiscountValue ?? draft.discountValue ?? 0);
    const calc = computeQuoteTotals({ lineItems: normalizedItems, taxRate, quoteDiscountType: discType, quoteDiscountValue: discValue });
    const invoiceData = {
      ...draft, lineItems: normalizedItems, status: draft.status || 'Draft',
      createdAt: draft.createdAt || new Date().toISOString(), issueDate, dueTerm, dueDate, taxRate,
      quoteDiscountType: discType, quoteDiscountValue: discValue,
      subtotalBeforeDiscount: calc.subtotalBeforeDiscount, lineDiscountTotal: calc.lineDiscountTotal,
      quoteDiscountAmount: calc.quoteDiscountAmount, taxAmount: calc.taxAmount,
      originalTotal: calc.originalTotal, total: calc.total,
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

  const handleGeneratePaymentLink = async (invoice) => {
    if (!db || !userId) return;
    try {
      const invoiceRef = doc(db, `users/${userId}/invoices`, invoice.id);
      if (invoice.paymentLink) { window.prompt('Payment link (copy):', invoice.paymentLink); return; }
      const base = import.meta.env?.VITE_FUNCTIONS_BASE_URL;
      if (base) {
        const payload = { uid: userId, invoiceId: invoice.id, successUrl: window.location.origin + window.location.pathname + `?paid=1`, cancelUrl: window.location.href };
        const res = await fetch(`${base.replace(/\/$/, '')}/api/createCheckoutSession`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to create checkout session');
        const data = await res.json();
        const url = data.url;
        await updateDoc(invoiceRef, { paymentLink: url });
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(prev => ({ ...prev, paymentLink: url }));
        window.prompt('Payment link created (copy):', url);
      } else {
        alert('Stripe not configured yet. The Client Portal will show a test Pay Now button. To create real payment links, set VITE_FUNCTIONS_BASE_URL and deploy functions.');
      }
    } catch (err) {
      console.error('Payment link error:', err);
      alert('Failed to generate payment link.');
    }
  };

  const handleApplyInvoiceDefaults = async (updates = {}) => {
    if (!db || !userId) return;
    const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
    const next = { ...companySettings, ...updates };
    await setDoc(settingsDocRef, next, { merge: true });
    setCompanySettings(next);
  };

  // --- Email/Notification Handlers ---
  const handleSendInvoice = async (invoice) => {
    if (!db || !userId) return;
    try {
      const client = getClientById(invoice.clientId);
      if (!client?.email) {
        alert('Client has no email address. Please add an email to the client profile.');
        return;
      }

      // Call the Cloud Function
      const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
      const result = await sendInvoiceEmail({ uid: userId, invoiceId: invoice.id });

      // Create notification
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Sent invoice ${invoice.invoiceNumber || invoice.id.substring(0,8)} to ${client.email}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Log audit
      await logAudit('send', 'invoice', invoice.id);

      alert(`Invoice email sent successfully to ${client.email}!`);

      // Update local state if this is the selected invoice
      if (selectedInvoice?.id === invoice.id) {
        const updatedSnap = await getDoc(doc(db, `users/${userId}/invoices`, invoice.id));
        if (updatedSnap.exists()) {
          setSelectedInvoice({ id: updatedSnap.id, ...updatedSnap.data() });
        }
      }
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      alert(`Failed to send invoice email: ${error.message}`);
    }
  };

  const handleSendQuote = async (quote) => {
    if (!db || !userId) return;
    try {
      const client = getClientById(quote.clientId);
      if (!client?.email) {
        alert('Client has no email address. Please add an email to the client profile.');
        return;
      }

      // Generate quote approval link
      const token = `${userId}.${quote.id}.${Math.random().toString(36).substring(2, 15)}`;
      const approvalLink = `${window.location.origin}/?quoteToken=${token}`;

      // Update quote with token and approval link before sending
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
        token,
        approvalLink,
        tokenCreatedAt: new Date().toISOString()
      });

      // Call the Cloud Function
      const sendQuoteEmail = httpsCallable(functions, 'sendQuoteEmail');
      const result = await sendQuoteEmail({ uid: userId, quoteId: quote.id });

      // Create notification
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Sent quote ${quote.quoteNumber || quote.id.substring(0,8)} to ${client.email}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Log audit
      await logAudit('send', 'quote', quote.id);

      alert(`Quote email sent successfully to ${client.email}!`);

      // Update local state if this is the selected quote
      if (selectedQuote?.id === quote.id) {
        const updatedSnap = await getDoc(doc(db, `users/${userId}/quotes`, quote.id));
        if (updatedSnap.exists()) {
          setSelectedQuote({ id: updatedSnap.id, ...updatedSnap.data() });
        }
      }
    } catch (error) {
      console.error('Failed to send quote email:', error);
      alert(`Failed to send quote email: ${error.message}`);
    }
  };

  const handleSendQuoteText = async (quote) => {
    if (!db || !userId || !quote) return;
    try {
      const client = getClientById(quote.clientId);
      if (!client?.phone) {
        alert('Client has no phone number. Please add a phone number to the client profile.');
        return;
      }

      // Generate quote approval link (similar to email)
      const token = `${userId}.${quote.id}.${Math.random().toString(36).substring(2, 15)}`;
      const approvalLink = `${window.location.origin}/?quoteToken=${token}`;

      // Update quote with token and approval link
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
        token,
        approvalLink,
        tokenCreatedAt: new Date().toISOString()
      });

      // Update status to Awaiting Response
      const sentAt = quote.sentAt || new Date().toISOString();
      if (quote.status === 'Draft' || quote.status === 'Awaiting Response' || quote.status === 'Sent') {
        await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { status: 'Awaiting Response', sentAt });
        if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Awaiting Response', sentAt, token, approvalLink }));
      }

      // Generate and open SMS link
      const smsLink = generateQuoteSMSLink(client.phone, { ...quote, token, approvalLink }, companySettings);

      // Log audit
      await logAudit('send', 'quote', quote.id, { channel: 'text' });

      // Create notification
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Opened SMS to send quote ${quote.quoteNumber || quote.id.substring(0,8)} to ${client.phone}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Open SMS app
      window.location.href = smsLink;
    } catch (error) {
      console.error('Failed to prepare quote SMS:', error);
      alert(`Failed to prepare quote SMS: ${error.message}`);
    }
  };

  const handleMarkNotificationAsRead = async (id) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/notifications`, id), { read: true });
  };

  // --- Settings Handlers ---
  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!newInvite.email) return alert("Please enter an email address to invite.");
    try {
      await addDoc(collection(db, 'invites'), { email: newInvite.email.toLowerCase(), role: newInvite.role, invitedBy: userProfile.email, createdAt: new Date().toISOString() });
      alert(`Invitation sent to ${newInvite.email}!`);
      setNewInvite({ email: '', role: 'member' });
    } catch (error) { console.error("Error sending invitation: ", error); alert("Failed to send invitation."); }
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

  const handleSaveInvoiceSettings = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    const settingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    await setDoc(settingsRef, invoiceSettings, { merge: true });
    alert('Invoice settings saved');
  };

  const handleSaveEmailTemplates = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    const settingsRef = doc(db, `users/${userId}/settings/emailTemplates`);
    await setDoc(settingsRef, emailTemplates, { merge: true });
    alert('Email templates saved');
  };

  return {
    // Utilities
    getClientNameById, getClientById, formatDateTime,
    unreadNotificationsCount, statusColors, stripeEnabled, formatMoney,
    findClientProperty, buildPropertySnapshot,
    computeQuoteTotals, computeInvoiceDueDate,
    dashboardStats,
    filteredClients, filteredQuotes, filteredJobs, filteredInvoices,

    // Auth
    handleLogout,

    // Client handlers
    handleCreateClientPage, handleUpdateClient, handleUpdateProperty, handleDeleteClient,
    handleAddClientNote, handleGenerateClientPortalLink,
    handleCollectPaymentForClient, viewAsClient, downloadVCardForClient,
    archiveClient, startNewPropertyForClient,

    // Quote handlers
    startNewQuote, startQuoteForClient, startJobForClient,
    startInvoiceCreate, startInvoiceForClient, startInvoiceForJob,
    handleSaveQuoteAction, handleAcceptQuote, handleScheduleFromQuote,
    handleRevertQuoteToDraft, handleMarkQuoteAwaiting, handleMarkQuoteApproved,
    handleArchiveQuote, handleCreateSimilarQuote, handlePreviewQuoteAsClient,
    handleCollectDeposit, handleCollectSignature, handleGenerateQuoteApprovalLink,
    handleUpdateQuote, handleDeleteQuote, handleArchiveQuotes, handleBulkDeleteQuotes,
    publicApprove, publicDecline,

    // Job handlers
    handleAddJob, handleUpdateJobStatus, handleUpdateJobDetails,
    handleUploadJobAttachment, handleRemoveJobAttachment, toggleNewJobAssignee,

    // Invoice handlers
    handleCreateInvoiceFromJob, handleCreateInvoiceFromDraft,
    handleUpdateInvoiceStatus, handleUpdateInvoiceFields,
    handleUploadInvoiceAttachment, handleRemoveInvoiceAttachment,
    handleGeneratePaymentLink, handleApplyInvoiceDefaults,

    // Email/Notification
    handleSendInvoice, handleSendQuote, handleSendQuoteText,
    handleMarkNotificationAsRead,

    // Settings
    handleInviteUser, handleAddTemplate, handleDeleteTemplate,
    handleSaveSettings, handleSaveInvoiceSettings, handleSaveEmailTemplates,
  };
}
