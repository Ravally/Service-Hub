import { useFirestoreCollection } from './useFirestore';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Hook for managing clients
 */
export function useClients() {
  const { userId } = useAuth();
  const { data, loading, error, add, update, remove } = useFirestoreCollection(userId, 'clients');

  const addClient = async (clientData) => {
    return await add({
      ...clientData,
      status: clientData.status || 'Active',
      tags: clientData.tags || [],
      properties: clientData.properties || [],
      contacts: clientData.contacts || [],
      customFields: clientData.customFields || [],
    });
  };

  const updateClient = async (clientId, updates) => {
    return await update(clientId, updates);
  };

  const deleteClient = async (clientId) => {
    return await remove(clientId);
  };

  const getClientById = (clientId) => {
    return data.find(client => client.id === clientId);
  };

  const searchClients = (searchTerm) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(client =>
      client.name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.includes(term) ||
      client.address?.toLowerCase().includes(term)
    );
  };

  const filterClientsByTags = (tags) => {
    if (!tags || tags.length === 0) return data;
    return data.filter(client =>
      client.tags?.some(tag => tags.includes(tag))
    );
  };

  return {
    clients: data,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    getClientById,
    searchClients,
    filterClientsByTags,
  };
}
