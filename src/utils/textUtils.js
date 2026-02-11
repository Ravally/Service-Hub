/**
 * Text manipulation and formatting utilities
 */

/**
 * Rewrite text with a specific persona/style
 * @param {string} text - Original text
 * @param {string} persona - Persona style ('Cheerful', 'Casual', 'Professional', 'Shorter')
 * @returns {string} Rewritten text
 */
export function rewriteText(text, persona) {
  const base = (text || '').trim();
  if (!base) return base;

  switch (persona) {
    case 'Cheerful':
      return `Great news! ${base}`;
    case 'Casual':
      return `Just a quick note: ${base}`;
    case 'Professional':
      return `Please review the following: ${base}`;
    case 'Shorter':
      return base.slice(0, 120);
    default:
      return base;
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Convert text to title case
 * @param {string} text - Text to convert
 * @returns {string} Title cased text
 */
export function toTitleCase(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Pluralize a word based on count
 * @param {number} count - Count to check
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} Pluralized word
 */
export function pluralize(count, singular, plural) {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format a list of items into a readable string
 * @param {Array} items - Array of items
 * @param {string} conjunction - Conjunction word ('and', 'or')
 * @returns {string} Formatted list
 */
export function formatList(items, conjunction = 'and') {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Capitalize first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Generate a slug from text (URL-friendly)
 * @param {string} text - Text to slugify
 * @returns {string} Slug
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
