/**
 * Date manipulation and range calculation utilities
 */

/**
 * Check if a date falls within a range
 * @param {string|Date} date - Date to check
 * @param {Date} start - Start of range
 * @param {Date} end - End of range
 * @returns {boolean} True if date is in range
 */
export function inRange(date, start, end) {
  if (!start || !end) return true;
  const d = new Date(date || 0);
  return d >= start && d <= end;
}

/**
 * Get date range for last N days
 * @param {number} n - Number of days
 * @returns {Object} Range with start and end dates
 */
export function lastNDays(n) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - n);
  return { start, end: now };
}

/**
 * Get date range for last 30 days excluding today
 * @returns {Object} Range with start and end dates
 */
export function last30ExcludingToday() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { start, end };
}

/**
 * Get date range for a month
 * @param {number} offset - Month offset from current (0=current, -1=last month, 1=next month)
 * @returns {Object} Range with start and end dates
 */
export function monthRange(offset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get date range for a year
 * @param {number} year - Year (e.g., 2024)
 * @returns {Object} Range with start and end dates
 */
export function yearRange(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get date range for a period
 * @param {string} period - Period identifier ('this_month', 'last_month', 'this_year', etc.)
 * @param {Object} customRange - Custom range for 'custom' period {start, end}
 * @returns {Object} Range with start and end dates
 */
export function periodRange(period, customRange = {}) {
  switch (period) {
    case 'this_month':
      return monthRange(0);
    case 'last_month':
      return monthRange(-1);
    case 'this_year':
      return yearRange(new Date().getFullYear());
    case 'last_year':
      return yearRange(new Date().getFullYear() - 1);
    case 'last_7_days':
      return lastNDays(7);
    case 'last_30_days':
      return lastNDays(30);
    case 'last_90_days':
      return lastNDays(90);
    case 'custom':
      return {
        start: customRange.start ? new Date(customRange.start) : null,
        end: customRange.end ? new Date(customRange.end) : null,
      };
    default:
      return { start: null, end: null };
  }
}

/**
 * Get the previous range for a given range (for comparison)
 * @param {Date} start - Start date of current range
 * @param {Date} end - End date of current range
 * @returns {Object} Previous range with start and end dates
 */
export function getPreviousRange(start, end) {
  const duration = end - start;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { start: prevStart, end: prevEnd };
}

/**
 * Get a human-readable label for a date range
 * @param {string} period - Period identifier
 * @param {Object} customRange - Custom range {start, end}
 * @returns {string} Human-readable label
 */
export function rangeLabel(period, customRange = {}) {
  switch (period) {
    case 'this_month':
      return 'This Month';
    case 'last_month':
      return 'Last Month';
    case 'this_year':
      return 'This Year';
    case 'last_year':
      return 'Last Year';
    case 'last_7_days':
      return 'Last 7 Days';
    case 'last_30_days':
      return 'Last 30 Days';
    case 'last_90_days':
      return 'Last 90 Days';
    case 'custom':
      if (customRange.start && customRange.end) {
        return `${new Date(customRange.start).toLocaleDateString()} - ${new Date(customRange.end).toLocaleDateString()}`;
      }
      return 'Custom Range';
    case 'all':
    default:
      return 'All Time';
  }
}

/**
 * Calculate days between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} Number of days
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a date is overdue
 * @param {string|Date} dueDate - Due date to check
 * @returns {boolean} True if overdue
 */
export function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/**
 * Add days to a date
 * @param {string|Date} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
