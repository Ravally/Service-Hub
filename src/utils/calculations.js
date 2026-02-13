/**
 * Business calculation utilities for quotes, invoices, and jobs
 */

/**
 * Compute totals for a quote or invoice document
 * @param {Object} doc - Quote or invoice document
 * @returns {Object} Calculated totals
 */
export function computeTotals(doc) {
  const items = doc.lineItems || [];
  let subtotalBeforeDiscount = 0;
  let lineDiscountTotal = 0;

  items.forEach((it) => {
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

  const quoteDiscType = doc.quoteDiscountType || doc.discountType || 'amount';
  const quoteDiscValue = parseFloat(doc.quoteDiscountValue ?? doc.discountValue ?? 0);
  const discountedSubtotal = Math.max(0, subtotalBeforeDiscount - lineDiscountTotal);
  const quoteDiscAmt = quoteDiscType === 'percent'
    ? (discountedSubtotal * (quoteDiscValue / 100))
    : quoteDiscValue;
  const afterAllDiscounts = Math.max(0, discountedSubtotal - (Number.isFinite(quoteDiscAmt) ? quoteDiscAmt : 0));

  const taxRate = parseFloat(doc.taxRate || 0);
  const taxAmount = afterAllDiscounts * (taxRate / 100);
  const total = afterAllDiscounts + taxAmount;

  const originalTax = subtotalBeforeDiscount * (taxRate / 100);
  const originalTotal = subtotalBeforeDiscount + originalTax;
  const totalSavings = Math.max(0, originalTotal - total);

  return {
    subtotalBeforeDiscount,
    lineDiscountTotal,
    quoteDiscountAmount: Number.isFinite(quoteDiscAmt) ? quoteDiscAmt : 0,
    discountedSubtotal,
    afterAllDiscounts,
    taxAmount,
    total,
    originalTotal,
    totalSavings,
  };
}

/**
 * Compute total value from job line items (qty * price for billable items)
 * @param {Object} job - Job document with lineItems
 * @returns {number} Total value
 */
export function computeJobTotalValue(job) {
  const items = job?.lineItems || [];
  return items.reduce((sum, it) => {
    if (it?.type === 'text' || it?.isOptional) return sum;
    const qty = parseFloat(it.qty || 0);
    const price = parseFloat(it.price || 0);
    return sum + (qty * price);
  }, 0);
}

/**
 * Calculate job profitability
 * @param {Object} job - Job document
 * @returns {Object} Profitability metrics
 */
export function calculateJobProfitability(job) {
  const revenue = parseFloat(job.totalValue || 0) || computeJobTotalValue(job);
  const laborCost = Array.isArray(job.laborEntries)
    ? job.laborEntries.reduce((sum, entry) => {
        const cost = parseFloat(entry.cost || entry.amount || 0);
        return sum + (cost || (parseFloat(entry.hours || 0) * parseFloat(entry.rate || 0)));
      }, 0)
    : 0;

  const expensesCost = Array.isArray(job.expenses)
    ? job.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount || 0)), 0)
    : 0;

  const materialsCost = Array.isArray(job.lineItems)
    ? job.lineItems.reduce((sum, item) => {
        if (item.type === 'text' || item.isOptional) return sum;
        const qty = parseFloat(item.qty || 0);
        const unitCost = parseFloat(item.unitCost || 0);
        return sum + (qty * unitCost);
      }, 0)
    : 0;

  const totalCosts = laborCost + expensesCost + materialsCost;
  const profit = revenue - totalCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    laborCost,
    expensesCost,
    materialsCost,
    totalCosts,
    profit,
    margin,
  };
}

/**
 * Compute due date based on payment terms
 * @param {string} issueDate - ISO date string for issue date
 * @param {string} term - Payment term (e.g., 'Net 30', '14 calendar days')
 * @returns {string} ISO date string for due date
 */
export function computeDueDate(issueDate, term) {
  if (!issueDate) return '';
  const d = new Date(issueDate);

  const addDays = (days) => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() + days);
    return dd.toISOString();
  };

  const t = (term || '').toLowerCase();
  if (t === 'net 7' || t === '7 calendar days') return addDays(7);
  if (t === 'net 9') return addDays(9);
  if (t === 'net 14' || t === '14 calendar days') return addDays(14);
  if (t === 'net 15') return addDays(15);
  if (t === 'net 30' || t === '30 calendar days') return addDays(30);
  if (t === 'net 60') return addDays(60);
  if (t === 'net 90') return addDays(90);
  if (t === 'due on receipt') return d.toISOString();

  return d.toISOString();
}

/**
 * Calculate invoice balance
 * @param {Object} invoice - Invoice document
 * @returns {number} Outstanding balance
 */
export function calculateInvoiceBalance(invoice) {
  if (invoice.status === 'Paid') return 0;

  const total = parseFloat(invoice.total || 0);
  const paidSoFar = Array.isArray(invoice.payments)
    ? invoice.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : 0;

  return Math.max(0, total - paidSoFar);
}

/**
 * Compute the due date for installment N given frequency and start date.
 * @param {string} startDate - ISO string
 * @param {string} frequency - 'weekly' | 'bi-weekly' | 'monthly'
 * @param {number} index - 0-based installment index
 * @returns {string} ISO date string
 */
export function computeInstallmentDate(startDate, frequency, index) {
  const d = new Date(startDate);
  if (frequency === 'weekly') d.setDate(d.getDate() + index * 7);
  else if (frequency === 'bi-weekly') d.setDate(d.getDate() + index * 14);
  else d.setMonth(d.getMonth() + index);
  return d.toISOString();
}

/**
 * Build a payment plan schedule from plan parameters.
 * @param {number} planTotal - Total amount (float, dollar amount) to split
 * @param {number} installments - Number of installments (2-12)
 * @param {string} frequency - 'weekly' | 'bi-weekly' | 'monthly'
 * @param {string} startDate - ISO string of first installment due date
 * @returns {Array} Schedule array of installment objects
 */
export function buildPaymentSchedule(planTotal, installments, frequency, startDate) {
  if (!planTotal || !installments || installments < 2 || !startDate) return [];
  const baseAmount = Math.floor((planTotal / installments) * 100) / 100;
  const allocated = baseAmount * (installments - 1);
  const lastAmount = Math.round((planTotal - allocated) * 100) / 100;
  const schedule = [];
  for (let i = 0; i < installments; i++) {
    schedule.push({
      index: i,
      dueDate: computeInstallmentDate(startDate, frequency, i),
      amount: i === installments - 1 ? lastAmount : baseAmount,
      status: 'pending',
      paidAt: null,
      paidAmount: 0,
      paymentMethod: null,
    });
  }
  return schedule;
}

/**
 * Refresh overdue statuses on a payment plan schedule (pure, no mutation).
 * @param {Array} schedule - The current schedule array
 * @returns {Array} Updated schedule with overdue statuses
 */
export function refreshInstallmentStatuses(schedule) {
  if (!Array.isArray(schedule)) return [];
  const now = new Date();
  return schedule.map(inst =>
    inst.status === 'pending' && new Date(inst.dueDate) < now
      ? { ...inst, status: 'overdue' }
      : inst
  );
}
