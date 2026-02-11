/**
 * Default company settings and configurations
 */

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

export const DEFAULT_TAX_RATE = 15;
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';
export const DEFAULT_TIME_FORMAT = '12h';
