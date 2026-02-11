// src/components/forms/FormRenderer.jsx
import React, { useState, useCallback } from 'react';
import { FIELD_TYPES, FIELD_TYPE_METADATA } from '../../constants/formFieldTypes';

/**
 * Form Renderer Component
 * Dynamically renders forms from templates
 */
export default function FormRenderer({
  template,
  initialValues = {},
  onSubmit,
  readOnly = false,
  showValidation = true,
}) {
  const [formValues, setFormValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Handle field change
  const handleFieldChange = useCallback((fieldId, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error when field is changed
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldId) => {
    setTouched((prev) => ({
      ...prev,
      [fieldId]: true,
    }));
  }, []);

  // Validate field
  const validateField = useCallback((field, value) => {
    const errors = [];

    // Required validation
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push(field.validation?.message || `${field.label} is required`);
      return errors;
    }

    // Skip further validation if empty and not required
    if (!value) return errors;

    // Type-specific validation
    switch (field.type) {
      case FIELD_TYPES.TEXT:
      case FIELD_TYPES.TEXTAREA:
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          errors.push(`Must be at least ${field.validation.minLength} characters`);
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          errors.push(`Must be no more than ${field.validation.maxLength} characters`);
        }
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push(field.validation?.message || 'Invalid format');
          }
        }
        break;

      case FIELD_TYPES.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push('Please enter a valid email address');
        }
        break;

      case FIELD_TYPES.NUMBER:
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push('Please enter a valid number');
        } else {
          if (field.validation?.min !== null && field.validation?.min !== undefined && num < field.validation.min) {
            errors.push(`Must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== null && field.validation?.max !== undefined && num > field.validation.max) {
            errors.push(`Must be no more than ${field.validation.max}`);
          }
        }
        break;

      default:
        break;
    }

    return errors;
  }, []);

  // Validate entire form
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    template.fields?.forEach((field) => {
      const fieldErrors = validateField(field, formValues[field.id]);
      if (fieldErrors.length > 0) {
        newErrors[field.id] = fieldErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [template.fields, formValues, validateField]);

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!showValidation || validateForm()) {
      if (onSubmit) {
        onSubmit(formValues);
      }
    } else {
      // Mark all fields as touched to show errors
      const allTouched = {};
      template.fields?.forEach((field) => {
        allTouched[field.id] = true;
      });
      setTouched(allTouched);
    }
  };

  // Render individual field
  const renderField = (field) => {
    const value = formValues[field.id] || '';
    const fieldErrors = showValidation && touched[field.id] ? errors[field.id] || [] : [];
    const hasError = fieldErrors.length > 0;
    const metadata = FIELD_TYPE_METADATA[field.type];

    const commonClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
      hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    } ${readOnly ? 'bg-gray-50' : ''}`;

    switch (field.type) {
      case FIELD_TYPES.TEXT:
      case FIELD_TYPES.EMAIL:
      case FIELD_TYPES.PHONE:
        return (
          <input
            type={field.type === FIELD_TYPES.EMAIL ? 'email' : field.type === FIELD_TYPES.PHONE ? 'tel' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={() => handleFieldBlur(field.id)}
            placeholder={field.placeholder}
            disabled={readOnly}
            className={commonClasses}
          />
        );

      case FIELD_TYPES.NUMBER:
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={() => handleFieldBlur(field.id)}
            placeholder={field.placeholder}
            disabled={readOnly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={commonClasses}
          />
        );

      case FIELD_TYPES.DATE:
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={() => handleFieldBlur(field.id)}
            disabled={readOnly}
            className={commonClasses}
          />
        );

      case FIELD_TYPES.TIME:
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={() => handleFieldBlur(field.id)}
            disabled={readOnly}
            className={commonClasses}
          />
        );

      case FIELD_TYPES.TEXTAREA:
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={() => handleFieldBlur(field.id)}
            placeholder={field.placeholder}
            disabled={readOnly}
            rows={4}
            className={commonClasses}
          />
        );

      case FIELD_TYPES.SELECT:
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onBlur={() => handleFieldBlur(field.id)}
            disabled={readOnly}
            className={commonClasses}
          >
            <option value="">-- Select --</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case FIELD_TYPES.MULTISELECT:
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => {
              const selectedOptions = Array.isArray(value) ? value : [];
              const isChecked = selectedOptions.includes(option);

              return (
                <label key={index} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newSelected = e.target.checked
                        ? [...selectedOptions, option]
                        : selectedOptions.filter((o) => o !== option);
                      handleFieldChange(field.id, newSelected);
                    }}
                    disabled={readOnly}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              );
            })}
          </div>
        );

      case FIELD_TYPES.RADIO:
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case FIELD_TYPES.CHECKBOX:
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );

      case FIELD_TYPES.PHOTO:
        return (
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // In real implementation, would upload to Firebase Storage
                  handleFieldChange(field.id, file.name);
                }
              }}
              disabled={readOnly}
              className="text-sm"
            />
            {value && <span className="text-sm text-gray-600">📷 {value}</span>}
          </div>
        );

      case FIELD_TYPES.SIGNATURE:
        return (
          <div className="border border-gray-300 rounded-md p-4 text-center bg-gray-50">
            <p className="text-sm text-gray-500">✍️ Signature capture placeholder</p>
            {value && <p className="text-xs text-gray-400 mt-2">Signed: {value}</p>}
          </div>
        );

      case FIELD_TYPES.SECTION_HEADER:
        return (
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            {field.label}
          </h3>
        );

      default:
        return <p className="text-sm text-gray-500">Unknown field type: {field.type}</p>;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {template.fields?.map((field) => (
        <div key={field.id}>
          {field.type !== FIELD_TYPES.CHECKBOX && field.type !== FIELD_TYPES.SECTION_HEADER && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}

          {renderField(field)}

          {field.helpText && field.type !== FIELD_TYPES.SECTION_HEADER && (
            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
          )}

          {showValidation && touched[field.id] && errors[field.id] && (
            <div className="mt-1 text-sm text-red-600">
              {errors[field.id].map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}
        </div>
      ))}

      {!readOnly && onSubmit && (
        <button
          type="submit"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Submit
        </button>
      )}
    </form>
  );
}
