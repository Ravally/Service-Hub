// src/components/forms/ChecklistBuilder.jsx
import React, { useState, useCallback } from 'react';
import { useFormTemplates } from '../../hooks/data';
import { TEMPLATE_TYPES } from '../../constants/formFieldTypes';

/**
 * Checklist Builder Component
 * Create and edit checklist templates for jobs
 */
export default function ChecklistBuilder({ template = null, onSave, onCancel }) {
  const { addTemplate, updateTemplate, validateTemplate } = useFormTemplates();

  // Template state
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    type: TEMPLATE_TYPES.CHECKLIST,
    fields: template?.fields || [],
  });

  // UI state
  const [newItemText, setNewItemText] = useState('');
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Add checklist item
  const handleAddItem = useCallback(() => {
    if (!newItemText.trim()) return;

    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'checkbox',
      label: newItemText.trim(),
      required: false,
      order: formData.fields.length,
    };

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newItem],
    }));

    setNewItemText('');
  }, [newItemText, formData.fields.length]);

  // Update item
  const handleUpdateItem = useCallback((index, updates) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => (i === index ? { ...field, ...updates } : field)),
    }));
  }, []);

  // Delete item
  const handleDeleteItem = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }, []);

  // Move item
  const handleMoveItem = useCallback((fromIndex, toIndex) => {
    setFormData((prev) => {
      const newFields = [...prev.fields];
      const [movedItem] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, movedItem);

      // Update order property
      return {
        ...prev,
        fields: newFields.map((field, index) => ({ ...field, order: index })),
      };
    });
  }, []);

  // Toggle required
  const handleToggleRequired = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index ? { ...field, required: !field.required } : field
      ),
    }));
  }, []);

  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    handleMoveItem(draggedIndex, index);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

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

  // Handle key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-charcoal rounded-lg shadow-sm border border-slate-700/30">
      {/* Header */}
      <div className="border-b border-slate-700/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-100">
            {template?.id ? 'Edit Checklist Template' : 'Create Checklist Template'}
          </h2>
          <div className="flex items-center gap-2">
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
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-charcoal border border-slate-700 rounded-md hover:bg-midnight/60"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Template Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Pool Service Checklist"
              className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this checklist"
              className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm font-medium text-red-800">Please fix the following errors:</p>
            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add Item Input */}
      <div className="p-6 bg-midnight/60 border-b border-slate-700/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add checklist item..."
            className="flex-1 px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Item
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Press Enter to quickly add items
        </p>
      </div>

      {/* Checklist Items */}
      <div className="p-6">
        {formData.fields.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-2">No checklist items yet</p>
            <p className="text-sm text-slate-500">Add items using the input above</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-300">
                {formData.fields.length} {formData.fields.length === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-slate-400">
                Drag to reorder
              </p>
            </div>

            {formData.fields.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-3 p-3 bg-charcoal border border-slate-700/30 rounded-md hover:border-slate-600 cursor-move transition-all ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="text-slate-500 group-hover:text-slate-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                {/* Checkbox Preview */}
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 border-2 border-slate-700 rounded"></div>
                </div>

                {/* Item Text */}
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleUpdateItem(index, { label: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                />

                {/* Required Badge */}
                {item.required && (
                  <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                    Required
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRequired(index);
                    }}
                    className={`p-1 text-xs rounded ${
                      item.required
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-slate-500 hover:bg-midnight'
                    }`}
                    title={item.required ? 'Mark as optional' : 'Mark as required'}
                  >
                    ⚠
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(index);
                    }}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
