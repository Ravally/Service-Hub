/**
 * SMS Helper Utilities
 *
 * Provides functions to generate native SMS links (sms: protocol)
 * that open the user's default messaging app pre-filled with content.
 *
 * This approach:
 * - Works on all platforms (iOS, Android, Desktop)
 * - No cost (unlike Twilio)
 * - User has full control before sending
 * - Respects user's messaging preferences
 */

/**
 * Generate an SMS link that opens the user's messaging app
 *
 * @param {string} phoneNumber - Phone number to send to (e.g., "+1234567890")
 * @param {string} body - Pre-filled message body
 * @returns {string} SMS URL that can be used in href or window.location
 *
 * @example
 * const link = generateSMSLink("+15551234567", "Your quote is ready!");
 * // Returns: "sms:+15551234567?body=Your%20quote%20is%20ready%21"
 */
export function generateSMSLink(phoneNumber, body) {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Clean phone number (remove spaces, dashes, parentheses)
  const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');

  // Encode the message body for URL
  const encodedBody = encodeURIComponent(body || '');

  // iOS uses ';' separator, Android uses '?'. Both work on most devices.
  // Using '?' as it's more standard and works on both.
  return `sms:${cleanPhone}${body ? `?body=${encodedBody}` : ''}`;
}

/**
 * Generate SMS link for quote approval
 *
 * @param {string} phoneNumber - Client's phone number
 * @param {object} quote - Quote object
 * @param {object} company - Company settings
 * @returns {string} SMS URL with pre-filled quote message
 */
export function generateQuoteSMSLink(phoneNumber, quote, company) {
  const quoteNumber = quote.quoteNumber || quote.id?.substring(0, 8) || 'Quote';
  const companyName = company?.name || 'Us';
  const approvalLink = quote.approvalLink || `${window.location.origin}/?quoteToken=${quote.token}`;

  const message = `Hi! ${companyName} has sent you ${quoteNumber}. View and respond here: ${approvalLink}`;

  return generateSMSLink(phoneNumber, message);
}

/**
 * Generate SMS link for invoice payment
 *
 * @param {string} phoneNumber - Client's phone number
 * @param {object} invoice - Invoice object
 * @param {object} company - Company settings
 * @returns {string} SMS URL with pre-filled invoice message
 */
export function generateInvoiceSMSLink(phoneNumber, invoice, company) {
  const invoiceNumber = invoice.invoiceNumber || invoice.id?.substring(0, 8) || 'Invoice';
  const companyName = company?.name || 'Us';
  const total = invoice.total ? `$${invoice.total.toFixed(2)}` : 'amount due';
  const portalLink = `${window.location.origin}/?portalToken=${invoice.portalToken}`;

  const message = `Hi! ${companyName} has sent you ${invoiceNumber} for ${total}. View and pay here: ${portalLink}`;

  return generateSMSLink(phoneNumber, message);
}

/**
 * Generate SMS link for appointment reminder
 *
 * @param {string} phoneNumber - Client's phone number
 * @param {object} job - Job object
 * @param {object} company - Company settings
 * @returns {string} SMS URL with pre-filled appointment reminder
 */
export function generateAppointmentReminderSMSLink(phoneNumber, job, company) {
  const companyName = company?.name || 'Us';
  const jobTitle = job.title || 'your appointment';
  const dateTime = job.start ? new Date(job.start).toLocaleString() : 'soon';

  const message = `Reminder: ${companyName} has scheduled ${jobTitle} for ${dateTime}. Reply to confirm or call us if you need to reschedule.`;

  return generateSMSLink(phoneNumber, message);
}

/**
 * Generate SMS link for generic message
 *
 * @param {string} phoneNumber - Client's phone number
 * @param {string} message - Custom message
 * @returns {string} SMS URL with pre-filled message
 */
export function generateGenericSMSLink(phoneNumber, message) {
  return generateSMSLink(phoneNumber, message);
}

/**
 * Open SMS app with pre-filled message
 *
 * @param {string} phoneNumber - Phone number to send to
 * @param {string} body - Pre-filled message body
 *
 * @example
 * openSMSApp("+15551234567", "Your quote is ready!");
 */
export function openSMSApp(phoneNumber, body) {
  const link = generateSMSLink(phoneNumber, body);
  window.location.href = link;
}

/**
 * Format phone number for display
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Formatted phone number (e.g., "+1 (555) 123-4567")
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format based on length
  if (digits.length === 10) {
    // US number without country code
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    // US number with country code
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length > 11) {
    // International number
    const countryCode = digits.slice(0, digits.length - 10);
    const areaCode = digits.slice(digits.length - 10, digits.length - 7);
    const prefix = digits.slice(digits.length - 7, digits.length - 4);
    const line = digits.slice(digits.length - 4);
    return `+${countryCode} (${areaCode}) ${prefix}-${line}`;
  }

  // Return as-is if format unclear
  return phone;
}

/**
 * Validate phone number format
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export function isValidPhoneNumber(phone) {
  if (!phone) return false;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Valid if 10-15 digits (covers US and international)
  return digits.length >= 10 && digits.length <= 15;
}
