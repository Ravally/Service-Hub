// src/constants/formFieldTypes.js
/**
 * Form Field Type Definitions
 * Defines all available field types for dynamic form builder
 */

/**
 * Available field types
 */
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  TIME: 'time',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  PHOTO: 'photo',
  SIGNATURE: 'signature',
  SECTION_HEADER: 'section_header',
};

/**
 * Field type metadata (labels, icons, descriptions)
 */
export const FIELD_TYPE_METADATA = {
  [FIELD_TYPES.TEXT]: {
    label: 'Text Input',
    icon: '📝',
    description: 'Single line text input',
    supportsValidation: true,
    supportsPlaceholder: true,
  },
  [FIELD_TYPES.NUMBER]: {
    label: 'Number',
    icon: '🔢',
    description: 'Numeric input with min/max validation',
    supportsValidation: true,
    supportsPlaceholder: true,
  },
  [FIELD_TYPES.EMAIL]: {
    label: 'Email',
    icon: '📧',
    description: 'Email address with validation',
    supportsValidation: true,
    supportsPlaceholder: true,
  },
  [FIELD_TYPES.PHONE]: {
    label: 'Phone Number',
    icon: '📱',
    description: 'Phone number input',
    supportsValidation: true,
    supportsPlaceholder: true,
  },
  [FIELD_TYPES.DATE]: {
    label: 'Date',
    icon: '📅',
    description: 'Date picker',
    supportsValidation: true,
    supportsPlaceholder: false,
  },
  [FIELD_TYPES.TIME]: {
    label: 'Time',
    icon: '🕐',
    description: 'Time picker',
    supportsValidation: false,
    supportsPlaceholder: false,
  },
  [FIELD_TYPES.TEXTAREA]: {
    label: 'Long Text',
    icon: '📄',
    description: 'Multi-line text area',
    supportsValidation: true,
    supportsPlaceholder: true,
  },
  [FIELD_TYPES.SELECT]: {
    label: 'Dropdown',
    icon: '▼',
    description: 'Single selection dropdown',
    supportsValidation: false,
    supportsPlaceholder: false,
    requiresOptions: true,
  },
  [FIELD_TYPES.MULTISELECT]: {
    label: 'Multi-Select',
    icon: '☑️',
    description: 'Multiple selection checkboxes',
    supportsValidation: false,
    supportsPlaceholder: false,
    requiresOptions: true,
  },
  [FIELD_TYPES.CHECKBOX]: {
    label: 'Checkbox',
    icon: '✅',
    description: 'Single checkbox (yes/no)',
    supportsValidation: false,
    supportsPlaceholder: false,
  },
  [FIELD_TYPES.RADIO]: {
    label: 'Radio Buttons',
    icon: '⚪',
    description: 'Single selection radio buttons',
    supportsValidation: false,
    supportsPlaceholder: false,
    requiresOptions: true,
  },
  [FIELD_TYPES.PHOTO]: {
    label: 'Photo Upload',
    icon: '📷',
    description: 'Photo capture or upload',
    supportsValidation: false,
    supportsPlaceholder: false,
  },
  [FIELD_TYPES.SIGNATURE]: {
    label: 'Signature',
    icon: '✍️',
    description: 'Digital signature capture',
    supportsValidation: false,
    supportsPlaceholder: false,
  },
  [FIELD_TYPES.SECTION_HEADER]: {
    label: 'Section Header',
    icon: '📋',
    description: 'Visual section divider with title',
    supportsValidation: false,
    supportsPlaceholder: false,
  },
};

/**
 * Default validation rules per field type
 */
export const DEFAULT_VALIDATION = {
  [FIELD_TYPES.TEXT]: {
    minLength: null,
    maxLength: 255,
    pattern: null,
  },
  [FIELD_TYPES.NUMBER]: {
    min: null,
    max: null,
    decimals: 0,
  },
  [FIELD_TYPES.EMAIL]: {
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    message: 'Please enter a valid email address',
  },
  [FIELD_TYPES.PHONE]: {
    pattern: null,
    message: 'Please enter a valid phone number',
  },
  [FIELD_TYPES.DATE]: {
    minDate: null,
    maxDate: null,
  },
  [FIELD_TYPES.TEXTAREA]: {
    minLength: null,
    maxLength: 2000,
  },
};

/**
 * Form template types
 */
export const TEMPLATE_TYPES = {
  JOB_FORM: 'job_form',
  CHECKLIST: 'checklist',
  INSPECTION: 'inspection',
  SITE_SURVEY: 'site_survey',
  WORK_ORDER: 'work_order',
};

/**
 * Template type metadata
 */
export const TEMPLATE_TYPE_METADATA = {
  [TEMPLATE_TYPES.JOB_FORM]: {
    label: 'Job Form',
    icon: '📋',
    description: 'General purpose job completion form',
  },
  [TEMPLATE_TYPES.CHECKLIST]: {
    label: 'Checklist',
    icon: '✅',
    description: 'Task checklist for standardized procedures',
  },
  [TEMPLATE_TYPES.INSPECTION]: {
    label: 'Inspection',
    icon: '🔍',
    description: 'Detailed inspection form with photos',
  },
  [TEMPLATE_TYPES.SITE_SURVEY]: {
    label: 'Site Survey',
    icon: '📍',
    description: 'On-site assessment and measurements',
  },
  [TEMPLATE_TYPES.WORK_ORDER]: {
    label: 'Work Order',
    icon: '🔧',
    description: 'Detailed work order with materials and labor',
  },
};

/**
 * Get field types that require options
 */
export function getFieldTypesRequiringOptions() {
  return Object.keys(FIELD_TYPE_METADATA).filter(
    (type) => FIELD_TYPE_METADATA[type].requiresOptions
  );
}

/**
 * Validate field configuration
 */
export function validateFieldConfig(field) {
  const errors = [];

  if (!field.type || !FIELD_TYPES[field.type.toUpperCase()]) {
    errors.push('Invalid field type');
  }

  if (!field.label || field.label.trim() === '') {
    errors.push('Field label is required');
  }

  const metadata = FIELD_TYPE_METADATA[field.type];
  if (metadata?.requiresOptions && (!field.options || field.options.length === 0)) {
    errors.push(`${metadata.label} requires at least one option`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
