// src/components/forms/FormFieldEditor.jsx
import React, { useState, useEffect } from 'react';
import {
  FIELD_TYPE_METADATA,
  DEFAULT_VALIDATION,
} from '../../constants/formFieldTypes';

/**
 * Form Field Editor Component
 * Edit individual field properties in the sidebar
 */
export default function FormFieldEditor({ field, onUpdate, onClose }) {
  const [localField, setLocalField] = useState(field);
  const metadata = FIELD_TYPE_METADATA[field.type];

  // Update local state when field prop changes
  useEffect(() => {
    setLocalField(field);
  }, [field]);

  // Debounced update to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate(localField);
    }, 300);

    return () => clearTimeout(timer);
  }, [localField, onUpdate]);

  const handleChange = (key, value) => {
    setLocalField((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleValidationChange = (key, value) => {
    setLocalField((prev) => ({
      ...prev,
      validation: {
        ...prev.validation,
        [key]: value,
      },
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...(localField.options || [])];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const handleAddOption = () => {
    const newOptions = [...(localField.options || []), `Option ${(localField.options?.length || 0) + 1}`];
    handleChange('options', newOptions);
  };

  const handleRemoveOption = (index) => {
    const newOptions = localField.options.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Field Settings</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Field Type (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Type
          </label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
            <span className="text-xl">{metadata?.icon}</span>
            <span className="text-sm text-gray-900">{metadata?.label}</span>
          </div>
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={localField.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Enter field label"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Placeholder */}
        {metadata?.supportsPlaceholder && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder Text
            </label>
            <input
              type="text"
              value={localField.placeholder || ''}
              onChange={(e) => handleChange('placeholder', e.target.value)}
              placeholder="Optional placeholder"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Required */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localField.required || false}
              onChange={(e) => handleChange('required', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Required field</span>
          </label>
        </div>

        {/* Options (for select, multiselect, radio) */}
        {metadata?.requiresOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {(localField.options || []).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    disabled={localField.options.length === 1}
                    className="p-2 text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddOption}
                className="w-full px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                + Add Option
              </button>
            </div>
          </div>
        )}

        {/* Validation Rules */}
        {metadata?.supportsValidation && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Validation</h4>

            {/* Text validation */}
            {(field.type === 'text' || field.type === 'textarea') && (
              <>
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Min Length
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.minLength || ''}
                    onChange={(e) => handleValidationChange('minLength', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No minimum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Max Length
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.maxLength || ''}
                    onChange={(e) => handleValidationChange('maxLength', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder={DEFAULT_VALIDATION[field.type]?.maxLength || 'No maximum'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Number validation */}
            {field.type === 'number' && (
              <>
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Minimum Value
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.min || ''}
                    onChange={(e) => handleValidationChange('min', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="No minimum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Maximum Value
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.max || ''}
                    onChange={(e) => handleValidationChange('max', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="No maximum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Custom validation message */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Custom Error Message
              </label>
              <input
                type="text"
                value={localField.validation?.message || ''}
                onChange={(e) => handleValidationChange('message', e.target.value)}
                placeholder="Optional custom message"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Help Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Help Text
          </label>
          <textarea
            value={localField.helpText || ''}
            onChange={(e) => handleChange('helpText', e.target.value)}
            placeholder="Optional help text shown below the field"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
