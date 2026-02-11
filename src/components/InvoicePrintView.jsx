// src/components/InvoicePrintView.jsx
import React, { useEffect } from 'react';

const currency = (value, code) => {
  const num = Number(value || 0);
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: code || 'USD' }).format(num); }
  catch { return `$${num.toFixed(2)}`; }
};

const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString() : '-';

const computeTotals = (doc) => {
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
  const quoteDiscAmt = quoteDiscType === 'percent' ? (discountedSubtotal * (quoteDiscValue / 100)) : quoteDiscValue;
  const afterAllDiscounts = Math.max(0, discountedSubtotal - (Number.isFinite(quoteDiscAmt) ? quoteDiscAmt : 0));
  const taxRate = parseFloat(doc.taxRate || 0);
  const taxAmount = afterAllDiscounts * (taxRate / 100);
  const total = afterAllDiscounts + taxAmount;
  return { subtotalBeforeDiscount, taxAmount, total, taxRate };
};

const InvoicePrintView = ({ invoice, client, company, onBack, statusColors }) => {
  useEffect(() => {
    window.print();
  }, []);

  const view = invoice.clientViewSettings || company?.invoiceClientViewSettings || {
    showQuantities: true,
    showUnitCosts: true,
    showLineItemTotals: true,
    showTotals: true,
    showAccountBalance: true,
    showLateStamp: false,
  };

  const showQty = view.showQuantities !== false;
  const showUnit = view.showUnitCosts !== false;
  const showLineTotals = view.showLineItemTotals !== false;
  const showTotals = view.showTotals !== false;
  const currencyCode = company?.currencyCode || 'USD';
  const isOverdue = invoice.status !== 'Paid' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
  const totals = Number.isFinite(invoice.total) ? {
    subtotalBeforeDiscount: invoice.subtotalBeforeDiscount || 0,
    taxAmount: invoice.taxAmount || 0,
    total: invoice.total || 0,
    taxRate: invoice.taxRate || 0,
  } : computeTotals(invoice);
  const accountBalance = Number.isFinite(invoice.accountBalance)
    ? invoice.accountBalance
    : (Number.isFinite(client?.accountBalance) ? client.accountBalance : null);

  return (
    <div id="printable-invoice" className="bg-white p-8 md:p-12 font-sans text-gray-800">
      {company?.logoUrl && (
        <div className="mb-8">
          <img src={company.logoUrl} alt="Company Logo" className="max-h-24 w-auto" />
        </div>
      )}

      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{company?.name || 'Your Company'}</h1>
          <p className="text-sm">{company?.address || '123 Business St, City'}</p>
          <p className="text-sm">{company?.email || 'contact@yourcompany.com'}</p>
          <p className="text-sm">{company?.phone || '(555) 555-5555'}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-400">Invoice</h2>
          <p className="text-sm mt-1"># {invoice.invoiceNumber || invoice.id.substring(0, 8)}</p>
          <p className="text-sm">Issued: {formatDate(invoice.issueDate || invoice.createdAt)}</p>
          <p className="text-sm">Due: {formatDate(invoice.dueDate)}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">Bill To</h3>
        <p className="font-bold">{client?.name || 'Client'}</p>
        <p>{invoice.billingAddress || client?.address || '-'}</p>
        <p>{invoice.contactEmail || client?.email || '-'}</p>
      </div>

      {invoice.serviceAddress && invoice.serviceAddress !== invoice.billingAddress && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">Service Address</h3>
          <p>{invoice.serviceAddress}</p>
        </div>
      )}

      {invoice.subject && (
        <div className="mb-6 text-sm text-gray-700">
          <span className="font-semibold">Subject:</span> {invoice.subject}
        </div>
      )}

      {view.showLateStamp && isOverdue && (
        <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          Late
        </div>
      )}

      <table className="w-full mb-10">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left font-semibold p-3">Product / Service</th>
            {showQty && <th className="text-center font-semibold p-3">Qty.</th>}
            {showUnit && <th className="text-right font-semibold p-3">Unit Price</th>}
            {showLineTotals && <th className="text-right font-semibold p-3">Total</th>}
          </tr>
        </thead>
        <tbody>
          {(invoice.lineItems || []).map((item, index) => {
            const itemType = item?.type || 'line_item';
            if (itemType === 'text') {
              return (
                <tr key={`text-${index}`} className="border-b">
                  <td className="p-3" colSpan={1 + (showQty ? 1 : 0) + (showUnit ? 1 : 0) + (showLineTotals ? 1 : 0)}>
                    {item.description}
                  </td>
                </tr>
              );
            }
            const lineTotal = (Number(item.qty || 0) * Number(item.price || 0));
            return (
              <tr key={`item-${index}`} className="border-b">
                <td className="p-3">
                  {item.serviceDate && <div className="text-xs text-gray-500 mb-1">{formatDate(item.serviceDate)}</div>}
                  <div className="font-semibold">{item.name || item.description}</div>
                  {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
                  {item.isOptional && <div className="text-xs text-amber-600">Optional</div>}
                </td>
                {showQty && <td className="text-center p-3">{item.qty}</td>}
                {showUnit && <td className="text-right p-3">{currency(item.price || 0, currencyCode)}</td>}
                {showLineTotals && <td className="text-right p-3">{currency(lineTotal, currencyCode)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      {showTotals && (
        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{currency(totals.subtotalBeforeDiscount, currencyCode)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax ({totals.taxRate}%)</span><span>{currency(totals.taxAmount, currencyCode)}</span></div>
            {view.showAccountBalance && accountBalance !== null && (
              <div className="flex justify-between text-sm"><span>Account balance</span><span>{currency(accountBalance, currencyCode)}</span></div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t-2 pt-2"><span>Total</span><span>{currency(totals.total, currencyCode)}</span></div>
          </div>
        </div>
      )}

      {(invoice.contractTerms || invoice.disclaimers) && (
        <div className="mt-10 text-xs text-gray-500 space-y-2">
          {invoice.contractTerms && <div>{invoice.contractTerms}</div>}
          {invoice.disclaimers && <div>{invoice.disclaimers}</div>}
        </div>
      )}

      <div className="mt-10 text-center text-xs text-gray-500">
        <p>Thank you for your business.</p>
      </div>

      <button onClick={onBack} className="no-print absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700">
        Back to App
      </button>
    </div>
  );
};

export default InvoicePrintView;
