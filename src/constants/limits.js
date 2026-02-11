/**
 * Business rule limits and constraints
 */

export const MAX_LINE_ITEMS = 100;
export const MAX_PROPERTIES_PER_CLIENT = 50;
export const MAX_CONTACTS_PER_CLIENT = 20;
export const MAX_CUSTOM_FIELDS = 15;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_ATTACHMENTS = 10;

export const MIN_QUOTE_VALUE = 0;
export const MAX_QUOTE_VALUE = 1000000;
export const MIN_INVOICE_VALUE = 0;
export const MAX_INVOICE_VALUE = 1000000;

export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_PHONE_LENGTH = 20;
export const MAX_ADDRESS_LENGTH = 255;

export const PAGINATION_PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 300;
export const AUTO_SAVE_DEBOUNCE_MS = 1000;

export const MAX_DECIMAL_PLACES = 2;
export const MAX_PERCENTAGE = 100;
export const MIN_PERCENTAGE = 0;

export const SESSION_TIMEOUT_MS = 3600000;
export const TOKEN_REFRESH_INTERVAL_MS = 300000;
