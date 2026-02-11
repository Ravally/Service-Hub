// src/hooks/data/useFormTemplates.js
import { useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestoreCollection } from './useFirestore';
import { TEMPLATE_TYPES } from '../../constants/formFieldTypes';

/**
 * Form Templates Hook
 * Manages CRUD operations for form templates
 */
export function useFormTemplates() {
  const { userId } = useAuth();

  const {
    data: templates,
    loading,
    error,
    add,
    update,
    remove,
  } = useFirestoreCollection(userId, 'formTemplates');

  // Add a new template
  const addTemplate = useCallback(
    async (templateData) => {
      const newTemplate = {
        name: templateData.name || 'Untitled Form',
        description: templateData.description || '',
        type: templateData.type || TEMPLATE_TYPES.JOB_FORM,
        fields: templateData.fields || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true,
      };

      return await add(newTemplate);
    },
    [add]
  );

  // Update existing template
  const updateTemplate = useCallback(
    async (templateId, updates) => {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      return await update(templateId, updatedData);
    },
    [update]
  );

  // Delete template
  const deleteTemplate = useCallback(
    async (templateId) => {
      return await remove(templateId);
    },
    [remove]
  );

  // Duplicate template
  const duplicateTemplate = useCallback(
    async (templateId) => {
      const original = templates.find((t) => t.id === templateId);
      if (!original) {
        throw new Error('Template not found');
      }

      const duplicate = {
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        fields: JSON.parse(JSON.stringify(original.fields)), // Deep copy
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true,
      };

      return await add(duplicate);
    },
    [templates, add]
  );

  // Get template by ID
  const getTemplateById = useCallback(
    (templateId) => {
      return templates.find((t) => t.id === templateId);
    },
    [templates]
  );

  // Get templates by type
  const getTemplatesByType = useCallback(
    (type) => {
      return templates.filter((t) => t.type === type && t.active);
    },
    [templates]
  );

  // Get active templates
  const activeTemplates = useMemo(() => {
    return templates.filter((t) => t.active !== false);
  }, [templates]);

  // Sort templates by updated date (newest first)
  const sortedTemplates = useMemo(() => {
    return [...activeTemplates].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB - dateA;
    });
  }, [activeTemplates]);

  // Get template field count
  const getFieldCount = useCallback((templateId) => {
    const template = getTemplateById(templateId);
    return template?.fields?.length || 0;
  }, [getTemplateById]);

  // Validate template
  const validateTemplate = useCallback((templateData) => {
    const errors = [];

    if (!templateData.name || templateData.name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!templateData.type) {
      errors.push('Template type is required');
    }

    if (!templateData.fields || templateData.fields.length === 0) {
      errors.push('Template must have at least one field');
    }

    // Validate each field
    templateData.fields?.forEach((field, index) => {
      if (!field.label || field.label.trim() === '') {
        errors.push(`Field ${index + 1} is missing a label`);
      }
      if (!field.type) {
        errors.push(`Field ${index + 1} is missing a type`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }, []);

  // Archive template (soft delete)
  const archiveTemplate = useCallback(
    async (templateId) => {
      return await updateTemplate(templateId, { active: false });
    },
    [updateTemplate]
  );

  // Restore archived template
  const restoreTemplate = useCallback(
    async (templateId) => {
      return await updateTemplate(templateId, { active: true });
    },
    [updateTemplate]
  );

  return {
    templates: sortedTemplates,
    allTemplates: templates,
    activeTemplates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    archiveTemplate,
    restoreTemplate,
    getTemplateById,
    getTemplatesByType,
    getFieldCount,
    validateTemplate,
  };
}
