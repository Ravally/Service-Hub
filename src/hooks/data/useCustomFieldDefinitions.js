// src/hooks/data/useCustomFieldDefinitions.js
import { useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestoreCollection } from './useFirestore';

/**
 * Custom Field Definitions Hook
 * Manages CRUD for custom field definitions stored in Firestore
 */
export function useCustomFieldDefinitions() {
  const { userId } = useAuth();

  const {
    data: definitions,
    loading,
    error,
    add,
    update,
    remove,
  } = useFirestoreCollection(userId, 'customFieldDefinitions');

  const addDefinition = useCallback(async (defData) => {
    const newDef = {
      name: (defData.name || '').trim(),
      type: defData.type || 'text',
      appliesTo: defData.appliesTo || [],
      options: defData.options || [],
      required: !!defData.required,
      order: defData.order ?? definitions.length,
      createdAt: new Date().toISOString(),
    };
    return await add(newDef);
  }, [add, definitions.length]);

  const updateDefinition = useCallback(async (id, updates) => {
    return await update(id, updates);
  }, [update]);

  const deleteDefinition = useCallback(async (id) => {
    return await remove(id);
  }, [remove]);

  const getDefinitionsForEntity = useCallback((entityType) => {
    return definitions
      .filter(d => (d.appliesTo || []).includes(entityType))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [definitions]);

  const sortedDefinitions = useMemo(() => {
    return [...definitions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [definitions]);

  return {
    definitions: sortedDefinitions,
    loading,
    error,
    addDefinition,
    updateDefinition,
    deleteDefinition,
    getDefinitionsForEntity,
  };
}
