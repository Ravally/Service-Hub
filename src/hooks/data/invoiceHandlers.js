import { collection, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { initialInvoiceSettings } from '../../constants';
import { padNumber, computeInvoiceDueDate } from './handlerUtils';
import { buildPaymentSchedule } from '../../utils/calculations';

/**
 * Creates invoice-related handler functions.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.userId
 * @param {Object} deps.db
 * @param {Object} deps.storage
 * @param {Array} deps.quotes
 * @param {Object} deps.invoiceSettings
 * @param {Object} deps.companySettings
 * @param {Function} deps.setCompanySettings
 * @param {Object} deps.selectedInvoice
 * @param {Function} deps.setSelectedInvoice
 * @param {Function} deps.setActiveView
 * @param {Function} deps.setInvoiceCreateContext
 * @param {Function} deps.logAudit
 * @param {Function} deps.findClientProperty
 * @param {Function} deps.buildPropertySnapshot
 * @param {Function} deps.getClientById
 * @param {Function} deps.computeQuoteTotals
 * @param {Function} deps.computeInvoiceDueDate
 */
export function createInvoiceHandlers(deps) {
  const {
    userId,
    quotes,
    invoiceSettings,
    companySettings, setCompanySettings,
    selectedInvoice, setSelectedInvoice,
    setActiveView,
    setInvoiceCreateContext,
    logAudit,
    findClientProperty,
    buildPropertySnapshot,
    getClientById,
    computeQuoteTotals,
  } = deps;

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
      depositApplied: relatedQuote?.depositCollected
        ? (relatedQuote.depositAmount
          ? relatedQuote.depositAmount / 100
          : (relatedQuote.depositRequiredAmount || 0))
        : 0,
      taxRate: invTaxRate, quoteDiscountType: invDiscType, quoteDiscountValue: invDiscValue,
      subtotalBeforeDiscount: calc.subtotalBeforeDiscount, lineDiscountTotal: calc.lineDiscountTotal,
      quoteDiscountAmount: calc.quoteDiscountAmount, taxAmount: calc.taxAmount,
      originalTotal: calc.originalTotal, total: calc.total,
    };
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
      const issueDate = new Date().toISOString();
      const dueTerm = s.defaultTerm || 'Due Today';
      const dueDate = computeInvoiceDueDate(issueDate, dueTerm);
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

  const handleBulkMarkPaid = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const now = new Date().toISOString();
      await Promise.all(ids.map(id =>
        updateDoc(doc(db, `users/${userId}/invoices`, id), { status: 'Paid', paidAt: now })
      ));
    } catch (e) { console.error('Bulk mark paid error', e); }
  };

  const handleBulkArchiveInvoices = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const now = new Date().toISOString();
      await Promise.all(ids.map(id =>
        updateDoc(doc(db, `users/${userId}/invoices`, id), { status: 'Archived', archived: true, archivedAt: now })
      ));
    } catch (e) { console.error('Bulk archive invoices error', e); }
  };

  const handleBulkDeleteInvoices = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} invoice(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db, `users/${userId}/invoices`, id))));
    } catch (e) { console.error('Bulk delete invoices error', e); }
  };

  const handleSetupPaymentPlan = async (invoiceId, planConfig) => {
    if (!db || !userId || !invoiceId) return;
    try {
      const { installments, frequency, startDate, planTotal } = planConfig;
      const schedule = buildPaymentSchedule(planTotal, installments, frequency, startDate);
      const now = new Date().toISOString();
      const paymentPlan = {
        enabled: true, frequency, installments, startDate, planTotal, schedule,
        createdAt: now,
        nextPaymentDate: schedule.length > 0 ? schedule[0].dueDate : '',
      };
      await updateDoc(doc(db, `users/${userId}/invoices`, invoiceId), { paymentPlan });
      await logAudit('setup_payment_plan', 'invoice', invoiceId, { installments, frequency });
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(prev => ({ ...prev, paymentPlan }));
      }
    } catch (err) {
      console.error('Setup payment plan failed:', err);
      alert(`Failed to set up payment plan: ${err.message}`);
    }
  };

  const handleRecordInstallmentPayment = async (invoiceId, installmentIndex, paymentDetails) => {
    if (!db || !userId || !invoiceId) return;
    try {
      const invoice = selectedInvoice?.id === invoiceId ? selectedInvoice : null;
      if (!invoice?.paymentPlan) return;
      const plan = { ...invoice.paymentPlan };
      const schedule = [...plan.schedule];
      const inst = { ...schedule[installmentIndex] };
      const now = new Date().toISOString();
      const amount = paymentDetails.amount || inst.amount;

      inst.status = 'paid';
      inst.paidAt = now;
      inst.paidAmount = amount;
      inst.paymentMethod = paymentDetails.method || 'Recorded';
      schedule[installmentIndex] = inst;

      const nextPending = schedule
        .filter(s => s.status === 'pending' || s.status === 'overdue')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      plan.schedule = schedule;
      plan.nextPaymentDate = nextPending.length > 0 ? nextPending[0].dueDate : '';

      const payments = [...(invoice.payments || [])];
      payments.push({ amount, tip: 0, method: paymentDetails.method || 'Recorded', createdAt: now, installmentIndex });

      const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const newStatus = totalPaid >= Number(invoice.total || 0) ? 'Paid' : 'Partially Paid';
      const updateData = { paymentPlan: plan, payments, status: newStatus };
      if (newStatus === 'Paid') updateData.paidAt = now;

      await updateDoc(doc(db, `users/${userId}/invoices`, invoiceId), updateData);
      await logAudit('record_installment', 'invoice', invoiceId, { installmentIndex, amount });
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(prev => ({ ...prev, ...updateData }));
      }
    } catch (err) {
      console.error('Record installment payment failed:', err);
      alert(`Failed to record payment: ${err.message}`);
    }
  };

  const handleRemovePaymentPlan = async (invoiceId) => {
    if (!db || !userId || !invoiceId) return;
    try {
      const paymentPlan = {
        enabled: false, frequency: 'monthly', installments: 2,
        startDate: '', planTotal: 0, schedule: [], createdAt: '', nextPaymentDate: '',
      };
      await updateDoc(doc(db, `users/${userId}/invoices`, invoiceId), { paymentPlan });
      await logAudit('remove_payment_plan', 'invoice', invoiceId, {});
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(prev => ({ ...prev, paymentPlan }));
      }
    } catch (err) {
      console.error('Remove payment plan failed:', err);
      alert(`Failed to remove payment plan: ${err.message}`);
    }
  };

  return {
    handleCreateInvoiceFromJob,
    handleCreateInvoiceFromDraft,
    handleUpdateInvoiceStatus,
    handleUpdateInvoiceFields,
    handleUploadInvoiceAttachment,
    handleRemoveInvoiceAttachment,
    handleGeneratePaymentLink,
    handleApplyInvoiceDefaults,
    handleBulkMarkPaid,
    handleBulkArchiveInvoices,
    handleBulkDeleteInvoices,
    handleSetupPaymentPlan,
    handleRecordInstallmentPayment,
    handleRemovePaymentPlan,
  };
}
