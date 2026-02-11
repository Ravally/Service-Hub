// src/components/QuotePrintView.jsx
import React, { useEffect } from 'react';

const QuotePrintView = ({ quote, client, company, onBack, statusColors }) => {
  useEffect(() => { window.print(); }, []);
  const currency = (n) => `$${(parseFloat(n)||0).toFixed(2)}`;
  const view = quote.clientViewSettings || {};
  const showQuantities = view.showQuantities !== false;
  const showUnitPrices = view.showUnitPrices !== false;
  const showLineItemTotals = view.showLineItemTotals !== false;
  const showTotals = view.showTotals !== false;
  const columns = [
    { key: 'desc', label: 'Description', show: true, align: 'text-left' },
    { key: 'qty', label: 'Quantity', show: showQuantities, align: 'text-center' },
    { key: 'unit', label: 'Unit Price', show: showUnitPrices, align: 'text-right' },
    { key: 'total', label: 'Total', show: showLineItemTotals, align: 'text-right' },
  ];
  const visibleColumns = columns.filter(c => c.show);

  return (
    <div id="printable-invoice" className="bg-white p-8 md:p-12 font-sans text-gray-800">
      {company.logoUrl && (
        <div className="mb-8">
          <img src={company.logoUrl} alt="Company Logo" className="max-h-24 w-auto" />
        </div>
      )}

      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{company.name || 'Your Company'}</h1>
          <p className="text-sm">{company.address || '123 Business St, City'}</p>
          <p className="text-sm">{company.email || 'contact@yourcompany.com'}</p>
          <p className="text-sm">{company.phone || '(555) 555-5555'}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-400">Quote</h2>
          <p className="text-sm mt-1">{quote.quoteNumber || `#${quote.id.substring(0,8)}`}</p>
          <p className="text-sm">Date: {new Date(quote.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">Prepared For</h3>
        <p className="font-bold">{client?.name || 'Client'}</p>
        <p>{client?.address}</p>
        <p>{client?.email}</p>
      </div>

      <table className="w-full mb-6">
        <thead className="bg-gray-100">
          <tr>
            {visibleColumns.map(col => (
              <th key={col.key} className={`${col.align} font-semibold p-3`}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quote.lineItems.map((item, index) => {
            const itemType = item?.type || 'line_item';
            if (itemType === 'text') {
              return (
                <tr key={index} className="border-b">
                  <td className="p-3" colSpan={visibleColumns.length}>
                    {item.description || item.name || 'Text'}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={index} className="border-b">
                <td className="p-3">
                  {item.name || item.description}
                  {item.isOptional && <span className="text-xs text-gray-500"> (Optional)</span>}
                </td>
                {showQuantities && <td className="text-center p-3">{item.qty}</td>}
                {showUnitPrices && <td className="text-right p-3">{currency(item.price)}</td>}
                {showLineItemTotals && <td className="text-right p-3">{currency((item.qty || 0) * (item.price || 0))}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      {showTotals && (
        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-1">
            {typeof quote.taxAmount === 'number' && <div className="flex justify-between text-sm"><span>GST</span><span>{currency(quote.taxAmount)}</span></div>}
            <div className="flex justify-between text-xl font-bold border-t-2 pt-4">
              <span>Total</span>
              <span>{currency(quote.total)}</span>
            </div>
            <div className={`mt-4 text-center font-bold text-sm p-2 rounded-md ${statusColors[quote.status]}`}>
              {quote.status}
            </div>
          </div>
        </div>
      )}

      <div className="mt-24 text-center text-xs text-gray-500">
        <p>Thank you for the opportunity. We look forward to working with you.</p>
      </div>
      <button onClick={onBack} className="no-print absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700">
        Back to App
      </button>
    </div>
  );
};

export default QuotePrintView;
