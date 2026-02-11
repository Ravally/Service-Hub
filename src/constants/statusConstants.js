/**
 * Status-related constants
 */

export const JOB_STATUSES = [
  'Unscheduled',
  'Scheduled',
  'In Progress',
  'Completed',
];

export const QUOTE_STATUSES = [
  'Draft',
  'Sent',
  'Awaiting Approval',
  'Approved',
  'Converted',
  'Archived',
];

export const INVOICE_STATUSES = [
  'Draft',
  'Sent',
  'Unpaid',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Void',
];

export const CLIENT_STATUSES = [
  'Active',
  'Inactive',
  'Lead',
];

/**
 * Status color mappings for consistent UI
 */
export const STATUS_COLORS = {
  // Quote statuses
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Sent: 'bg-blue-100 text-blue-700 border-blue-300',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Approved: 'bg-green-100 text-green-700 border-green-300',
  Converted: 'bg-purple-100 text-purple-700 border-purple-300',
  Archived: 'bg-gray-100 text-gray-500 border-gray-200',

  // Invoice statuses
  Unpaid: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Partially Paid': 'bg-blue-100 text-blue-700 border-blue-300',
  Paid: 'bg-green-100 text-green-700 border-green-300',
  Overdue: 'bg-red-100 text-red-700 border-red-300',
  Void: 'bg-gray-100 text-gray-500 border-gray-200',

  // Job statuses
  Unscheduled: 'bg-gray-100 text-gray-700 border-gray-300',
  Scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
  'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Completed: 'bg-green-100 text-green-700 border-green-300',

  // Client statuses
  Active: 'bg-green-100 text-green-700 border-green-300',
  Inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  Lead: 'bg-blue-100 text-blue-700 border-blue-300',

  // Payment method statuses
  'Awaiting Payment: Past Due': 'bg-red-100 text-red-700 border-red-300',
  'Awaiting Payment: Not Yet Due': 'bg-yellow-100 text-yellow-700 border-yellow-300',
};
