// src/constants/sampleTemplates.js
import { FIELD_TYPES, TEMPLATE_TYPES } from './formFieldTypes';

/**
 * Sample Form & Checklist Templates
 * Industry-specific templates to get users started quickly
 */

/**
 * 1. Pool Service Checklist
 * For regular pool maintenance visits
 */
export const poolServiceChecklist = {
  name: 'Pool Service Checklist',
  description: 'Standard checklist for weekly/monthly pool maintenance',
  type: TEMPLATE_TYPES.CHECKLIST,
  fields: [
    {
      id: 'pool_check_1',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Water Testing',
      order: 0,
    },
    {
      id: 'pool_check_2',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Test pH levels (7.2-7.8)',
      required: true,
      order: 1,
    },
    {
      id: 'pool_check_3',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Test chlorine levels (1-3 ppm)',
      required: true,
      order: 2,
    },
    {
      id: 'pool_check_4',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Test alkalinity (80-120 ppm)',
      required: true,
      order: 3,
    },
    {
      id: 'pool_check_5',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Physical Cleaning',
      order: 4,
    },
    {
      id: 'pool_check_6',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Skim surface for debris',
      required: true,
      order: 5,
    },
    {
      id: 'pool_check_7',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Empty skimmer baskets',
      required: true,
      order: 6,
    },
    {
      id: 'pool_check_8',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Empty pump basket',
      required: true,
      order: 7,
    },
    {
      id: 'pool_check_9',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Brush walls and floor',
      required: false,
      order: 8,
    },
    {
      id: 'pool_check_10',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Vacuum pool if needed',
      required: false,
      order: 9,
    },
    {
      id: 'pool_check_11',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Equipment Check',
      order: 10,
    },
    {
      id: 'pool_check_12',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Check filter pressure',
      required: true,
      order: 11,
    },
    {
      id: 'pool_check_13',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Inspect pump operation',
      required: true,
      order: 12,
    },
    {
      id: 'pool_check_14',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Check for leaks',
      required: true,
      order: 13,
    },
    {
      id: 'pool_check_15',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Chemicals Added',
      order: 14,
    },
    {
      id: 'pool_check_16',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Add chlorine/shock',
      required: false,
      order: 15,
    },
    {
      id: 'pool_check_17',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Add pH increaser/decreaser',
      required: false,
      order: 16,
    },
    {
      id: 'pool_check_18',
      type: FIELD_TYPES.CHECKBOX,
      label: 'Add algaecide',
      required: false,
      order: 17,
    },
  ],
};

/**
 * 2. HVAC Inspection Form
 * Comprehensive HVAC system inspection
 */
export const hvacInspectionForm = {
  name: 'HVAC Inspection Form',
  description: 'Complete HVAC system inspection checklist',
  type: TEMPLATE_TYPES.INSPECTION,
  fields: [
    {
      id: 'hvac_1',
      type: FIELD_TYPES.SELECT,
      label: 'System Type',
      required: true,
      options: ['Central Air', 'Heat Pump', 'Furnace', 'Mini-Split', 'Other'],
      order: 0,
    },
    {
      id: 'hvac_2',
      type: FIELD_TYPES.TEXT,
      label: 'System Make/Model',
      placeholder: 'e.g., Carrier Infinity',
      required: false,
      order: 1,
    },
    {
      id: 'hvac_3',
      type: FIELD_TYPES.NUMBER,
      label: 'Supply Air Temperature (°F)',
      required: true,
      validation: { min: 0, max: 150 },
      order: 2,
    },
    {
      id: 'hvac_4',
      type: FIELD_TYPES.NUMBER,
      label: 'Return Air Temperature (°F)',
      required: true,
      validation: { min: 0, max: 150 },
      order: 3,
    },
    {
      id: 'hvac_5',
      type: FIELD_TYPES.SELECT,
      label: 'Filter Condition',
      required: true,
      options: ['Clean', 'Dirty - Cleaned', 'Dirty - Replaced', 'Missing'],
      order: 4,
    },
    {
      id: 'hvac_6',
      type: FIELD_TYPES.NUMBER,
      label: 'Refrigerant Pressure (PSI)',
      required: false,
      validation: { min: 0, max: 500 },
      order: 5,
    },
    {
      id: 'hvac_7',
      type: FIELD_TYPES.MULTISELECT,
      label: 'Issues Found',
      required: false,
      options: [
        'Low refrigerant',
        'Dirty coils',
        'Weak airflow',
        'Strange noises',
        'Electrical issues',
        'Thermostat problems',
        'Duct leaks',
        'None',
      ],
      order: 6,
    },
    {
      id: 'hvac_8',
      type: FIELD_TYPES.TEXTAREA,
      label: 'Detailed Findings',
      placeholder: 'Describe any issues or recommendations',
      required: false,
      validation: { maxLength: 1000 },
      order: 7,
    },
    {
      id: 'hvac_9',
      type: FIELD_TYPES.PHOTO,
      label: 'System Photo',
      required: false,
      order: 8,
    },
    {
      id: 'hvac_10',
      type: FIELD_TYPES.SIGNATURE,
      label: 'Technician Signature',
      required: true,
      order: 9,
    },
  ],
};

/**
 * 3. Pest Control Treatment Form
 * Record pest control service details
 */
export const pestControlForm = {
  name: 'Pest Control Treatment',
  description: 'Document pest control treatments and findings',
  type: TEMPLATE_TYPES.JOB_FORM,
  fields: [
    {
      id: 'pest_1',
      type: FIELD_TYPES.MULTISELECT,
      label: 'Areas Treated',
      required: true,
      options: [
        'Kitchen',
        'Bathrooms',
        'Bedrooms',
        'Living areas',
        'Basement',
        'Attic',
        'Garage',
        'Exterior perimeter',
        'Lawn/yard',
      ],
      order: 0,
    },
    {
      id: 'pest_2',
      type: FIELD_TYPES.MULTISELECT,
      label: 'Pests Targeted',
      required: true,
      options: [
        'Ants',
        'Roaches',
        'Spiders',
        'Rodents',
        'Termites',
        'Bed bugs',
        'Fleas',
        'Wasps/hornets',
        'Other',
      ],
      order: 1,
    },
    {
      id: 'pest_3',
      type: FIELD_TYPES.TEXT,
      label: 'Chemicals Used',
      placeholder: 'Product names and EPA registration numbers',
      required: true,
      order: 2,
    },
    {
      id: 'pest_4',
      type: FIELD_TYPES.NUMBER,
      label: 'Amount Applied (oz)',
      required: false,
      validation: { min: 0 },
      order: 3,
    },
    {
      id: 'pest_5',
      type: FIELD_TYPES.MULTISELECT,
      label: 'Safety Precautions',
      required: true,
      options: [
        'Keep children away for 2 hours',
        'Keep pets away for 2 hours',
        'Ventilate treated areas',
        'Do not touch treated surfaces',
        'Avoid water contact for 24 hours',
      ],
      order: 4,
    },
    {
      id: 'pest_6',
      type: FIELD_TYPES.DATE,
      label: 'Next Service Date',
      required: false,
      order: 5,
    },
    {
      id: 'pest_7',
      type: FIELD_TYPES.PHOTO,
      label: 'Before Treatment Photo',
      required: false,
      order: 6,
    },
    {
      id: 'pest_8',
      type: FIELD_TYPES.PHOTO,
      label: 'After Treatment Photo',
      required: false,
      order: 7,
    },
    {
      id: 'pest_9',
      type: FIELD_TYPES.TEXTAREA,
      label: 'Additional Notes',
      placeholder: 'Any observations or recommendations',
      required: false,
      validation: { maxLength: 500 },
      order: 8,
    },
    {
      id: 'pest_10',
      type: FIELD_TYPES.SIGNATURE,
      label: 'Customer Signature',
      required: false,
      order: 9,
    },
  ],
};

/**
 * 4. Property Inspection Form
 * Room-by-room property condition assessment
 */
export const propertyInspectionForm = {
  name: 'Property Inspection',
  description: 'Comprehensive property condition assessment',
  type: TEMPLATE_TYPES.INSPECTION,
  fields: [
    {
      id: 'prop_1',
      type: FIELD_TYPES.DATE,
      label: 'Inspection Date',
      required: true,
      order: 0,
    },
    {
      id: 'prop_2',
      type: FIELD_TYPES.SELECT,
      label: 'Inspection Type',
      required: true,
      options: ['Move-in', 'Move-out', 'Annual', 'Maintenance', 'Pre-sale'],
      order: 1,
    },
    {
      id: 'prop_3',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Kitchen',
      order: 2,
    },
    {
      id: 'prop_4',
      type: FIELD_TYPES.SELECT,
      label: 'Kitchen Condition',
      required: true,
      options: ['Excellent', 'Good', 'Fair', 'Poor', 'Requires Repair'],
      order: 3,
    },
    {
      id: 'prop_5',
      type: FIELD_TYPES.PHOTO,
      label: 'Kitchen Photo',
      required: false,
      order: 4,
    },
    {
      id: 'prop_6',
      type: FIELD_TYPES.TEXTAREA,
      label: 'Kitchen Notes',
      placeholder: 'Document any issues or observations',
      required: false,
      order: 5,
    },
    {
      id: 'prop_7',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Bathrooms',
      order: 6,
    },
    {
      id: 'prop_8',
      type: FIELD_TYPES.SELECT,
      label: 'Bathroom Condition',
      required: true,
      options: ['Excellent', 'Good', 'Fair', 'Poor', 'Requires Repair'],
      order: 7,
    },
    {
      id: 'prop_9',
      type: FIELD_TYPES.PHOTO,
      label: 'Bathroom Photo',
      required: false,
      order: 8,
    },
    {
      id: 'prop_10',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Bedrooms',
      order: 9,
    },
    {
      id: 'prop_11',
      type: FIELD_TYPES.SELECT,
      label: 'Bedroom Condition',
      required: true,
      options: ['Excellent', 'Good', 'Fair', 'Poor', 'Requires Repair'],
      order: 10,
    },
    {
      id: 'prop_12',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Living Areas',
      order: 11,
    },
    {
      id: 'prop_13',
      type: FIELD_TYPES.SELECT,
      label: 'Living Area Condition',
      required: true,
      options: ['Excellent', 'Good', 'Fair', 'Poor', 'Requires Repair'],
      order: 12,
    },
    {
      id: 'prop_14',
      type: FIELD_TYPES.SECTION_HEADER,
      label: 'Overall Assessment',
      order: 13,
    },
    {
      id: 'prop_15',
      type: FIELD_TYPES.MULTISELECT,
      label: 'Issues Identified',
      required: false,
      options: [
        'Plumbing leaks',
        'Electrical issues',
        'HVAC problems',
        'Pest infestation',
        'Water damage',
        'Mold/mildew',
        'Damaged flooring',
        'Paint/drywall damage',
        'Appliance issues',
        'None',
      ],
      order: 14,
    },
    {
      id: 'prop_16',
      type: FIELD_TYPES.TEXTAREA,
      label: 'Overall Comments',
      placeholder: 'Summary of findings and recommendations',
      required: false,
      validation: { maxLength: 1000 },
      order: 15,
    },
    {
      id: 'prop_17',
      type: FIELD_TYPES.SIGNATURE,
      label: 'Inspector Signature',
      required: true,
      order: 16,
    },
    {
      id: 'prop_18',
      type: FIELD_TYPES.SIGNATURE,
      label: 'Property Owner Signature',
      required: false,
      order: 17,
    },
  ],
};

/**
 * 5. Equipment Maintenance Form
 * Track equipment service and maintenance
 */
export const equipmentMaintenanceForm = {
  name: 'Equipment Maintenance',
  description: 'Service record for equipment and machinery',
  type: TEMPLATE_TYPES.WORK_ORDER,
  fields: [
    {
      id: 'equip_1',
      type: FIELD_TYPES.TEXT,
      label: 'Equipment ID/Serial Number',
      placeholder: 'e.g., HVAC-001 or SN12345',
      required: true,
      order: 0,
    },
    {
      id: 'equip_2',
      type: FIELD_TYPES.TEXT,
      label: 'Equipment Type',
      placeholder: 'e.g., Generator, HVAC Unit, Pump',
      required: true,
      order: 1,
    },
    {
      id: 'equip_3',
      type: FIELD_TYPES.SELECT,
      label: 'Maintenance Type',
      required: true,
      options: [
        'Preventive Maintenance',
        'Corrective Maintenance',
        'Emergency Repair',
        'Inspection',
        'Replacement',
      ],
      order: 2,
    },
    {
      id: 'equip_4',
      type: FIELD_TYPES.NUMBER,
      label: 'Hours of Operation',
      placeholder: 'Current hour meter reading',
      required: false,
      validation: { min: 0 },
      order: 3,
    },
    {
      id: 'equip_5',
      type: FIELD_TYPES.MULTISELECT,
      label: 'Work Performed',
      required: true,
      options: [
        'Oil change',
        'Filter replacement',
        'Belt replacement',
        'Lubrication',
        'Calibration',
        'Cleaning',
        'Electrical repair',
        'Mechanical repair',
        'Software update',
        'Safety inspection',
      ],
      order: 4,
    },
    {
      id: 'equip_6',
      type: FIELD_TYPES.TEXTAREA,
      label: 'Parts Replaced',
      placeholder: 'List all parts replaced with part numbers',
      required: false,
      validation: { maxLength: 500 },
      order: 5,
    },
    {
      id: 'equip_7',
      type: FIELD_TYPES.TEXTAREA,
      label: 'Work Description',
      placeholder: 'Detailed description of work performed',
      required: true,
      validation: { minLength: 10, maxLength: 1000 },
      order: 6,
    },
    {
      id: 'equip_8',
      type: FIELD_TYPES.SELECT,
      label: 'Equipment Status After Service',
      required: true,
      options: [
        'Operational - No Issues',
        'Operational - Monitor',
        'Requires Follow-up',
        'Out of Service',
        'Decommissioned',
      ],
      order: 7,
    },
    {
      id: 'equip_9',
      type: FIELD_TYPES.DATE,
      label: 'Next Service Due Date',
      required: false,
      order: 8,
    },
    {
      id: 'equip_10',
      type: FIELD_TYPES.PHOTO,
      label: 'Equipment Serial Number Plate',
      required: false,
      order: 9,
    },
    {
      id: 'equip_11',
      type: FIELD_TYPES.PHOTO,
      label: 'Post-Service Photo',
      required: false,
      order: 10,
    },
    {
      id: 'equip_12',
      type: FIELD_TYPES.SIGNATURE,
      label: 'Technician Signature',
      required: true,
      order: 11,
    },
  ],
};

/**
 * All sample templates in one array
 */
export const allSampleTemplates = [
  poolServiceChecklist,
  hvacInspectionForm,
  pestControlForm,
  propertyInspectionForm,
  equipmentMaintenanceForm,
];

/**
 * Get template by name
 */
export function getSampleTemplateByName(name) {
  return allSampleTemplates.find((t) => t.name === name);
}

/**
 * Get templates by type
 */
export function getSampleTemplatesByType(type) {
  return allSampleTemplates.filter((t) => t.type === type);
}
