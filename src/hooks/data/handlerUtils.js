import { collection, addDoc, doc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { initialInvoiceSettings } from '../../constants';

/** Pad a number with leading zeros */
export const padNumber = (n, width = 4) => String(n).padStart(width, '0');

/** Find a client from the clients array */
export const getClientById = (clients, clientId) => clients.find(c => c.id === clientId);

/** Get client name by ID, with fallback */
export const getClientNameById = (clients, clientId) => clients.find(c => c.id === clientId)?.name || 'Unknown Client';

/** Format a date-time string for display */
export const formatDateTime = (isoString) =>
  isoString ? new Date(isoString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';

/** Find a client's property by ID or return primary/first */
export const findClientProperty = (clients, clientId, propertyId) => {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;
  const props = Array.isArray(client.properties) ? client.properties : [];
  if (propertyId) {
    return props.find((p, idx) => (p.uid || p.id || String(idx)) === propertyId) || null;
  }
  return props.find((p) => p.isPrimary) || props[0] || null;
};

/** Build a snapshot of a property for embedding in documents */
export const buildPropertySnapshot = (prop) => {
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

/** Compute quote/invoice totals from line items, discount, and tax */
export const computeQuoteTotals = (q) => {
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

/** Compute due date from issue date and payment term */
export const computeInvoiceDueDate = (iso, term) => {
  if (!iso) return '';
  const d = new Date(iso);
  const addDays = (days) => { const dd = new Date(d); dd.setDate(dd.getDate() + days); return dd.toISOString(); };
  const t = (term || '').toLowerCase();
  if (t === 'net 7' || t === '7 calendar days') return addDays(7);
  if (t === 'net 9') return addDays(9);
  if (t === 'net 14' || t === '14 calendar days') return addDays(14);
  if (t === 'net 15') return addDays(15);
  if (t === 'net 30' || t === '30 calendar days') return addDays(30);
  if (t === 'net 60') return addDays(60);
  return d.toISOString();
};

/** Render a template string by replacing {{key}} placeholders */
export const renderTemplate = (tpl, variables) =>
  (tpl || '').replace(/\{\{(.*?)\}\}/g, (_, key) => variables[key.trim()] ?? '');

/** Log an audit trail entry */
export const logAudit = async (userId, userProfile, action, targetType, targetId, details = {}) => {
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

/** Format money using company settings */
export const formatMoney = (companySettings, n) => {
  const amount = Number(n || 0);
  const locale = companySettings?.locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const currency = companySettings?.currencyCode;
  try {
    if (currency) return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch (e) { /* ignore and fall back */ }
  const symbol = companySettings?.currencySymbol || '$';
  return symbol + amount.toFixed(2);
};

/** Generate a sequential document number via Firestore transaction */
export const generateSequentialNumber = async (userId, settingsField, prefixField, defaultPrefix) => {
  const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(invSettingsRef);
    const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
    const seq = s[settingsField] || 1;
    const prefix = s[prefixField] || defaultPrefix;
    const padding = s.padding ?? 4;
    const number = `${prefix}-${padNumber(seq, padding)}`;
    tx.set(invSettingsRef, { [settingsField]: seq + 1 }, { merge: true });
    return number;
  });
};
