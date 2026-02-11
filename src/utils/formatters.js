/**
 * Utility functions for formatting values (currency, dates, etc.)
 */

/**
 * Format a number as currency
 * @param {number} value - The numeric value to format
 * @param {string} code - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, code = 'USD') {
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

/**
 * Format an ISO date string to localized date
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleDateString();
}

/**
 * Format an ISO date string to localized date and time
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString();
}

/**
 * Convert ISO date string to date input value (YYYY-MM-DD)
 * @param {string} isoString - ISO date string
 * @returns {string} Date input value
 */
export function toDateInput(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 10);
}

/**
 * Convert date input value to ISO date string
 * @param {string} value - Date input value (YYYY-MM-DD)
 * @returns {string} ISO date string
 */
export function toIsoDate(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toISOString();
}

/**
 * Format a phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format a number with fixed decimal places
 * @param {number} value - The numeric value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 2) {
  const num = Number(value || 0);
  return num.toFixed(decimals);
}
