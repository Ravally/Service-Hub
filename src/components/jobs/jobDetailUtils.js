import { formatDate } from '../../utils';

export const toLocalInput = (iso) => {
  if (!iso) return '';
  const hasZone = iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso);
  if (!hasZone && iso.length >= 16) return iso.slice(0, 16);
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const formatAddress = (client, property) => {
  if (property) {
    return [
      property.label,
      property.street1,
      property.street2,
      [property.city, property.state, property.zip].filter(Boolean).join(' '),
      property.country,
    ].filter(Boolean);
  }
  if (client?.address) return [client.address];
  return ['No address on file'];
};

export const getPrimaryProperty = (client) => {
  if (!client?.properties || client.properties.length === 0) return null;
  return client.properties.find((p) => p.isPrimary) || client.properties[0];
};

export const getJobProperty = (job, client) => {
  if (job?.propertySnapshot) return job.propertySnapshot;
  const props = Array.isArray(client?.properties) ? client.properties : [];
  if (job?.propertyId) {
    const match = props.find((p, idx) => (p.uid || p.id || String(idx)) === job.propertyId);
    if (match) return match;
  }
  return getPrimaryProperty(client);
};

export const buildDetailRows = (job) => ([
  { label: 'Job type', value: job?.jobType || job?.type || (job?.isRecurring ? 'Recurring job' : 'One-off job') },
  { label: 'Started on', value: formatDate(job?.start || job?.createdAt) },
  { label: 'Ends on', value: formatDate(job?.end) },
  { label: 'Billing frequency', value: job?.billingFrequency || 'Upon job completion' },
  { label: 'Automatic payments', value: job?.automaticPayments ? 'Yes' : 'No' },
  { label: 'Schedule', value: job?.schedule || job?.recurrence?.frequency || (job?.isRecurring ? 'Recurring' : 'One-time') },
]);

export const groupVisits = (visits = []) => {
  if (!Array.isArray(visits) || visits.length === 0) return [];
  const now = new Date().toDateString();
  const sorted = [...visits].sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
  const groups = [];
  sorted.forEach((visit) => {
    const date = visit.start ? new Date(visit.start) : null;
    const label = date && date.toDateString() === now
      ? 'Today'
      : date
        ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : 'Unscheduled';
    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(visit);
  });
  return groups;
};
