// src/components/JobDetailView.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeftIcon, EditIcon, MapPinIcon, PhoneIcon, AtSignIcon, DollarSignIcon } from './icons';
import { formatCurrency, formatDate, formatDateTime } from '../utils';
import { STATUS_COLORS } from '../constants';
import ClockInOut from './timesheets/ClockInOut';

const toLocalInput = (iso) => {
  if (!iso) return '';
  const hasZone = iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso);
  if (!hasZone && iso.length >= 16) return iso.slice(0, 16);
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatAddress = (client, property) => {
  if (property) {
    const parts = [
      property.label,
      property.street1,
      property.street2,
      [property.city, property.state, property.zip].filter(Boolean).join(' '),
      property.country,
    ].filter(Boolean);
    return parts;
  }
  if (client?.address) return [client.address];
  return ['No address on file'];
};

const getPrimaryProperty = (client) => {
  if (!client?.properties || client.properties.length === 0) return null;
  return client.properties.find((p) => p.isPrimary) || client.properties[0];
};

const getJobProperty = (job, client) => {
  if (job?.propertySnapshot) return job.propertySnapshot;
  const props = Array.isArray(client?.properties) ? client.properties : [];
  if (job?.propertyId) {
    const match = props.find((p, idx) => (p.uid || p.id || String(idx)) === job.propertyId);
    if (match) return match;
  }
  return getPrimaryProperty(client);
};

const buildDetailRows = (job) => ([
  { label: 'Job type', value: job?.jobType || job?.type || (job?.isRecurring ? 'Recurring job' : 'One-off job') },
  { label: 'Started on', value: formatDate(job?.start || job?.createdAt) },
  { label: 'Ends on', value: formatDate(job?.end) },
  { label: 'Billing frequency', value: job?.billingFrequency || 'Upon job completion' },
  { label: 'Automatic payments', value: job?.automaticPayments ? 'Yes' : 'No' },
  { label: 'Schedule', value: job?.schedule || job?.recurrence?.frequency || (job?.isRecurring ? 'Recurring' : 'One-time') },
]);

const groupVisits = (visits = []) => {
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

export default function JobDetailView({
  job,
  client,
  quote,
  invoices = [],
  visits,
  onBack,
  onUpdate,
  getClientNameById,
  statusColors,
  staff = [],
  onOpenClient,
  onUploadAttachment,
  onRemoveAttachment,
  onCreateInvoice,
  onOpenQuote,
  backLabel = 'Back to schedule',
  userRole,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...job });
  const [notes, setNotes] = useState(job.notes || '');
  const [checklistItem, setChecklistItem] = useState('');
  const [billingTab, setBillingTab] = useState('billing');
  const [showProfit, setShowProfit] = useState(true);
  const [showLineItemForm, setShowLineItemForm] = useState(false);
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showChemicalForm, setShowChemicalForm] = useState(false);
  const [lineItemDraft, setLineItemDraft] = useState({ description: '', qty: 1, price: 0, unitCost: 0, note: '' });
  const [laborDraft, setLaborDraft] = useState({ staffId: '', start: '', end: '', hours: '', cost: '', note: '' });
  const [expenseDraft, setExpenseDraft] = useState({ title: '', amount: '', note: '', date: '' });
  const [visitDraft, setVisitDraft] = useState({ start: '', end: '', assignees: [], notes: '' });
  const [reminderDraft, setReminderDraft] = useState({ name: '', rule: '', nextDate: '' });
  const [chemicalDraft, setChemicalDraft] = useState({ date: '', name: '', notes: '' });

  useEffect(() => {
    setEditData({ ...job });
    setNotes(job.notes || '');
    setShowLineItemForm(false);
    setShowLaborForm(false);
    setShowExpenseForm(false);
    setShowVisitForm(false);
    setShowReminderForm(false);
    setShowChemicalForm(false);
    setLineItemDraft({ description: '', qty: 1, price: 0, unitCost: 0, note: '' });
    setLaborDraft({ staffId: '', start: '', end: '', hours: '', cost: '', note: '' });
    setExpenseDraft({ title: '', amount: '', note: '', date: '' });
    setVisitDraft({ start: '', end: '', assignees: [], notes: '' });
    setReminderDraft({ name: '', rule: '', nextDate: '' });
    setChemicalDraft({ date: '', name: '', notes: '' });
  }, [job]);

  const staffMap = useMemo(() => Object.fromEntries((staff || []).map((s) => [s.id, s])), [staff]);
  const clientName = client?.name || getClientNameById?.(job.clientId) || 'Unknown Client';
  const primaryProperty = getJobProperty(job, client);
  const addressLines = formatAddress(client, primaryProperty);
  const contactPhone = client?.phone || client?.phones?.[0]?.number || 'No phone';
  const contactEmail = client?.email || client?.emails?.[0]?.address || 'No email';
  const detailRows = buildDetailRows(job);

  const lineItems = useMemo(() => {
    if (Array.isArray(job?.lineItems) && job.lineItems.length) return job.lineItems;
    if (Array.isArray(quote?.lineItems) && quote.lineItems.length) return quote.lineItems;
    return [];
  }, [job, quote]);

  const laborEntries = useMemo(() => (
    job?.laborEntries || job?.labor || job?.timeEntries || []
  ), [job]);

  const expenseEntries = useMemo(() => (
    job?.expenses || []
  ), [job]);

  const billingReminders = useMemo(() => (
    job?.billingReminders || []
  ), [job]);

  const chemicalTreatments = useMemo(() => (
    job?.chemicalTreatments || []
  ), [job]);

  const profitability = useMemo(() => {
    const totalPrice = lineItems.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.price || 0)), 0);
    const lineItemCost = lineItems.reduce((s, it) => {
      const unitCost = Number(it.unitCost || it.cost || 0);
      const qty = Number(it.qty || 0);
      return s + (unitCost * (qty || 1));
    }, 0);
    const laborCost = laborEntries.reduce((s, it) => s + Number(it.cost || it.amount || 0), 0);
    const expenseCost = expenseEntries.reduce((s, it) => s + Number(it.amount || it.cost || 0), 0);
    const profit = totalPrice - lineItemCost - laborCost - expenseCost;
    const margin = totalPrice ? (profit / totalPrice) * 100 : 0;
    return {
      totalPrice,
      lineItemCost,
      laborCost,
      expenseCost,
      profit,
      margin,
    };
  }, [lineItems, laborEntries, expenseEntries]);

  const profitRingPct = Math.max(0, Math.min(100, Math.round(profitability.margin)));
  const ringStyle = {
    background: `conic-gradient(#16a34a ${profitRingPct}%, #e2e8f0 0)`,
  };

  const visitGroups = useMemo(() => {
    const data = Array.isArray(visits) ? visits : (job?.visits || []);
    return groupVisits(data);
  }, [visits, job]);

  const jobInvoices = useMemo(() => (
    (invoices || []).filter((inv) => inv.jobId === job.id)
  ), [invoices, job]);

  const handleSaveDetails = () => {
    onUpdate(job.id, editData);
    setIsEditing(false);
  };

  const handleSaveNotes = () => onUpdate(job.id, { notes });

  const handleAddChecklistItem = (e) => {
    e.preventDefault();
    if (!checklistItem.trim()) return;
    const newChecklist = [...(job.checklist || []), { text: checklistItem, completed: false }];
    onUpdate(job.id, { checklist: newChecklist });
    setChecklistItem('');
  };

  const handleToggleChecklistItem = (index) => {
    const newChecklist = [...(job.checklist || [])];
    newChecklist[index].completed = !newChecklist[index].completed;
    onUpdate(job.id, { checklist: newChecklist });
  };

  const handleAddLineItem = () => {
    if (!canEditLineItems) return;
    if (!lineItemDraft.description) return;
    const base = Array.isArray(job?.lineItems) && job.lineItems.length ? job.lineItems : lineItems;
    const next = [
      ...base,
      {
        description: lineItemDraft.description,
        qty: Number(lineItemDraft.qty || 0),
        price: Number(lineItemDraft.price || 0),
        unitCost: Number(lineItemDraft.unitCost || 0),
        note: lineItemDraft.note || '',
      },
    ];
    onUpdate(job.id, { lineItems: next });
    setLineItemDraft({ description: '', qty: 1, price: 0, unitCost: 0, note: '' });
    setShowLineItemForm(false);
  };

  const handleAddLaborEntry = () => {
    if (!laborDraft.staffId && !laborDraft.note) return;
    const next = [
      ...(job?.laborEntries || []),
      {
        id: `labor_${Date.now()}`,
        staffId: laborDraft.staffId || '',
        start: laborDraft.start || '',
        end: laborDraft.end || '',
        hours: laborDraft.hours || '',
        cost: Number(laborDraft.cost || 0),
        note: laborDraft.note || '',
      },
    ];
    onUpdate(job.id, { laborEntries: next });
    setLaborDraft({ staffId: '', start: '', end: '', hours: '', cost: '', note: '' });
    setShowLaborForm(false);
  };

  const handleAddExpense = () => {
    if (!expenseDraft.title && !expenseDraft.amount) return;
    const next = [
      ...(job?.expenses || []),
      {
        id: `expense_${Date.now()}`,
        title: expenseDraft.title || 'Expense',
        amount: Number(expenseDraft.amount || 0),
        note: expenseDraft.note || '',
        date: expenseDraft.date || '',
      },
    ];
    onUpdate(job.id, { expenses: next });
    setExpenseDraft({ title: '', amount: '', note: '', date: '' });
    setShowExpenseForm(false);
  };

  const handleAddVisit = () => {
    if (!visitDraft.start) return;
    const next = [
      ...(job?.visits || []),
      {
        id: `visit_${Date.now()}`,
        start: visitDraft.start,
        end: visitDraft.end || '',
        assignees: visitDraft.assignees || [],
        notes: visitDraft.notes || '',
        status: 'Scheduled',
      },
    ];
    onUpdate(job.id, { visits: next });
    setVisitDraft({ start: '', end: '', assignees: [], notes: '' });
    setShowVisitForm(false);
  };

  const handleToggleVisitComplete = (visitId, visitStart) => {
    const next = (job?.visits || []).map((v) => {
      if (visitId) {
        if (v.id !== visitId) return v;
      } else if (visitStart) {
        if (v.start !== visitStart) return v;
      } else {
        return v;
      }
      const nextStatus = v.status === 'Completed' ? 'Scheduled' : 'Completed';
      return { ...v, status: nextStatus };
    });
    onUpdate(job.id, { visits: next });
  };

  const handleAddReminder = () => {
    if (!reminderDraft.name && !reminderDraft.rule) return;
    const next = [
      ...(job?.billingReminders || []),
      {
        id: `reminder_${Date.now()}`,
        name: reminderDraft.name || 'Reminder',
        rule: reminderDraft.rule || '',
        nextDate: reminderDraft.nextDate || '',
      },
    ];
    onUpdate(job.id, { billingReminders: next });
    setReminderDraft({ name: '', rule: '', nextDate: '' });
    setShowReminderForm(false);
  };

  const handleAddChemical = () => {
    if (!chemicalDraft.name) return;
    const next = [
      ...(job?.chemicalTreatments || []),
      {
        id: `chem_${Date.now()}`,
        date: chemicalDraft.date || '',
        name: chemicalDraft.name,
        notes: chemicalDraft.notes || '',
      },
    ];
    onUpdate(job.id, { chemicalTreatments: next });
    setChemicalDraft({ date: '', name: '', notes: '' });
    setShowChemicalForm(false);
  };

  const jobStatusClass = statusColors?.[job.status] || STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-700';
  const isToday = job?.start && new Date(job.start).toDateString() === new Date().toDateString();
  const canEditLineItems = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800">
          <ChevronLeftIcon />
          {backLabel}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {onCreateInvoice && (
            <button
              onClick={() => onCreateInvoice(job)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 inline-flex items-center gap-2"
            >
              <DollarSignIcon className="h-4 w-4" />
              Generate Invoice
            </button>
          )}
          <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
            Text Booking Confirmation
          </button>
          <button
            onClick={() => setIsEditing((v) => !v)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2"><EditIcon /> {isEditing ? 'Cancel Edit' : 'Edit'}</span>
          </button>
          <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50">
            More Actions
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isToday && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Today</span>}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${jobStatusClass}`}>{job.status}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{clientName}</h1>
              {onOpenClient && (
                <button onClick={() => onOpenClient(job.clientId)} className="text-green-700 text-lg font-semibold hover:text-green-800">Link</button>
              )}
            </div>
            {job.title && <p className="text-sm text-gray-500 mt-1">{job.title}</p>}
          </div>
          <div className="text-sm font-semibold text-gray-700">Job {job.jobNumber || `#${(job.id || '').substring(0, 6)}`}</div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Property address</h3>
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center text-green-700 bg-green-50">
                  <MapPinIcon />
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  {addressLines.map((line, idx) => <div key={idx}>{line}</div>)}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact details</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2"><PhoneIcon /> <span>{contactPhone}</span></div>
                <div className="flex items-center gap-2"><AtSignIcon /> <span className="text-green-700">{contactEmail}</span></div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Job details</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {detailRows.map((row, idx) => (
                <div key={row.label} className={`flex items-center justify-between px-4 py-2 text-sm ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-semibold text-gray-800">{row.value || 'Not set'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start time</label>
                <input
                  type="datetime-local"
                  value={toLocalInput(editData.start)}
                  onChange={(e) => setEditData({ ...editData, start: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End time</label>
                <input
                  type="datetime-local"
                  value={toLocalInput(editData.end)}
                  onChange={(e) => setEditData({ ...editData, end: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignees</label>
                <div className="flex flex-wrap gap-2">
                  {staff.length === 0 && <span className="text-sm text-gray-500">No staff yet.</span>}
                  {staff.map((s) => (
                    <label key={s.id} className="inline-flex items-center text-sm bg-gray-50 px-2 py-1 rounded-md border">
                      <input
                        type="checkbox"
                        checked={(editData.assignees || []).includes(s.id)}
                        onChange={() => {
                          const set = new Set(editData.assignees || []);
                          set.has(s.id) ? set.delete(s.id) : set.add(s.id);
                          setEditData({ ...editData, assignees: Array.from(set) });
                        }}
                        className="mr-2"
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={handleSaveDetails} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-5">
        <button
          onClick={() => setShowProfit((v) => !v)}
          className="text-sm font-semibold text-gray-700"
        >
          {showProfit ? 'Hide Profitability' : 'Show Profitability'}
        </button>
        {showProfit && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_2fr_auto] gap-6 items-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{profitability.margin.toFixed(2)}%</div>
              <div className="text-sm text-gray-600">Profit margin</div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-gray-700">
              <div>
                <div className="text-xs uppercase text-gray-500">Total price</div>
                <div className="font-semibold">{formatCurrency(profitability.totalPrice)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Line item cost</div>
                <div className="font-semibold">-{formatCurrency(profitability.lineItemCost)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Labour</div>
                <div className="font-semibold">-{formatCurrency(profitability.laborCost)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Expenses</div>
                <div className="font-semibold">-{formatCurrency(profitability.expenseCost)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Profit</div>
                <div className="font-semibold">{formatCurrency(profitability.profit)}</div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="relative h-12 w-12 rounded-full" style={ringStyle}>
                <div className="absolute inset-2 bg-amber-50/80 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Line Items</h3>
            {quote?.quoteNumber && (
              <div className="text-xs text-gray-500 mt-1">
                From{" "}
                {onOpenQuote ? (
                  <button
                    onClick={() => onOpenQuote(quote)}
                    className="text-green-700 font-semibold hover:underline"
                  >
                    {quote.quoteNumber}
                  </button>
                ) : (
                  <span className="text-gray-700 font-semibold">{quote.quoteNumber}</span>
                )}
              </div>
            )}
          </div>
          {canEditLineItems && (
            <button
              onClick={() => setShowLineItemForm((v) => !v)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              {showLineItemForm ? 'Cancel' : 'New Line Item'}
            </button>
          )}
        </div>
        {showLineItemForm && canEditLineItems && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <input
              value={lineItemDraft.description}
              onChange={(e) => setLineItemDraft({ ...lineItemDraft, description: e.target.value })}
              placeholder="Description"
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              value={lineItemDraft.qty}
              onChange={(e) => setLineItemDraft({ ...lineItemDraft, qty: e.target.value })}
              placeholder="Qty"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              value={lineItemDraft.price}
              onChange={(e) => setLineItemDraft({ ...lineItemDraft, price: e.target.value })}
              placeholder="Price"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              value={lineItemDraft.unitCost}
              onChange={(e) => setLineItemDraft({ ...lineItemDraft, unitCost: e.target.value })}
              placeholder="Unit cost"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={lineItemDraft.note}
              onChange={(e) => setLineItemDraft({ ...lineItemDraft, note: e.target.value })}
              placeholder="Notes"
              className="md:col-span-3 px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleAddLineItem}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
              >
                Add Line Item
              </button>
            </div>
          </div>
        )}
        {lineItems.length === 0 ? (
          <div className="text-sm text-gray-500">No line items yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Product / Service</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={`${item.description}-${idx}`} className="border-b last:border-b-0">
                  <td className="py-3">
                    <div className="font-semibold text-green-700">{item.description || 'Line item'}</div>
                    {item.note && <div className="text-xs text-gray-500">{item.note}</div>}
                  </td>
                  <td className="py-3 text-right">{item.qty || 0}</td>
                  <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency((Number(item.qty || 0) * Number(item.price || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 text-right font-semibold text-gray-900">{formatCurrency(profitability.totalPrice)}</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Labour</h3>
          <button
            onClick={() => setShowLaborForm((v) => !v)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {showLaborForm ? 'Cancel' : 'Manual Time Entry'}
          </button>
        </div>

        {/* Quick Clock In/Out */}
        {job && staff && staff.length > 0 && (
          <div className="mb-6">
            <ClockInOut job={job} staff={staff} />
          </div>
        )}

        {showLaborForm && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
            <select
              value={laborDraft.staffId}
              onChange={(e) => setLaborDraft({ ...laborDraft, staffId: e.target.value })}
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select team member</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="datetime-local"
              value={toLocalInput(laborDraft.start)}
              onChange={(e) => setLaborDraft({ ...laborDraft, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="datetime-local"
              value={toLocalInput(laborDraft.end)}
              onChange={(e) => setLaborDraft({ ...laborDraft, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              value={laborDraft.hours}
              onChange={(e) => setLaborDraft({ ...laborDraft, hours: e.target.value })}
              placeholder="Hours"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              value={laborDraft.cost}
              onChange={(e) => setLaborDraft({ ...laborDraft, cost: e.target.value })}
              placeholder="Cost"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={laborDraft.note}
              onChange={(e) => setLaborDraft({ ...laborDraft, note: e.target.value })}
              placeholder="Notes"
              className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleAddLaborEntry}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
              >
                Add Time Entry
              </button>
            </div>
          </div>
        )}
        {laborEntries.length === 0 ? (
          <div className="text-sm text-gray-500">No labour entries yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Team</th>
                <th className="text-left py-2">Notes</th>
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Hours</th>
                <th className="text-right py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {laborEntries.map((entry, idx) => (
                <tr key={`${entry.id || idx}`} className="border-b last:border-b-0">
                  <td className="py-3 font-semibold text-gray-700">{staffMap[entry.staffId]?.name || entry.name || 'Team member'}</td>
                  <td className="py-3 text-gray-600">{entry.note || '-'}</td>
                  <td className="py-3 text-gray-600">{formatDateTime(entry.start)}</td>
                  <td className="py-3 text-right text-gray-700">{entry.hours || '-'}</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(entry.cost || entry.amount || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Expenses</h3>
          <button
            onClick={() => setShowExpenseForm((v) => !v)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {showExpenseForm ? 'Cancel' : 'New Expense'}
          </button>
        </div>
        {showExpenseForm && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <input
              value={expenseDraft.title}
              onChange={(e) => setExpenseDraft({ ...expenseDraft, title: e.target.value })}
              placeholder="Expense title"
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              value={expenseDraft.amount}
              onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: e.target.value })}
              placeholder="Amount"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="date"
              value={expenseDraft.date}
              onChange={(e) => setExpenseDraft({ ...expenseDraft, date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={expenseDraft.note}
              onChange={(e) => setExpenseDraft({ ...expenseDraft, note: e.target.value })}
              placeholder="Notes"
              className="md:col-span-3 px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleAddExpense}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
              >
                Add Expense
              </button>
            </div>
          </div>
        )}
        {expenseEntries.length === 0 ? (
          <div className="text-sm text-gray-500">Get an accurate picture of job costs by recording expenses.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {expenseEntries.map((expense, idx) => (
              <div key={`${expense.id || idx}`} className="flex items-center justify-between border-b pb-2">
                <div>
                  <div className="font-semibold text-gray-800">{expense.title || 'Expense'}</div>
                  <div className="text-xs text-gray-500">{expense.note || ''}</div>
                </div>
                <div className="font-semibold text-gray-900">{formatCurrency(expense.amount || expense.cost || 0)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Visits</h3>
          <button
            onClick={() => setShowVisitForm((v) => !v)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {showVisitForm ? 'Cancel' : 'New Visit'}
          </button>
        </div>
        {showVisitForm && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
            <input
              type="datetime-local"
              value={toLocalInput(visitDraft.start)}
              onChange={(e) => setVisitDraft({ ...visitDraft, start: e.target.value })}
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="datetime-local"
              value={toLocalInput(visitDraft.end)}
              onChange={(e) => setVisitDraft({ ...visitDraft, end: e.target.value })}
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="md:col-span-2 border border-gray-200 rounded-md p-2">
              <div className="text-xs text-gray-500 mb-2">Assignees</div>
              <div className="flex flex-wrap gap-2">
                {staff.map((s) => (
                  <label key={s.id} className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={visitDraft.assignees.includes(s.id)}
                      onChange={() => {
                        setVisitDraft((prev) => {
                          const set = new Set(prev.assignees);
                          set.has(s.id) ? set.delete(s.id) : set.add(s.id);
                          return { ...prev, assignees: Array.from(set) };
                        });
                      }}
                    />
                    {s.name}
                  </label>
                ))}
                {staff.length === 0 && <span className="text-xs text-gray-500">No staff available.</span>}
              </div>
            </div>
            <input
              value={visitDraft.notes}
              onChange={(e) => setVisitDraft({ ...visitDraft, notes: e.target.value })}
              placeholder="Visit notes"
              className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleAddVisit}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
              >
                Add Visit
              </button>
            </div>
          </div>
        )}
        {visitGroups.length === 0 ? (
          <div className="text-sm text-gray-500">No visits scheduled yet.</div>
        ) : (
          <div className="space-y-4">
            {visitGroups.map((group) => (
              <div key={group.label}>
                <div className="text-sm font-semibold text-green-700 mb-2">{group.label}</div>
                <div className="divide-y border border-gray-200 rounded-lg">
                  {group.items.map((visit) => {
                    const assignedIds = visit.assignees || job.assignees || [];
                    const assignedNames = assignedIds.map((id) => staffMap[id]?.name).filter(Boolean);
                    return (
                      <div key={visit.id || visit.start} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={visit.status === 'Completed'}
                            onChange={() => handleToggleVisitComplete(visit.id, visit.start)}
                          />
                          <div className="font-semibold text-gray-900">{formatDateTime(visit.start)}</div>
                        </div>
                        <div className="text-gray-600">{assignedNames.length ? `Assigned to ${assignedNames.join(', ')}` : 'Unassigned'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <h3 className="text-xl font-semibold text-gray-900">Billing</h3>
            <div className="flex items-center gap-4 text-sm font-semibold">
              <button
                className={`${billingTab === 'billing' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500'} pb-1`}
                onClick={() => setBillingTab('billing')}
              >
                Billing
              </button>
              <button
                className={`${billingTab === 'reminders' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500'} pb-1`}
                onClick={() => setBillingTab('reminders')}
              >
                Invoicing Reminders
              </button>
            </div>
          </div>
          {billingTab === 'billing' ? (
            <button
              onClick={() => onCreateInvoice && onCreateInvoice(job)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              New Invoice
            </button>
          ) : (
            <button
              onClick={() => setShowReminderForm((v) => !v)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              {showReminderForm ? 'Cancel' : 'New Reminder'}
            </button>
          )}
        </div>

        {billingTab === 'reminders' ? (
          <>
            {showReminderForm && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <input
                  value={reminderDraft.name}
                  onChange={(e) => setReminderDraft({ ...reminderDraft, name: e.target.value })}
                  placeholder="Reminder name"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  value={reminderDraft.rule}
                  onChange={(e) => setReminderDraft({ ...reminderDraft, rule: e.target.value })}
                  placeholder="Rule (e.g., every 2 visits)"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="date"
                  value={reminderDraft.nextDate}
                  onChange={(e) => setReminderDraft({ ...reminderDraft, nextDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddReminder}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
                  >
                    Add Reminder
                  </button>
                </div>
              </div>
            )}
            {billingReminders.length === 0 ? (
              <div className="text-sm text-gray-500">
                No invoice reminders yet. Add reminders to keep billing on track.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {billingReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-semibold text-gray-800">{reminder.name || 'Reminder'}</div>
                      <div className="text-xs text-gray-500">{reminder.rule || ''}</div>
                    </div>
                    <div className="text-sm text-gray-600">{reminder.nextDate ? formatDate(reminder.nextDate) : 'Not scheduled'}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {jobInvoices.length === 0 ? (
              <div className="text-sm text-gray-500">
                No invoices or reminders. Add a new invoice or reminder to start billing.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b">
                  <tr>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Type and number</th>
                    <th className="text-left py-2">Subject</th>
                    <th className="text-left py-2">Last issued</th>
                    <th className="text-left py-2">Due date</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {jobInvoices.map((inv) => {
                    const paidSoFar = Array.isArray(inv.payments)
                      ? inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
                      : 0;
                    const balance = inv.status === 'Paid'
                      ? 0
                      : Math.max(0, (inv.total || 0) - paidSoFar);
                    return (
                      <tr key={inv.id} className="border-b last:border-b-0">
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors?.[inv.status] || STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-gray-800">{inv.invoiceNumber || inv.id}</td>
                        <td className="py-3 text-gray-600">{inv.subject || 'For Services Rendered'}</td>
                        <td className="py-3 text-gray-600">{formatDate(inv.issueDate || inv.createdAt)}</td>
                        <td className="py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(inv.total || 0)}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Chemical tracking</h3>
          <button
            onClick={() => setShowChemicalForm((v) => !v)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {showChemicalForm ? 'Cancel' : 'Record Treatment'}
          </button>
        </div>
        {showChemicalForm && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <input
              type="date"
              value={chemicalDraft.date}
              onChange={(e) => setChemicalDraft({ ...chemicalDraft, date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={chemicalDraft.name}
              onChange={(e) => setChemicalDraft({ ...chemicalDraft, name: e.target.value })}
              placeholder="Chemical name"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={chemicalDraft.notes}
              onChange={(e) => setChemicalDraft({ ...chemicalDraft, notes: e.target.value })}
              placeholder="Notes"
              className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={handleAddChemical}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
              >
                Add Treatment
              </button>
            </div>
          </div>
        )}
        {chemicalTreatments.length > 0 ? (
          <div className="space-y-2 text-sm">
            {chemicalTreatments.map((t, idx) => (
              <div key={`${t.date || idx}`} className="flex items-center justify-between border-b pb-2">
                <div className="text-gray-700">{formatDate(t.date)}</div>
                <div className="font-semibold text-gray-900">{t.name || 'Treatment'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No chemical treatments recorded yet.</div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Notes</h3>
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Leave an internal note for yourself or a team member"
            className="w-full h-40 bg-transparent text-sm text-gray-700 focus:outline-none"
          />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => setNotes(job.notes || '')}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNotes}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
          >
            Save Job
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Attachments</h3>
        {(userRole === 'admin' || userRole === 'manager' || userRole === 'tech') && (
          <div className="flex items-center gap-2 mb-3">
            <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f && onUploadAttachment) onUploadAttachment(f); e.target.value = ''; }} className="text-sm" />
          </div>
        )}
        {(job.attachments && job.attachments.length > 0) ? (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {job.attachments.map((a, idx) => (
              <li key={idx} className="border rounded-lg overflow-hidden bg-gray-50">
                {a.type?.startsWith('image/') ? (
                  <img src={a.url} alt={a.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-gray-600">{a.name}</div>
                )}
                <div className="p-2 flex items-center justify-between">
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-700 text-sm hover:underline truncate">{a.name}</a>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <button onClick={() => onRemoveAttachment && onRemoveAttachment(a.url)} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No attachments yet.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Checklist</h3>
        <form onSubmit={handleAddChecklistItem} className="flex gap-2 mb-4">
          <input
            value={checklistItem}
            onChange={(e) => setChecklistItem(e.target.value)}
            placeholder="Add checklist item"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700">Add</button>
        </form>
        {(job.checklist && job.checklist.length > 0) ? (
          <ul className="space-y-2">
            {job.checklist.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklistItem(index)} />
                <span className={item.completed ? 'line-through text-gray-400' : 'text-gray-700'}>{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No checklist items yet.</p>
        )}
      </div>
    </div>
  );
}
