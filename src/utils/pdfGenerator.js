import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';

/**
 * Generates a PDF for an invoice
 * @param {Object} invoice - Invoice data
 * @param {Object} client - Client data
 * @param {Object} company - Company settings
 * @returns {jsPDF} PDF document
 */
export function generateInvoicePDF(invoice, client, company) {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Company Logo (if available)
  if (company?.logoUrl) {
    try {
      // Note: For production, you'd want to load the image properly
      // This is a simplified version
      doc.addImage(company.logoUrl, 'PNG', margin, yPos, 40, 40);
      yPos += 45;
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }

  // Company Details (top right)
  doc.setFontSize(10);
  const companyLines = [
    company?.name || 'Company Name',
    company?.address || '',
    company?.phone || '',
    company?.email || '',
  ].filter(Boolean);

  companyLines.forEach((line, index) => {
    doc.text(line, pageWidth - margin, 20 + (index * 5), { align: 'right' });
  });

  // Invoice Title
  yPos = Math.max(yPos, 50);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', margin, yPos);

  // Invoice Number and Date
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, margin, yPos);
  yPos += 6;
  doc.text(`Issue Date: ${formatDate(invoice.issueDate || invoice.createdAt)}`, margin, yPos);
  yPos += 6;
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, margin, yPos);
  yPos += 6;
  doc.text(`Status: ${invoice.status || 'Draft'}`, margin, yPos);

  // Bill To Section
  yPos += 15;
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', margin, yPos);
  yPos += 6;
  doc.setFont(undefined, 'normal');

  const clientLines = [
    client?.name || 'Client Name',
    client?.email || '',
    client?.phone || '',
    client?.address || '',
  ].filter(Boolean);

  clientLines.forEach((line) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  // Line Items Table
  yPos += 10;

  const tableData = (invoice.lineItems || []).map(item => [
    item.description || '',
    item.qty || 0,
    formatCurrency(item.price || 0),
    formatCurrency((item.qty || 0) * (item.price || 0))
  ]);

  // Use autoTable plugin
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  // Get position after table
  yPos = doc.lastAutoTable.finalY + 10;

  // Totals Section (right-aligned)
  const totalsX = pageWidth - 70;

  // Subtotal
  doc.setFont(undefined, 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(invoice.subtotal || 0), totalsX + 40, yPos, { align: 'right' });
  yPos += 6;

  // Discount (if any)
  if (invoice.discount && invoice.discount > 0) {
    doc.text(`Discount (${invoice.discountType === 'percentage' ? invoice.discountValue + '%' : formatCurrency(invoice.discountValue)}):`, totalsX, yPos);
    doc.text('-' + formatCurrency(invoice.discount), totalsX + 40, yPos, { align: 'right' });
    yPos += 6;
  }

  // Tax
  if (invoice.tax && invoice.tax > 0) {
    doc.text(`Tax (${invoice.taxRate || 0}%):`, totalsX, yPos);
    doc.text(formatCurrency(invoice.tax), totalsX + 40, yPos, { align: 'right' });
    yPos += 6;
  }

  // Total
  yPos += 2;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX, yPos);
  doc.text(formatCurrency(invoice.total || 0), totalsX + 40, yPos, { align: 'right' });

  // Payments (if any)
  if (invoice.payments && invoice.payments.length > 0) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Payments:', totalsX, yPos);
    doc.setFont(undefined, 'normal');

    invoice.payments.forEach(payment => {
      yPos += 6;
      doc.text(`${formatDate(payment.createdAt)} - ${payment.method}:`, totalsX, yPos);
      doc.text('-' + formatCurrency(payment.amount + (payment.tip || 0)), totalsX + 40, yPos, { align: 'right' });
    });

    // Amount Due
    const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.amount || 0) + (p.tip || 0), 0);
    const amountDue = Math.max(0, (invoice.total || 0) - totalPaid);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Amount Due:', totalsX, yPos);
    doc.text(formatCurrency(amountDue), totalsX + 40, yPos, { align: 'right' });
  }

  // Notes (if any)
  if (invoice.notes) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Notes:', margin, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');

    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - (2 * margin));
    doc.text(splitNotes, margin, yPos);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

  return doc;
}

/**
 * Downloads an invoice PDF
 * @param {Object} invoice - Invoice data
 * @param {Object} client - Client data
 * @param {Object} company - Company settings
 */
export function downloadInvoicePDF(invoice, client, company) {
  const doc = generateInvoicePDF(invoice, client, company);
  const filename = `invoice_${invoice.invoiceNumber || invoice.id.substring(0, 8)}.pdf`;
  doc.save(filename);
}

/**
 * Opens invoice PDF in new tab
 * @param {Object} invoice - Invoice data
 * @param {Object} client - Client data
 * @param {Object} company - Company settings
 */
export function viewInvoicePDF(invoice, client, company) {
  const doc = generateInvoicePDF(invoice, client, company);
  doc.output('dataurlnewwindow');
}
