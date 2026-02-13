/**
 * Role definitions and permission constants for Scaffld
 *
 * Role hierarchy (highest to lowest): admin > manager > tech > viewer
 * The 'member' role is a legacy alias, treated as 'viewer'.
 *
 * Note: Staff members (users/{userId}/staff) have their own role field
 * for scheduling/assignment purposes. User profile role drives permissions.
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECH: 'tech',
  VIEWER: 'viewer',
  MEMBER: 'member',
};

export const ROLE_HIERARCHY = ['admin', 'manager', 'tech', 'viewer', 'member'];

export const ROLE_PERMISSIONS = {
  // Navigation access
  'nav.dashboard':   ['admin', 'manager', 'tech', 'viewer'],
  'nav.schedule':    ['admin', 'manager', 'tech'],
  'nav.clients':     ['admin', 'manager', 'tech', 'viewer'],
  'nav.requests':    ['admin', 'manager'],
  'nav.quotes':      ['admin', 'manager'],
  'nav.jobs':        ['admin', 'manager', 'tech'],
  'nav.bookings':    ['admin', 'manager'],
  'nav.invoices':    ['admin', 'manager'],
  'nav.reviews':     ['admin', 'manager'],
  'nav.campaigns':   ['admin', 'manager'],
  'nav.reports':     ['admin', 'manager'],
  'nav.expenses':    ['admin', 'manager'],
  'nav.timesheets':  ['admin', 'manager', 'tech'],
  'nav.apps':        ['admin'],
  'nav.settings':    ['admin'],

  // Create actions
  'create.client':   ['admin', 'manager'],
  'create.request':  ['admin', 'manager', 'tech'],
  'create.quote':    ['admin', 'manager'],
  'create.job':      ['admin', 'manager'],
  'create.invoice':  ['admin', 'manager'],

  // Edit actions
  'edit.quote':          ['admin', 'manager'],
  'edit.invoice':        ['admin', 'manager'],
  'edit.job.lineItems':  ['admin', 'manager'],
  'edit.job.status':     ['admin', 'manager'],

  // Job attachments
  'job.uploadAttachment': ['admin', 'manager', 'tech'],
  'job.removeAttachment': ['admin', 'manager'],

  // Batch operations
  'bulk.quote':   ['admin', 'manager'],
  'bulk.invoice': ['admin', 'manager'],
  'bulk.client':  ['admin', 'manager'],
  'bulk.job':     ['admin', 'manager'],

  // Admin
  'settings.all':    ['admin'],
  'team.invite':     ['admin'],
};
