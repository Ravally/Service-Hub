// Tool executor functions for Clamp Chat
// All Firestore operations scoped to users/{userId}

const admin = require('firebase-admin');

const db = admin.firestore();

/** Pad a number with leading zeros */
const padNumber = (n, width = 4) => String(n).padStart(width, '0');

/** Generate a sequential document number via transaction */
async function generateNumber(userId, field, prefix) {
  const settingsRef = db.doc(`users/${userId}/settings/invoiceSettings`);
  let number = '';
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef);
    const data = snap.exists ? snap.data() : {};
    const seq = data[field] || 1;
    const pad = data.padding ?? 4;
    number = `${prefix}-${padNumber(seq, pad)}`;
    tx.set(settingsRef, { [field]: seq + 1 }, { merge: true });
  });
  return number;
}

// ── Search Tools ──

async function searchClients(input, userId) {
  const query = (input.query || '').toLowerCase();
  const snap = await db.collection(`users/${userId}/clients`).get();
  const results = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => !c.archived)
    .filter(c => {
      if (!query) return true;
      if ((c.name || '').toLowerCase().includes(query)) return true;
      if ((c.email || '').toLowerCase().includes(query)) return true;
      if ((c.phone || '').includes(query)) return true;
      if ((c.address || '').toLowerCase().includes(query)) return true;
      const props = c.properties || [];
      return props.some(p =>
        (p.street1 || '').toLowerCase().includes(query) ||
        (p.city || '').toLowerCase().includes(query) ||
        (p.label || '').toLowerCase().includes(query)
      );
    })
    .slice(0, 10)
    .map(c => ({
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      address: c.address || '', status: c.status || 'Active',
    }));
  return results;
}

async function getClient(input, userId) {
  const snap = await db.doc(`users/${userId}/clients/${input.client_id}`).get();
  if (!snap.exists) return { error: 'Client not found' };
  const c = { id: snap.id, ...snap.data() };
  return {
    id: c.id, name: c.name, email: c.email, phone: c.phone,
    address: c.address, status: c.status || 'Active',
    properties: (c.properties || []).map(p => ({ uid: p.uid, label: p.label, street1: p.street1, city: p.city })),
  };
}

async function searchJobs(input, userId) {
  let ref = db.collection(`users/${userId}/jobs`);
  if (input.status) ref = ref.where('status', '==', input.status);
  if (input.client_id) ref = ref.where('clientId', '==', input.client_id);
  const snap = await ref.get();
  let jobs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(j => !j.archived);
  if (input.keyword) {
    const kw = input.keyword.toLowerCase();
    jobs = jobs.filter(j => (j.title || '').toLowerCase().includes(kw) || (j.jobNumber || '').toLowerCase().includes(kw));
  }
  if (input.date_from) {
    const from = new Date(input.date_from);
    jobs = jobs.filter(j => j.start && new Date(j.start) >= from);
  }
  if (input.date_to) {
    const to = new Date(input.date_to + 'T23:59:59');
    jobs = jobs.filter(j => j.start && new Date(j.start) <= to);
  }
  return jobs.slice(0, 15).map(j => ({
    id: j.id, jobNumber: j.jobNumber, title: j.title, status: j.status,
    clientId: j.clientId, start: j.start, end: j.end,
  }));
}

async function getJob(input, userId) {
  const snap = await db.doc(`users/${userId}/jobs/${input.job_id}`).get();
  if (!snap.exists) return { error: 'Job not found' };
  const j = { id: snap.id, ...snap.data() };
  return {
    id: j.id, jobNumber: j.jobNumber, title: j.title, status: j.status,
    clientId: j.clientId, start: j.start, end: j.end, notes: j.notes,
    assignees: j.assignees || [], lineItems: (j.lineItems || []).length,
  };
}

async function createJob(input, userId) {
  const jobNumber = await generateNumber(userId, 'nextJob', 'JOB');
  const now = new Date().toISOString();
  let start = null;
  if (input.scheduled_date) {
    const time = input.scheduled_time || '09:00';
    start = new Date(`${input.scheduled_date}T${time}:00`).toISOString();
  }
  const jobData = {
    jobNumber,
    title: input.title,
    clientId: input.client_id || '',
    quoteId: input.quote_id || '',
    status: start ? 'Scheduled' : 'Unscheduled',
    start,
    end: null,
    notes: input.notes || '',
    assignees: input.assigned_to ? [input.assigned_to] : [],
    jobType: 'one_off',
    schedule: 'One-time',
    billingFrequency: 'Upon job completion',
    lineItems: [],
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection(`users/${userId}/jobs`).add(jobData);
  return { id: ref.id, jobNumber, title: input.title, status: jobData.status };
}

async function updateJob(input, userId) {
  const ref = db.doc(`users/${userId}/jobs/${input.job_id}`);
  const snap = await ref.get();
  if (!snap.exists) return { error: 'Job not found' };
  const allowed = ['status', 'title', 'notes', 'start', 'end', 'assignees'];
  const updates = {};
  for (const [key, val] of Object.entries(input.updates || {})) {
    if (allowed.includes(key)) updates[key] = val;
  }
  updates.updatedAt = new Date().toISOString();
  await ref.update(updates);
  return { id: input.job_id, updated: true, fields: Object.keys(updates) };
}

async function searchQuotes(input, userId) {
  let ref = db.collection(`users/${userId}/quotes`);
  if (input.status) ref = ref.where('status', '==', input.status);
  if (input.client_id) ref = ref.where('clientId', '==', input.client_id);
  const snap = await ref.get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(q => !q.archived)
    .slice(0, 15)
    .map(q => ({ id: q.id, quoteNumber: q.quoteNumber, clientId: q.clientId, status: q.status, total: q.total }));
}

async function getQuote(input, userId) {
  const snap = await db.doc(`users/${userId}/quotes/${input.quote_id}`).get();
  if (!snap.exists) return { error: 'Quote not found' };
  const q = { id: snap.id, ...snap.data() };
  return {
    id: q.id, quoteNumber: q.quoteNumber, clientId: q.clientId, status: q.status,
    total: q.total, lineItems: q.lineItems || [], notes: q.clientMessage || q.internalNotes || '',
  };
}

async function createQuote(input, userId) {
  const quoteNumber = await generateNumber(userId, 'nextQu', 'QU');
  const now = new Date().toISOString();
  const lineItems = (input.line_items || []).map(li => ({
    type: 'line_item', name: li.description || '', description: li.description || '',
    qty: li.quantity || 1, price: li.unit_price || 0, unitCost: 0, isOptional: false,
  }));
  const quoteData = {
    quoteNumber,
    title: input.title || '',
    clientId: input.client_id,
    status: 'Draft',
    lineItems,
    taxRate: 0,
    quoteDiscountType: 'amount',
    quoteDiscountValue: 0,
    clientMessage: input.notes || '',
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection(`users/${userId}/quotes`).add(quoteData);
  return { id: ref.id, quoteNumber, title: input.title };
}

async function searchInvoices(input, userId) {
  let ref = db.collection(`users/${userId}/invoices`);
  if (input.status) ref = ref.where('status', '==', input.status);
  if (input.client_id) ref = ref.where('clientId', '==', input.client_id);
  const snap = await ref.get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(i => !i.archived)
    .slice(0, 15)
    .map(i => ({
      id: i.id, invoiceNumber: i.invoiceNumber, clientId: i.clientId,
      status: i.status, total: i.total, dueDate: i.dueDate,
    }));
}

async function createInvoice(input, userId) {
  const invoiceNumber = await generateNumber(userId, 'nextInvCn', 'INV');
  const now = new Date().toISOString();
  const lineItems = (input.line_items || []).map(li => ({
    type: 'line_item', name: li.description || '', description: li.description || '',
    qty: li.quantity || 1, price: li.unit_price || 0, unitCost: 0, isOptional: false,
  }));
  const invoiceData = {
    invoiceNumber,
    clientId: input.client_id,
    jobId: input.job_id || '',
    status: 'Draft',
    issueDate: now,
    dueDate: input.due_date || now,
    dueTerm: 'Due Today',
    lineItems,
    taxRate: 0,
    quoteDiscountType: 'amount',
    quoteDiscountValue: 0,
    depositApplied: 0,
    payments: [],
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection(`users/${userId}/invoices`).add(invoiceData);
  return { id: ref.id, invoiceNumber };
}

async function getTeamMembers(input, userId) {
  const snap = await db.collection(`users/${userId}/staff`).get();
  return snap.docs.map(d => {
    const s = d.data();
    return { id: d.id, name: s.name, role: s.role, color: s.color };
  });
}

async function getSchedule(input, userId) {
  const snap = await db.collection(`users/${userId}/jobs`).get();
  let jobs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(j => !j.archived && j.start);

  const dateStr = (input.date || '').toLowerCase();
  const now = new Date();
  let from, to;

  if (dateStr === 'today' || !dateStr) {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(from.getTime() + 86400000);
  } else if (dateStr === 'tomorrow') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    to = new Date(from.getTime() + 86400000);
  } else if (dateStr === 'this_week') {
    const day = now.getDay();
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    to = new Date(from.getTime() + 7 * 86400000);
  } else if (input.date_from && input.date_to) {
    from = new Date(input.date_from);
    to = new Date(input.date_to + 'T23:59:59');
  } else {
    from = new Date(dateStr);
    to = new Date(from.getTime() + 86400000);
  }

  jobs = jobs.filter(j => {
    const d = new Date(j.start);
    return d >= from && d < to;
  });

  if (input.team_member_id) {
    jobs = jobs.filter(j => (j.assignees || []).includes(input.team_member_id));
  }

  return jobs.slice(0, 20).map(j => ({
    id: j.id, jobNumber: j.jobNumber, title: j.title, status: j.status,
    start: j.start, end: j.end, assignees: j.assignees || [],
  }));
}

function navigateUser(input) {
  return { view: input.view, entityId: input.entity_id || null, entityType: input.entity_type || null };
}

// ── Tool Definitions for Claude API ──

const CLAMP_TOOLS = [
  {
    name: 'search_clients',
    description: 'Search for clients by name, email, phone, or address/suburb. Returns up to 10 matching clients.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term — client name, email, phone number, address, or suburb' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_client',
    description: 'Get full details of a specific client including properties.',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string', description: 'The client document ID' } },
      required: ['client_id'],
    },
  },
  {
    name: 'search_jobs',
    description: 'Search jobs by status, client, keyword, or date range.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Filter by client ID' },
        status: { type: 'string', description: 'Filter by status: Unscheduled, Scheduled, In Progress, Completed, Archived' },
        keyword: { type: 'string', description: 'Search in title or job number' },
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'get_job',
    description: 'Get full details of a specific job.',
    input_schema: {
      type: 'object',
      properties: { job_id: { type: 'string', description: 'The job document ID' } },
      required: ['job_id'],
    },
  },
  {
    name: 'create_job',
    description: 'Create a new job. Generates a sequential job number automatically.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Job title/description' },
        client_id: { type: 'string', description: 'Client ID to assign the job to' },
        scheduled_date: { type: 'string', description: 'Scheduled date (YYYY-MM-DD)' },
        scheduled_time: { type: 'string', description: 'Scheduled time (HH:MM, 24h format)' },
        assigned_to: { type: 'string', description: 'Staff member ID to assign' },
        notes: { type: 'string', description: 'Job notes' },
        quote_id: { type: 'string', description: 'Related quote ID if scheduling from a quote' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_job',
    description: 'Update fields on an existing job. Can change status, title, notes, start, end, or assignees.',
    input_schema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'The job ID to update' },
        updates: { type: 'object', description: 'Fields to update: status, title, notes, start, end, assignees' },
      },
      required: ['job_id', 'updates'],
    },
  },
  {
    name: 'search_quotes',
    description: 'Search quotes by status or client.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Filter by client ID' },
        status: { type: 'string', description: 'Filter: Draft, Sent, Awaiting Approval, Approved, Converted, Archived' },
      },
    },
  },
  {
    name: 'get_quote',
    description: 'Get full details of a specific quote including line items.',
    input_schema: {
      type: 'object',
      properties: { quote_id: { type: 'string', description: 'The quote ID' } },
      required: ['quote_id'],
    },
  },
  {
    name: 'create_quote',
    description: 'Create a new draft quote with optional line items.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client ID' },
        title: { type: 'string', description: 'Quote title' },
        line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
          },
          description: 'Line items for the quote',
        },
        notes: { type: 'string', description: 'Quote notes or client message' },
      },
      required: ['client_id', 'title'],
    },
  },
  {
    name: 'search_invoices',
    description: 'Search invoices by status or client.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Filter by client ID' },
        status: { type: 'string', description: 'Filter: Draft, Sent, Unpaid, Partially Paid, Paid, Overdue, Void, Archived' },
      },
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a new draft invoice with optional line items.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client ID' },
        job_id: { type: 'string', description: 'Related job ID' },
        line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
          },
        },
        due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_team_members',
    description: 'List all team members with their roles.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_schedule',
    description: 'Get scheduled jobs for a date or range. Use "today", "tomorrow", "this_week", or a YYYY-MM-DD date.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date keyword or YYYY-MM-DD' },
        date_from: { type: 'string', description: 'Range start (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Range end (YYYY-MM-DD)' },
        team_member_id: { type: 'string', description: 'Filter by team member ID' },
      },
    },
  },
  {
    name: 'navigate_user',
    description: 'Direct the user to a specific page in the app. Returns a navigation link the user can click.',
    input_schema: {
      type: 'object',
      properties: {
        view: { type: 'string', description: 'App view: dashboard, clients, jobs, schedule, quotes, invoices, settings, reports, expenses, timesheets' },
        entity_id: { type: 'string', description: 'Optional entity ID to highlight' },
        entity_type: { type: 'string', description: 'Entity type: client, job, quote, invoice' },
      },
      required: ['view'],
    },
  },
];

// ── Dispatcher ──

const EXECUTORS = {
  search_clients: searchClients,
  get_client: getClient,
  search_jobs: searchJobs,
  get_job: getJob,
  create_job: createJob,
  update_job: updateJob,
  search_quotes: searchQuotes,
  get_quote: getQuote,
  create_quote: createQuote,
  search_invoices: searchInvoices,
  create_invoice: createInvoice,
  get_team_members: getTeamMembers,
  get_schedule: getSchedule,
  navigate_user: navigateUser,
};

async function executeTool(toolName, input, userId) {
  const executor = EXECUTORS[toolName];
  if (!executor) return { error: `Unknown tool: ${toolName}` };
  if (toolName === 'navigate_user') return executor(input);
  return executor(input, userId);
}

module.exports = { CLAMP_TOOLS, executeTool };
