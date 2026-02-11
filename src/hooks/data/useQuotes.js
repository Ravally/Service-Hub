import { useFirestoreCollection } from './useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { initialQuoteState } from '../../constants';

/**
 * Hook for managing quotes
 */
export function useQuotes() {
  const { userId } = useAuth();
  const { data, loading, error, add, update, remove } = useFirestoreCollection(userId, 'quotes');

  const addQuote = async (quoteData) => {
    return await add({
      ...initialQuoteState,
      ...quoteData,
      status: quoteData.status || 'Draft',
    });
  };

  const updateQuote = async (quoteId, updates) => {
    return await update(quoteId, updates);
  };

  const deleteQuote = async (quoteId) => {
    return await remove(quoteId);
  };

  const getQuoteById = (quoteId) => {
    return data.find(quote => quote.id === quoteId);
  };

  const getQuotesByClient = (clientId) => {
    return data.filter(quote => quote.clientId === clientId);
  };

  const getQuotesByStatus = (status) => {
    return data.filter(quote => quote.status === status);
  };

  const convertQuoteToJob = async (quoteId, jobData) => {
    await updateQuote(quoteId, { status: 'Converted', convertedAt: new Date().toISOString() });
    return jobData;
  };

  return {
    quotes: data,
    loading,
    error,
    addQuote,
    updateQuote,
    deleteQuote,
    getQuoteById,
    getQuotesByClient,
    getQuotesByStatus,
    convertQuoteToJob,
  };
}
