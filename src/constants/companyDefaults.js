/**
 * Default company settings and configurations
 */

export const initialCompanySettings = {
  name: '',
  email: '',
  phone: '',
  address: '',
  defaultGstRate: 15,

  // Quote display & terms
  quoteContractTerms: '',
  quoteDisclaimers: '',
  quoteClientViewSettings: {
    showQuantities: true,
    showUnitPrices: true,
    showLineItemTotals: true,
    showTotals: true,
  },
  quoteValidityDays: 30,
  quoteAutoFollowUpDays: 0,
  quoteDefaultNotes: '',

  // Invoice display & terms
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
  invoiceDefaultNotes: '',
  invoiceBankDetails: {
    bankName: '',
    accountName: '',
    accountNumber: '',
    sortCode: '',
    reference: '',
  },
  invoiceLateFee: {
    enabled: false,
    type: 'percent',
    amount: 0,
    graceDays: 7,
  },
  taxInclusive: false,

  // Branding
  brandColor: '#0EA5A0',
  pdfFooterText: '',
  pdfLayout: 'detailed',

  // Scheduling
  workingDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },
  workingHoursStart: '07:00',
  workingHoursEnd: '17:00',
  defaultAppointmentDuration: 60,
  bufferTimeBetweenJobs: 15,
  publicHolidayRegion: 'NZ',

  // Notifications & Reminders
  notifications: {
    overdueReminder: {
      enabled: false,
      daysAfterDue: [3, 7, 14],
    },
    appointmentReminder: {
      enabled: false,
      hoursBefore: 24,
    },
    quoteFollowUp: {
      enabled: false,
      daysAfterSend: 7,
    },
    preferEmail: true,
    preferInApp: true,
    preferSms: false,
  },

  // Integrations
  integrations: {
    stripe: { enabled: false, publishableKey: '' },
    xero: { enabled: false, connected: false },
    myob: { enabled: false, connected: false },
    googleCalendar: { enabled: false, connected: false },
    smsProvider: { provider: 'none', apiKey: '' },
  },

  // Client Portal
  clientPortal: {
    enabled: false,
    showInvoices: true,
    showQuotes: true,
    showJobStatus: true,
    showSchedule: false,
    allowOnlinePayments: true,
  },
};

export const DEFAULT_TAX_RATE = 15;
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';
export const DEFAULT_TIME_FORMAT = '12h';

export const PUBLIC_HOLIDAY_REGIONS = [
  { value: 'NZ', label: 'New Zealand' },
  { value: 'AU', label: 'Australia' },
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'none', label: 'None' },
];

export const PDF_LAYOUT_OPTIONS = [
  { value: 'detailed', label: 'Detailed', description: 'Full line items with descriptions' },
  { value: 'compact', label: 'Compact', description: 'Condensed single-line items' },
  { value: 'modern', label: 'Modern', description: 'Clean layout with brand accents' },
];
