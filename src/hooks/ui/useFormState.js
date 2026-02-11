import { useState, useCallback } from 'react';

/**
 * Hook for managing form state
 * @param {Object} initialState - Initial form values
 * @returns {Object} Form state and handlers
 */
export function useFormState(initialState = {}) {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const reset = useCallback((newValues) => {
    setValues(newValues || initialState);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialState]);

  const validateField = useCallback((name, validator) => {
    const error = validator(values[name], values);
    if (error) {
      setFieldError(name, error);
      return false;
    }
    return true;
  }, [values, setFieldError]);

  const validateForm = useCallback((validators) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validators).forEach(field => {
      const error = validators[field](values[field], values);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values]);

  const handleSubmit = useCallback(async (onSubmit, validators = {}) => {
    setIsSubmitting(true);

    if (Object.keys(validators).length > 0) {
      const isValid = validateForm(validators);
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSubmit(values);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({ ...prev, submit: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, reset]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    reset,
    validateField,
    validateForm,
    handleSubmit,
  };
}
