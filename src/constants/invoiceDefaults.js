/**
 * Invoice, quote, and document numbering defaults
 */

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

export const PAYMENT_TERMS = [
  'Due on Receipt',
  'Due Today',
  'Net 7',
  'Net 14',
  'Net 15',
  'Net 30',
  'Net 60',
  'Net 90',
  '7 calendar days',
  '14 calendar days',
  '30 calendar days',
];

export const DISCOUNT_TYPES = [
  { value: 'amount', label: 'Fixed Amount' },
  { value: 'percent', label: 'Percentage' },
];

export const LINE_ITEM_TYPES = [
  { value: 'line_item', label: 'Line Item' },
  { value: 'text', label: 'Text Section' },
];
