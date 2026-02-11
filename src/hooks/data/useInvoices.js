import { useFirestoreCollection } from './useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { initialInvoiceState } from '../../constants';

/**
 * Hook for managing invoices
 */
export function useInvoices() {
  const { userId } = useAuth();
  const { data, loading, error, add, update, remove } = useFirestoreCollection(userId, 'invoices');

  const addInvoice = async (invoiceData) => {
    return await add({
      ...initialInvoiceState,
      ...invoiceData,
      status: invoiceData.status || 'Draft',
      payments: invoiceData.payments || [],
    });
  };

  const updateInvoice = async (invoiceId, updates) => {
    return await update(invoiceId, updates);
  };

  const deleteInvoice = async (invoiceId) => {
    return await remove(invoiceId);
  };

  const getInvoiceById = (invoiceId) => {
    return data.find(invoice => invoice.id === invoiceId);
  };

  const getInvoicesByClient = (clientId) => {
    return data.filter(invoice => invoice.clientId === clientId);
  };

  const getInvoicesByStatus = (status) => {
    return data.filter(invoice => invoice.status === status);
  };

  const addPayment = async (invoiceId, payment) => {
    const invoice = getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payments = [...(invoice.payments || []), {
      ...payment,
      paidAt: payment.paidAt || new Date().toISOString(),
    }];

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const invoiceTotal = Number(invoice.total || 0);
    const newStatus = totalPaid >= invoiceTotal ? 'Paid' : 'Partially Paid';

    await updateInvoice(invoiceId, {
      payments,
      status: newStatus,
      paidAt: newStatus === 'Paid' ? new Date().toISOString() : invoice.paidAt,
    });
  };

  const markAsPaid = async (invoiceId, paymentDetails = {}) => {
    const invoice = getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    await addPayment(invoiceId, {
      amount: invoice.total,
      method: paymentDetails.method || 'Other',
      notes: paymentDetails.notes || '',
    });
  };

  const updateInvoiceStatus = async (invoiceId, status) => {
    return await updateInvoice(invoiceId, { status });
  };

  return {
    invoices: data,
    loading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesByClient,
    getInvoicesByStatus,
    addPayment,
    markAsPaid,
    updateInvoiceStatus,
  };
}
