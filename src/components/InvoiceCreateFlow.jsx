// src/components/InvoiceCreateFlow.jsx
import React, { useEffect, useMemo, useState } from 'react';
import InvoiceDetailView from './InvoiceDetailView';
import { InvoiceIcon } from './icons';
import { formatCurrency, formatDate } from '../utils';
import { computeDueDate } from '../utils/calculations';
import { initialCompanySettings } from '../constants';

const getPrimaryProperty = (client) => {
  if (!client?.properties || client.properties.length === 0) return null;
  return client.properties.find((p) => p.isPrimary) || client.properties[0];
};

const formatPropertyAddress = (property, client) => {
  if (property) {
    const parts = [
      property.label,
      property.street1,
      property.street2,
      [property.city, property.state, property.zip].filter(Boolean).join(' '),
      property.country,
    ].filter(Boolean);
    return parts.join(', ');
  }
  return client?.address || '';
};

const normalizeLineItem = (item, fallbackName, serviceDate) => ({
  type: item?.type || 'line_item',
  name: item?.name || fallbackName || item?.description || '',
  description: item?.description || item?.note || '',
  qty: Number(item?.qty ?? 1),
  price: Number(item?.price ?? 0),
  unitCost: Number(item?.unitCost ?? item?.cost ?? 0),
  isOptional: !!item?.isOptional,
  serviceDate: item?.serviceDate || serviceDate || '',
});

const buildDraft = ({ client, selectedJobs = [], mode, companySettings, invoiceSettings }) => {
  const now = new Date().toISOString();
  const dueTerm = invoiceSettings?.defaultTerm || 'Due Today';
  const baseLineItems = [];
  if (mode === 'job' && selectedJobs.length > 0) {
    selectedJobs.forEach((job) => {
      const items = Array.isArray(job.lineItems) && job.lineItems.length > 0 ? job.lineItems : [{ description: job.title || 'Service', qty: 1, price: 0 }];
      const serviceDate = job.end || job.start || '';
      items.forEach((item) => {
        baseLineItems.push(normalizeLineItem(item, job.title, serviceDate));
      });
    });
  }
  if (baseLineItems.length === 0) {
    baseLineItems.push(normalizeLineItem({}, 'Service', ''));
  }

  const jobProperty = selectedJobs.length === 1
    ? (selectedJobs[0].propertySnapshot || (Array.isArray(client?.properties)
        ? client.properties.find((p, idx) => (p.uid || p.id || String(idx)) === selectedJobs[0].propertyId)
        : null))
    : null;
  const property = jobProperty || getPrimaryProperty(client);
  const serviceAddress = formatPropertyAddress(property, client);
  const jobIds = selectedJobs.map((job) => job.id).filter(Boolean);

  return {
    id: 'draft',
    status: 'Draft',
    clientId: client?.id || '',
    jobId: jobIds.length === 1 ? jobIds[0] : '',
    jobIds: jobIds.length > 1 ? jobIds : [],
    createdAt: now,
    issueDate: now,
    dueTerm,
    dueDate: computeDueDate(now, dueTerm),
    subject: selectedJobs.length === 1 ? (selectedJobs[0].title || 'For services rendered') : 'For services rendered',
    lineItems: baseLineItems,
    billingAddress: client?.address || '',
    serviceAddress,
    contactPhone: client?.phone || '',
    contactEmail: client?.email || '',
    customFields: [],
    clientMessage: companySettings?.invoiceMessage || initialCompanySettings.invoiceMessage,
    contractTerms: companySettings?.invoiceContractTerms || '',
    disclaimers: companySettings?.invoiceDisclaimers || '',
    clientViewSettings: companySettings?.invoiceClientViewSettings || initialCompanySettings.invoiceClientViewSettings,
    paymentSettings: companySettings?.invoicePaymentSettings || initialCompanySettings.invoicePaymentSettings,
    askForReview: !!(client?.commPrefs && client.commPrefs.askForReview),
    depositApplied: 0,
    taxRate: companySettings?.defaultGstRate ?? 0,
    quoteDiscountType: 'amount',
    quoteDiscountValue: 0,
  };
};

export default function InvoiceCreateFlow({
  clients = [],
  jobs = [],
  invoices = [],
  companySettings,
  invoiceSettings,
  initialClientId = '',
  initialJobIds = [],
  initialMode = 'job',
  onCancel,
  onCreateInvoice,
}) {
  const [step, setStep] = useState('select');
  const [mode, setMode] = useState(initialMode || 'job');
  const [clientId, setClientId] = useState(initialClientId || '');
  const [selectedJobIds, setSelectedJobIds] = useState(initialJobIds || []);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if ((initialJobIds || []).length > 0) {
      setStep('details');
    }
  }, [initialJobIds]);

  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId]);
  const clientJobs = useMemo(() => jobs.filter((j) => j.clientId === clientId), [jobs, clientId]);
  const invoicesByJob = useMemo(() => {
    const map = new Map();
    invoices.forEach((inv) => { if (inv.jobId) map.set(inv.jobId, true); });
    return map;
  }, [invoices]);

  const selectedJobs = useMemo(() => clientJobs.filter((j) => selectedJobIds.includes(j.id)), [clientJobs, selectedJobIds]);

  useEffect(() => {
    if (step !== 'details') return;
    if (!client) return;
    const draftInvoice = buildDraft({
      client,
      selectedJobs,
      mode,
      companySettings,
      invoiceSettings,
    });
    setDraft(draftInvoice);
  }, [step, client, selectedJobs, mode, companySettings, invoiceSettings]);

  const toggleJob = (jobId) => {
    setSelectedJobIds((prev) => prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]);
  };

  const handleNext = () => {
    if (!clientId) return;
    if (mode === 'job' && selectedJobIds.length === 0) return;
    setStep('details');
  };

  if (step === 'details' && draft) {
    return (
      <InvoiceDetailView
        invoice={draft}
        client={client}
        company={companySettings}
        mode="create"
        onBack={() => setStep('select')}
        onCreateInvoice={onCreateInvoice}
        userRole="admin"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
            <InvoiceIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">New Invoice</h2>
            <p className="text-sm text-gray-500">Select the jobs you want to invoice or create an ad-hoc invoice.</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-sm font-semibold text-gray-600 hover:text-gray-800">Cancel</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMode('job')}
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${mode === 'job' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            From jobs
          </button>
          <button
            onClick={() => setMode('ad_hoc')}
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${mode === 'ad_hoc' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            Ad-hoc invoice
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setSelectedJobIds([]); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {client && (
            <div className="text-sm text-gray-600">
              <div className="font-semibold text-gray-800">{client.name}</div>
              <div>{client.address || 'No billing address on file.'}</div>
              <div>{client.email || 'No email on file.'}</div>
            </div>
          )}
        </div>

        {mode === 'job' && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700">Select the jobs you want to invoice:</div>
            {clientJobs.length === 0 ? (
              <div className="text-sm text-gray-500">No jobs for this client yet.</div>
            ) : (
              <div className="space-y-3">
                {clientJobs.map((job) => {
                  const jobItems = Array.isArray(job.lineItems) ? job.lineItems : [];
                  const jobTotal = jobItems.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
                  const completedVisits = Array.isArray(job.visits) ? job.visits.filter((v) => v.status === 'Completed').length : 0;
                  const hasInvoice = invoicesByJob.has(job.id);
                  const requiresInvoicing = job.status === 'Completed' && !hasInvoice;
                  return (
                    <div key={job.id} className="border border-gray-200 rounded-xl p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedJobIds.includes(job.id)}
                          onChange={() => toggleJob(job.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-gray-900">{job.jobNumber || job.title || 'Job'}</div>
                            <div className="text-sm font-semibold text-gray-900">{formatCurrency(jobTotal, companySettings?.currencyCode)}</div>
                          </div>
                          <div className="text-sm text-gray-500">{job.title || 'Service'}{job.start ? ` - ${formatDate(job.start)}` : ''}</div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                            <span>{completedVisits} completed visits</span>
                            {requiresInvoicing && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Requires invoicing</span>}
                            {hasInvoice && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Invoiced</span>}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700">Cancel</button>
          <button
            onClick={handleNext}
            disabled={!clientId || (mode === 'job' && selectedJobIds.length === 0)}
            className="px-4 py-2 rounded-md bg-green-700 text-white text-sm font-semibold disabled:bg-gray-300"
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
