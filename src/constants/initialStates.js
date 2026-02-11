/**
 * Initial state objects for quotes, jobs, and other entities
 */

export const initialQuoteState = {
  clientId: '',
  status: 'Draft',
  title: '',
  salesperson: '',
  customFields: [],
  propertyId: '',
  contactId: '',
  lineItems: [
    {
      type: 'line_item',
      name: '',
      description: '',
      qty: 1,
      price: 0,
      unitCost: 0,
      isOptional: false,
      imageUrl: '',
    },
  ],
  taxRate: 15,
  quoteDiscountType: 'amount',
  quoteDiscountValue: 0,
  depositRequiredAmount: 0,
  depositRequiredPercent: 0,
  depositSettings: {
    acceptCard: true,
    acceptBank: false,
    requireMethodOnFile: false,
  },
  contractTerms: '',
  disclaimers: '',
  internalNotes: '',
  clientMessage: '',
  clientViewSettings: {
    showQuantities: true,
    showUnitPrices: true,
    showLineItemTotals: true,
    showTotals: true,
  },
};

export const initialJobState = {
  clientId: '',
  quoteId: '',
  propertyId: '',
  propertySnapshot: null,
  title: '',
  start: '',
  end: '',
  status: 'Scheduled',
  notes: '',
  checklist: [],
  checklistTemplateId: null,
  formTemplates: [],
  formResponses: [],
  assignees: [],
  jobType: 'one_off',
  schedule: 'One-time',
  billingFrequency: 'Upon job completion',
  automaticPayments: false,
  visits: [],
  laborEntries: [],
  expenses: [],
  chemicalTreatments: [],
  billingReminders: [],
  lineItems: [],
};

export const initialClientState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  status: 'Active',
  tags: [],
  properties: [],
  contacts: [],
  notes: '',
  customFields: [],
};

export const initialPropertyState = {
  address: '',
  propertyType: '',
  size: '',
  accessInstructions: '',
  notes: '',
  customFields: [],
};

export const initialInvoiceState = {
  clientId: '',
  propertyId: '',
  status: 'Draft',
  issueDate: '',
  dueDate: '',
  paymentTerm: 'Due Today',
  lineItems: [
    {
      type: 'line_item',
      name: '',
      description: '',
      qty: 1,
      price: 0,
      unitCost: 0,
      isOptional: false,
    },
  ],
  taxRate: 15,
  discountType: 'amount',
  discountValue: 0,
  payments: [],
  notes: '',
  internalNotes: '',
};

export const initialLineItem = {
  type: 'line_item',
  name: '',
  description: '',
  qty: 1,
  price: 0,
  unitCost: 0,
  isOptional: false,
  discountType: 'amount',
  discountValue: 0,
  serviceDate: '',
};

export const initialTextLineItem = {
  type: 'text',
  content: '',
};

export const initialChecklistItem = {
  id: '',
  text: '',
  completed: false,
  completedBy: '',
  completedAt: '',
  required: false,
  notes: '',
  photos: [],
  order: 0,
};
