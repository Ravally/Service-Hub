/**
 * Expense tracking constants
 */

export const EXPENSE_CATEGORIES = [
  { key: 'materials', label: 'Materials' },
  { key: 'labor', label: 'Labor' },
  { key: 'subcontractor', label: 'Subcontractor' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'travel', label: 'Travel' },
  { key: 'other', label: 'Other' },
];

export const initialExpenseState = {
  id: '',
  title: '',
  amount: 0,
  category: 'other',
  note: '',
  date: '',
};
