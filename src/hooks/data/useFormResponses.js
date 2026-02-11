// src/hooks/data/useFormResponses.js
import { useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestoreCollection } from './useFirestore';

/**
 * Form Responses Hook
 * Manages CRUD operations for form responses/submissions
 */
export function useFormResponses() {
  const { userId } = useAuth();

  const {
    data: responses,
    loading,
    error,
    add,
    update,
    remove,
  } = useFirestoreCollection(userId, 'formResponses');

  // Submit a new response
  const submitResponse = useCallback(
    async (responseData) => {
      const newResponse = {
        templateId: responseData.templateId,
        jobId: responseData.jobId || null,
        clientId: responseData.clientId || null,
        submittedBy: responseData.submittedBy || userId,
        submittedAt: new Date().toISOString(),
        responses: responseData.responses || {},
        attachments: responseData.attachments || [],
        location: responseData.location || null,
        offline: responseData.offline || false,
        syncedAt: responseData.offline ? null : new Date().toISOString(),
      };

      return await add(newResponse);
    },
    [add, userId]
  );

  // Update response (for drafts)
  const updateResponse = useCallback(
    async (responseId, updates) => {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      return await update(responseId, updatedData);
    },
    [update]
  );

  // Delete response
  const deleteResponse = useCallback(
    async (responseId) => {
      return await remove(responseId);
    },
    [remove]
  );

  // Get responses by job
  const getResponsesByJob = useCallback(
    (jobId) => {
      return responses.filter((r) => r.jobId === jobId);
    },
    [responses]
  );

  // Get responses by template
  const getResponsesByTemplate = useCallback(
    (templateId) => {
      return responses.filter((r) => r.templateId === templateId);
    },
    [responses]
  );

  // Get responses by client
  const getResponsesByClient = useCallback(
    (clientId) => {
      return responses.filter((r) => r.clientId === clientId);
    },
    [responses]
  );

  // Get response by ID
  const getResponseById = useCallback(
    (responseId) => {
      return responses.find((r) => r.id === responseId);
    },
    [responses]
  );

  // Get pending sync responses (offline submissions)
  const pendingSyncResponses = useMemo(() => {
    return responses.filter((r) => r.offline && !r.syncedAt);
  }, [responses]);

  // Mark response as synced
  const markAsSynced = useCallback(
    async (responseId) => {
      return await updateResponse(responseId, {
        offline: false,
        syncedAt: new Date().toISOString(),
      });
    },
    [updateResponse]
  );

  // Get responses in date range
  const getResponsesByDateRange = useCallback(
    (startDate, endDate) => {
      return responses.filter((r) => {
        const submittedDate = new Date(r.submittedAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return submittedDate >= start && submittedDate <= end;
      });
    },
    [responses]
  );

  // Sort responses by submission date (newest first)
  const sortedResponses = useMemo(() => {
    return [...responses].sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return dateB - dateA;
    });
  }, [responses]);

  // Get response statistics
  const getResponseStats = useCallback((templateId) => {
    const templateResponses = responses.filter((r) => r.templateId === templateId);
    return {
      total: templateResponses.length,
      thisWeek: templateResponses.filter((r) => {
        const submittedDate = new Date(r.submittedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return submittedDate >= weekAgo;
      }).length,
      thisMonth: templateResponses.filter((r) => {
        const submittedDate = new Date(r.submittedAt);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return submittedDate >= monthAgo;
      }).length,
      pendingSync: templateResponses.filter((r) => r.offline && !r.syncedAt).length,
    };
  }, [responses]);

  // Export responses to CSV
  const exportToCSV = useCallback((templateId) => {
    const templateResponses = responses.filter((r) => r.templateId === templateId);

    if (templateResponses.length === 0) {
      return '';
    }

    // Get all unique field IDs
    const fieldIds = new Set();
    templateResponses.forEach((response) => {
      Object.keys(response.responses || {}).forEach((fieldId) => {
        fieldIds.add(fieldId);
      });
    });

    // Create CSV header
    const headers = ['Submission Date', 'Job ID', 'Client ID', 'Submitted By', ...Array.from(fieldIds)];
    const csvRows = [headers.join(',')];

    // Add data rows
    templateResponses.forEach((response) => {
      const row = [
        response.submittedAt,
        response.jobId || '',
        response.clientId || '',
        response.submittedBy || '',
        ...Array.from(fieldIds).map((fieldId) => {
          const value = response.responses[fieldId];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value || '';
        }),
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }, [responses]);

  return {
    responses: sortedResponses,
    allResponses: responses,
    pendingSyncResponses,
    loading,
    error,
    submitResponse,
    updateResponse,
    deleteResponse,
    getResponsesByJob,
    getResponsesByTemplate,
    getResponsesByClient,
    getResponseById,
    getResponsesByDateRange,
    getResponseStats,
    markAsSynced,
    exportToCSV,
  };
}
