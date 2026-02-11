// src/components/forms/FormBuilder.jsx
import React, { useState, useCallback } from 'react';
import {
  FIELD_TYPES,
  FIELD_TYPE_METADATA,
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_METADATA,
  validateFieldConfig,
} from '../../constants/formFieldTypes';
import { useFormTemplates } from '../../hooks/data';
import FormFieldEditor from './FormFieldEditor';
import FormRenderer from './FormRenderer';

/**
 * Form Builder Component
 * Visual drag-and-drop form builder for creating templates
 */
export default function FormBuilder({ template = null, onSave, onCancel }) {
  const { addTemplate, updateTemplate, validateTemplate } = useFormTemplates();

  // Form template state
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    type: template?.type || TEMPLATE_TYPES.JOB_FORM,
    fields: template?.fields || [],
  });

  // UI state
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  // Add new field
  const handleAddField = useCallback((fieldType) => {
    const newField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: fieldType,
      label: '',
      placeholder: '',
      required: false,
      options: FIELD_TYPE_METADATA[fieldType]?.requiresOptions ? ['Option 1'] : undefined,
      validation: {},
    };

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    // Auto-select the new field for editing
    setSelectedFieldIndex(formData.fields.length);
  }, [formData.fields.length]);

  // Update field
  const handleUpdateField = useCallback((index, updates) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => (i === index ? { ...field, ...updates } : field)),
    }));
  }, []);

  // Delete field
  const handleDeleteField = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
    setSelectedFieldIndex(null);
  }, []);

  // Move field up
  const handleMoveFieldUp = useCallback((index) => {
    if (index === 0) return;

    setFormData((prev) => {
      const newFields = [...prev.fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      return { ...prev, fields: newFields };
    });

    setSelectedFieldIndex(index - 1);
  }, []);

  // Move field down
  const handleMoveFieldDown = useCallback((index) => {
    if (index === formData.fields.length - 1) return;

    setFormData((prev) => {
      const newFields = [...prev.fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      return { ...prev, fields: newFields };
    });

    setSelectedFieldIndex(index + 1);
  }, [formData.fields.length]);

  // Duplicate field
  const handleDuplicateField = useCallback((index) => {
    const field = formData.fields[index];
    const duplicatedField = {
      ...JSON.parse(JSON.stringify(field)),
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: `${field.label} (Copy)`,
    };

    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields.slice(0, index + 1),
        duplicatedField,
        ...prev.fields.slice(index + 1),
      ],
    }));

    setSelectedFieldIndex(index + 1);
  }, [formData.fields]);

  // Save template
  const handleSave = async () => {
    // Validate
    const validation = validateTemplate(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      if (template?.id) {
        await updateTemplate(template.id, formData);
      } else {
        await addTemplate(formData);
      }

      if (onSave) onSave();
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setSaving(false);
    }
  };

  const selectedField = selectedFieldIndex !== null ? formData.fields[selectedFieldIndex] : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Form Name"
              className="text-2xl font-bold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full"
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)"
              className="text-sm text-gray-600 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full mt-1"
            />
          </div>

          <div className="flex items-center gap-2 ml-6">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(TEMPLATE_TYPE_METADATA).map(([value, { label, icon }]) => (
                <option key={value} value={value}>
                  {icon} {label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {showPreview ? '📝 Edit' : '👁️ Preview'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || formData.fields.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : template?.id ? 'Update' : 'Create'}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm font-medium text-red-800">Please fix the following errors:</p>
            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
              {errors.map((error, index) => (
                <key key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {!showPreview ? (
          <>
            {/* Field Palette */}
            <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Fields</h3>
                <div className="space-y-1">
                  {Object.entries(FIELD_TYPE_METADATA).map(([type, { label, icon, description }]) => (
                    <button
                      key={type}
                      onClick={() => handleAddField(type)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500 truncate">{description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Canvas */}
            <div className="flex-1 overflow-y-auto p-6">
              {formData.fields.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">No fields yet</p>
                    <p className="text-sm text-gray-400">Add fields from the left panel to get started</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-2">
                  {formData.fields.map((field, index) => {
                    const metadata = FIELD_TYPE_METADATA[field.type];
                    const isSelected = selectedFieldIndex === index;

                    return (
                      <div
                        key={field.id}
                        onClick={() => setSelectedFieldIndex(index)}
                        className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{metadata?.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {field.label || <span className="text-gray-400 italic">Untitled Field</span>}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            <p className="text-sm text-gray-500">{metadata?.label}</p>
                            {field.placeholder && (
                              <p className="text-xs text-gray-400 mt-1">{field.placeholder}</p>
                            )}
                          </div>

                          {/* Field Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveFieldUp(index);
                              }}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveFieldDown(index);
                              }}
                              disabled={index === formData.fields.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateField(index);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Duplicate"
                            >
                              ⎘
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteField(index);
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Field Editor Sidebar */}
            {selectedField && (
              <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
                <FormFieldEditor
                  field={selectedField}
                  onUpdate={(updates) => handleUpdateField(selectedFieldIndex, updates)}
                  onClose={() => setSelectedFieldIndex(null)}
                />
              </div>
            )}
          </>
        ) : (
          /* Preview Mode */
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold mb-2">{formData.name || 'Untitled Form'}</h2>
                {formData.description && (
                  <p className="text-gray-600 mb-6">{formData.description}</p>
                )}
                <FormRenderer
                  template={formData}
                  readOnly={true}
                  showValidation={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
