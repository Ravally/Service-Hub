import { collection, addDoc, doc, updateDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { initialQuoteState, initialJobState, initialInvoiceSettings } from '../../constants';
import { padNumber, computeQuoteTotals, findClientProperty, buildPropertySnapshot, getClientNameById } from './handlerUtils';

/**
 * Creates all quote-related handler functions.
 *
 * @param {Object} deps - Dependencies object containing state, setters, and helpers.
 * @returns {Object} All quote handler functions.
 */
export function createQuoteHandlers(deps) {
  const {
    userId,
    clients,
    quotes,
    companySettings,
    setCompanySettings,
    newQuote,
    setNewQuote,
    newJob,
    setNewJob,
    selectedQuote,
    setSelectedQuote,
    setActiveView,
    setShowJobForm,
    setInvoiceCreateContext,
    setSelectedInvoice,
    setSelectedJob,
    publicQuoteContext,
    setPublicMessage,
    setPublicError,
    userProfile,
    logAudit,
    sendQuote,
    sendQuoteText,
  } = deps;

  // --- Quote Handlers ---

  const startNewQuote = (clientId = '') => {
    const clientViewDefaults = companySettings?.quoteClientViewSettings || initialQuoteState.clientViewSettings;
    const defaultProperty = findClientProperty(clients, clientId, '');
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
      const nextProperty = findClientProperty(clients, c?.id || '', '');
      const nextPropertyId = nextProperty?.uid || nextProperty?.id || '';
      setNewJob((j) => ({ ...j, clientId: c?.id || '', propertyId: nextPropertyId }));
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
    const prop = findClientProperty(clients, draft.clientId, draft.propertyId);
    const propertySnapshot = draft.propertySnapshot || buildPropertySnapshot(prop);
    return { ...draft, status: 'Draft', customFields, lineItems, clientViewSettings, propertySnapshot };
  };

  const createQuoteRecord = async (draft) => {
    if (!db || !userId) return null;
    const { subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total } = computeQuoteTotals(draft);
    const quoteBase = { ...draft, subtotalBeforeDiscount, lineDiscountTotal, quoteDiscountAmount, taxAmount, total, createdAt: new Date().toISOString() };
    const quotesCol = collection(db, `users/${userId}/quotes`);
    const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    let created = null;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(invSettingsRef);
      const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
      const seq = s.nextQu || 1;
      const prefix = s.prefixQu || 'QU';
      const padding = s.padding ?? 4;
      const quoteNumber = `${prefix}-${padNumber(seq, padding)}`;
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
    const jobNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(invSettingsRef);
      const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
      const seq = s.nextJob || 1;
      const prefix = s.prefixJob || 'JOB';
      const padding = s.padding ?? 4;
      const composed = `${prefix}-${padNumber(seq, padding)}`;
      tx.set(invSettingsRef, { nextJob: seq + 1 }, { merge: true });
      return composed;
    });
    const now = new Date().toISOString();
    const quoteProperty = findClientProperty(clients, quote.clientId, quote.propertyId);
    const fallbackTitle = quote.lineItems?.[0]?.name || quote.lineItems?.[0]?.description || `Job for ${getClientNameById(clients, quote.clientId)}`;
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
      await sendQuote(savedQuote);
      setSelectedQuote({ ...savedQuote, status: 'Awaiting Response', sentAt });
      return;
    }
    if (action === 'text') {
      const sentAt = savedQuote.sentAt || new Date().toISOString();
      await sendQuoteText(savedQuote);
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
    if (!db || !userId) return;
    if (!window.confirm('Approve this quote? You will be able to schedule a job next.')) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, `users/${userId}/quotes`, quoteId), { status: 'Approved', approvedAt: now });
    await logAudit('approve', 'quote', quoteId);
    if (selectedQuote?.id === quoteId) setSelectedQuote(prev => ({ ...prev, status: 'Approved', approvedAt: now }));
  };

  const handleScheduleFromQuote = (quote) => {
    const fallbackTitle = quote.lineItems?.[0]?.name || quote.lineItems?.[0]?.description || `Job for ${getClientNameById(clients, quote.clientId)}`;
    setNewJob({ ...initialJobState, clientId: quote.clientId, quoteId: quote.id, title: quote.title || fallbackTitle });
    setActiveView('schedule'); setShowJobForm(true);
  };

  const handleRevertQuoteToDraft = async (quoteId) => {
    if (!db || !userId) return;
    if (!window.confirm('Revert this quote to Draft? This will undo Sent status.')) return;
    await updateDoc(doc(db, `users/${userId}/quotes`, quoteId), { status: 'Draft' });
    await logAudit('revert', 'quote', quoteId, { to: 'Draft' });
    if (selectedQuote?.id === quoteId) setSelectedQuote(prev => ({ ...prev, status: 'Draft' }));
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
      const quoteNumber = `${prefix}-${padNumber(seq, padding)}`;
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
      token = `${userId}.${quote.id}.${Math.random().toString(36).slice(2, 10)}`;
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
        token = `${userId}.${quote.id}.${Math.random().toString(36).slice(2, 10)}`;
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
    const prop = findClientProperty(clients, nextClientId, nextPropertyId);
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

  return {
    startNewQuote,
    startQuoteForClient,
    startJobForClient,
    startInvoiceCreate,
    startInvoiceForClient,
    startInvoiceForJob,
    sanitizeQuoteDraft,
    createQuoteRecord,
    createJobFromQuote,
    handleSaveQuoteAction,
    handleAcceptQuote,
    handleScheduleFromQuote,
    handleRevertQuoteToDraft,
    handleMarkQuoteAwaiting,
    handleMarkQuoteApproved,
    handleArchiveQuote,
    handleCreateSimilarQuote,
    handlePreviewQuoteAsClient,
    handleCollectDeposit,
    handleCollectSignature,
    handleGenerateQuoteApprovalLink,
    handleUpdateQuote,
    handleDeleteQuote,
    handleArchiveQuotes,
    handleBulkDeleteQuotes,
    publicApprove,
    publicDecline,
  };
}
