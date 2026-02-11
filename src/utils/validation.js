/**
 * Input validation utilities
 */

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {boolean} True if not empty
 */
export function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validate number is positive
 * @param {number} value - Number to validate
 * @returns {boolean} True if positive
 */
export function isPositive(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * Validate number is non-negative
 * @param {number} value - Number to validate
 * @returns {boolean} True if non-negative
 */
export function isNonNegative(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} True if within range
 */
export function isLengthValid(value, min = 0, max = Infinity) {
  if (!value) return min === 0;
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date is in the future
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if in future
 */
export function isFutureDate(date) {
  if (!date) return false;
  return new Date(date) > new Date();
}

/**
 * Validate date is in the past
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if in past
 */
export function isPastDate(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

/**
 * Validate percentage (0-100)
 * @param {number} value - Value to validate
 * @returns {boolean} True if valid percentage
 */
export function isValidPercentage(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 100;
}
