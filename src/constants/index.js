// src/constants/index.js

export const JOB_STATUSES = [
  'Unscheduled', 
  'Scheduled', 
  'In Progress', 
  'Completed'
];

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
  taxRate: 15, // Default GST for NZ
  // Quote-level discount (legacy discountType/discountValue still read if present)
  quoteDiscountType: 'amount', // 'amount' | 'percent'
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
  lineItems: []
};

export const initialCompanySettings = { 
  name: '', 
  email: '', 
  phone: '', 
  address: '', 
  defaultGstRate: 15,
  quoteContractTerms: '',
  quoteDisclaimers: '',
  quoteClientViewSettings: {
    showQuantities: true,
    showUnitPrices: true,
    showLineItemTotals: true,
    showTotals: true,
  },
  invoiceContractTerms: '',
  invoiceDisclaimers: '',
  invoiceMessage: 'Thank you for your business. Please contact us with any questions regarding this invoice.',
  invoiceClientViewSettings: {
    showQuantities: true,
    showUnitCosts: true,
    showLineItemTotals: true,
    showTotals: true,
    showAccountBalance: true,
    showLateStamp: false,
  },
  invoicePaymentSettings: {
    acceptCard: true,
    acceptBank: false,
    allowPartialPayments: true,
  },
};

export const initialInvoiceSettings = {
  prefixInv: 'INV',
  prefixCn: 'CN',
  prefixQu: 'QU',
  prefixJob: 'JOB',
  prefixPo: 'PO',
  nextInvCn: 1,
  nextQu: 1,
  nextJob: 1,
  nextPo: 1,
  padding: 4,
  defaultTerm: 'Due Today',
};
