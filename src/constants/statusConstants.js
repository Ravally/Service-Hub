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
 * Status color mappings for consistent UI - Trellio Dark Mode
 */
export const STATUS_COLORS = {
  // Quote statuses
  Draft: 'bg-charcoal text-harvest-amber border border-harvest-amber/20',
  Sent: 'bg-charcoal text-blue-400 border border-blue-400/20',
  'Awaiting Approval': 'bg-charcoal text-harvest-amber border border-harvest-amber/30',
  Approved: 'bg-trellio-teal/10 text-trellio-teal border border-trellio-teal/30',
  Converted: 'bg-purple-500/10 text-purple-400 border border-purple-400/20',
  Archived: 'bg-charcoal text-slate-500 border border-slate-700/30',

  // Invoice statuses
  Unpaid: 'bg-charcoal text-harvest-amber border border-harvest-amber/30',
  'Partially Paid': 'bg-blue-500/10 text-blue-400 border border-blue-400/20',
  Paid: 'bg-trellio-teal/10 text-trellio-teal border border-trellio-teal/30',
  Overdue: 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30',
  Void: 'bg-charcoal text-slate-500 border border-slate-700/30',

  // Job statuses
  Unscheduled: 'bg-charcoal text-slate-400 border border-slate-700/30',
  Scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-400/20',
  'In Progress': 'bg-harvest-amber/10 text-harvest-amber border border-harvest-amber/30',
  Completed: 'bg-trellio-teal/10 text-trellio-teal border border-trellio-teal/30',

  // Client statuses
  Active: 'bg-trellio-teal/10 text-trellio-teal border border-trellio-teal/30',
  Inactive: 'bg-charcoal text-slate-500 border border-slate-700/30',
  Lead: 'bg-blue-500/10 text-blue-400 border border-blue-400/20',

  // Payment method statuses
  'Awaiting Payment: Past Due': 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30',
  'Awaiting Payment: Not Yet Due': 'bg-harvest-amber/10 text-harvest-amber border border-harvest-amber/30',
};
