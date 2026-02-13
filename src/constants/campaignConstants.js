/**
 * Campaign-related constants
 */

export const CAMPAIGN_TYPES = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'seasonal', label: 'Seasonal' },
];

export const CAMPAIGN_RECIPIENT_TYPES = [
  { value: 'all', label: 'All Clients' },
  { value: 'byStatus', label: 'By Status' },
  { value: 'byTag', label: 'By Tag' },
  { value: 'custom', label: 'Custom Selection' },
  { value: 'bySegment', label: 'By Segment' },
];

export const CAMPAIGN_FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Draft', label: 'Drafts' },
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'Sent', label: 'Sent' },
];

export const CAMPAIGN_PLACEHOLDERS = [
  { token: '{{clientName}}', label: 'Client Name' },
  { token: '{{companyName}}', label: 'Company Name' },
  { token: '{{clientEmail}}', label: 'Client Email' },
];

export const CAMPAIGN_STATUSES = ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'];

export const initialCampaignState = {
  name: '',
  type: 'promotion',
  subject: '',
  body: '',
  recipientType: 'all',
  statusFilter: [],
  tagFilter: [],
  segmentFilter: [],
  customRecipientIds: [],
  recipientCount: 0,
  scheduledFor: '',
  status: 'Draft',
};
