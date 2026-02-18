// src/components/PropertyDetailView.jsx
import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, MapPinIcon, EditIcon } from './icons';
import { formatCurrency, formatDate } from '../utils';
import { QUOTE_STATUSES, JOB_STATUSES } from '../constants';

const formatAddress = (prop) => {
  if (!prop) return '';
  return [
    prop.street1,
    prop.street2,
    [prop.city, prop.state, prop.zip].filter(Boolean).join(' '),
    prop.country,
  ].filter(Boolean).join(', ');
};

const formatShort = (prop) => {
  if (!prop) return '';
  return [
    prop.street1,
    [prop.city, prop.state].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ');
};

export default function PropertyDetailView({
  client,
  property,
  quotes = [],
  jobs = [],
  onBack,
  onOpenQuote,
  onOpenJob,
  onEditClient,
  onUpdateProperty,
  onCreateQuote,
  onCreateJob,
}) {
  const [tab, setTab] = useState('active');
  const [showMapAdjust, setShowMapAdjust] = useState(false);
  const [pinDraft, setPinDraft] = useState({ lat: property?.lat || '', lng: property?.lng || '' });
  const [pinMode, setPinMode] = useState('manual');

  const propertyId = property?.uid || property?.id || '';
  const propertyAddress = formatAddress(property);
  const mapHref = property?.lat && property?.lng
    ? `https://www.google.com/maps?q=${property.lat},${property.lng}`
    : `https://www.google.com/maps?q=${encodeURIComponent(propertyAddress)}`;

  const quotesForProperty = useMemo(() => (
    (quotes || []).filter((q) => q.clientId === client?.id && q.propertyId === propertyId)
  ), [quotes, client?.id, propertyId]);
  const jobsForProperty = useMemo(() => (
    (jobs || []).filter((j) => j.clientId === client?.id && j.propertyId === propertyId)
  ), [jobs, client?.id, propertyId]);
  const activeItems = useMemo(() => ([
    ...jobsForProperty.filter(j => j.status !== JOB_STATUSES[3]).map(j => ({ type: 'job', id: j.id, title: j.title || j.jobNumber || 'Job', date: j.start, status: j.status, amount: 0 })),
    ...quotesForProperty.filter(q => q.status !== QUOTE_STATUSES[4] && q.status !== QUOTE_STATUSES[5]).map(q => ({ type: 'quote', id: q.id, title: q.quoteNumber || 'Quote', date: q.createdAt, status: q.status, amount: q.total || 0 })),
  ]).sort((a,b)=> new Date(b.date||0) - new Date(a.date||0)), [jobsForProperty, quotesForProperty]);

  const lawnSize = property?.lawnSizeWidth && property?.lawnSizeLength
    ? `${property.lawnSizeWidth} x ${property.lawnSizeLength} ${property.lawnSizeUnit || 'ft'}`
    : 'Not set';

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setPinDraft({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
      setPinMode('gps');
    });
  };

  const savePin = () => {
    if (onUpdateProperty && propertyId) {
      onUpdateProperty(client?.id, propertyId, { lat: pinDraft.lat, lng: pinDraft.lng });
    }
    setShowMapAdjust(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-100">
        <ChevronLeftIcon /> Back to Clients
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">Clients / {client?.name || 'Client'}</div>
          <h1 className="text-3xl font-bold text-slate-100">Property Details</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={mapHref} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold inline-flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" /> Show on Map
          </a>
          <button onClick={() => onEditClient && onEditClient(client)} className="px-4 py-2 rounded-lg border border-slate-700/30 text-slate-300 text-sm font-semibold inline-flex items-center gap-2">
            <EditIcon className="h-4 w-4" /> Edit
          </button>
          <details className="relative">
            <summary className="list-none cursor-pointer px-4 py-2 rounded-lg border border-slate-700/30 text-slate-300 text-sm font-semibold">More Actions</summary>
            <div className="absolute right-0 mt-2 w-56 bg-charcoal border border-slate-700/30 rounded-md shadow-lg p-1 z-10">
              <button onClick={() => setShowMapAdjust(true)} className="w-full text-left px-3 py-2 text-sm hover:bg-midnight/60">Adjust Map Location</button>
              <div className="border-t my-1" />
              <button onClick={() => onCreateQuote && onCreateQuote(client)} className="w-full text-left px-3 py-2 text-sm hover:bg-midnight/60">Create Quote</button>
              <button onClick={() => onCreateJob && onCreateJob(client)} className="w-full text-left px-3 py-2 text-sm hover:bg-midnight/60">Create Job</button>
            </div>
          </details>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="space-y-6">
          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
            <div className="text-lg font-semibold text-slate-100 mb-4">Location</div>
            <div className="text-sm text-slate-400 mb-3">Client</div>
            <div className="text-green-700 font-semibold">{client?.name || 'Client'}</div>
            <div className="mt-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl border border-slate-700/30 flex items-center justify-center text-green-700 bg-green-50">
                <MapPinIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-100">{formatShort(property)}</div>
                <div className="text-sm text-slate-400">{propertyAddress}</div>
              </div>
            </div>
            <div className="mt-4 border-t pt-4 text-sm">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Locked Gate</span>
                <span className="font-semibold">{property?.lockedGate ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-slate-400">Lawn Size</span>
                <span className="font-semibold">{lawnSize}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-slate-400">Gate Code</span>
                <span className="font-semibold">{property?.accessCode || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-slate-400">Tax rate</span>
                <span className="font-semibold">{property?.taxRate || 'Default'}</span>
              </div>
            </div>
            {(property?.customFields || []).length > 0 && (
              <div className="mt-4 border-t pt-4 text-sm">
                <div className="text-sm font-semibold text-slate-200 mb-2">Property details</div>
                <div className="space-y-2">
                  {(property.customFields || []).map((field, idx) => (
                    <div key={`${field.key}-${idx}`} className="flex items-center justify-between">
                      <span className="text-slate-400">{field.key || 'Field'}</span>
                      <span className="font-semibold">{field.value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
            <div className="text-lg font-semibold text-slate-100 mb-3">Property contacts</div>
            {(property?.contacts || []).length === 0 ? (
              <div className="text-sm text-slate-400">No property contacts yet.</div>
            ) : (
              <div className="space-y-3 text-sm">
                {(property.contacts || []).map((c, idx) => (
                  <div key={`${c.email}-${idx}`} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <div className="font-semibold text-slate-100">{c.firstName || c.lastName ? `${c.firstName} ${c.lastName}`.trim() : (c.email || 'Contact')}</div>
                      <div className="text-xs text-slate-400">{c.role || '-'}{c.isBilling ? ' - Billing' : ''}</div>
                    </div>
                    <div className="text-xs text-slate-400">{c.phone || c.email || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-100">Overview</h3>
              <button className="px-3 py-1 text-sm rounded-md border border-slate-700/30 text-slate-300">New</button>
            </div>
            <div className="flex flex-wrap gap-2 text-sm mb-4">
              {['active','requests','quotes','jobs','chemical'].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full border ${tab===t ? 'bg-green-700 text-white border-green-700' : 'bg-charcoal text-slate-300 border-slate-700'}`}>
                  {t === 'active' ? 'Active Work' : t === 'chemical' ? 'Chemical Treatments' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-sm">
              {tab === 'active' && (
                activeItems.length === 0 ? (
                  <div className="text-slate-400">No active work linked to this property yet.</div>
                ) : (
                  <div className="space-y-3">
                    {activeItems.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div>
                          <div className="font-semibold text-slate-100">{item.type === 'job' ? item.title : item.title}</div>
                          <div className="text-xs text-slate-400">{item.date ? formatDate(item.date) : ''}</div>
                        </div>
                        <div className="text-right">
                          {item.amount ? <div className="font-semibold">{formatCurrency(item.amount)}</div> : null}
                          <div className="text-xs text-slate-400">{item.status || ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
              {tab === 'quotes' && (
                quotesForProperty.length === 0 ? (
                  <div className="text-slate-400">No quotes for this property yet.</div>
                ) : (
                  <div className="space-y-3">
                    {quotesForProperty.map((q) => (
                      <button key={q.id} onClick={() => onOpenQuote && onOpenQuote(q)} className="w-full text-left flex items-center justify-between border rounded-lg px-3 py-2 hover:bg-midnight/60">
                        <div>
                          <div className="font-semibold text-slate-100">{q.quoteNumber || 'Quote'}</div>
                          <div className="text-xs text-slate-400">{q.createdAt ? formatDate(q.createdAt) : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(q.total || 0)}</div>
                          <div className="text-xs text-slate-400">{q.status || ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
              {tab === 'jobs' && (
                jobsForProperty.length === 0 ? (
                  <div className="text-slate-400">No jobs for this property yet.</div>
                ) : (
                  <div className="space-y-3">
                    {jobsForProperty.map((j) => (
                      <button key={j.id} onClick={() => onOpenJob && onOpenJob(j)} className="w-full text-left flex items-center justify-between border rounded-lg px-3 py-2 hover:bg-midnight/60">
                        <div>
                          <div className="font-semibold text-slate-100">{j.jobNumber || j.title || 'Job'}</div>
                          <div className="text-xs text-slate-400">{j.start ? formatDate(j.start) : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">{j.status || ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
              {tab === 'requests' && (
                <div className="text-slate-400">No service requests for this property.</div>
              )}
              {tab === 'chemical' && (
                <div className="text-slate-400">No chemical treatments recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMapAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowMapAdjust(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-charcoal rounded-2xl shadow-2xl border border-slate-700/30 w-full max-w-5xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Update Your Map Pin</h3>
              <button onClick={() => setShowMapAdjust(false)} className="text-slate-400 hover:text-slate-100">Close</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
              <div className="space-y-4 text-sm">
                <div className="font-semibold text-slate-200">Update Your Map Pin</div>
                <div className="space-y-3">
                  <button onClick={() => setPinMode('manual')} className={`w-full text-left px-3 py-2 rounded-md border ${pinMode === 'manual' ? 'border-green-600 bg-green-50' : 'border-slate-700/30'}`}>
                    Manual Placement
                    <div className="text-xs text-slate-400 mt-1">Click and drag the pin on the map to the correct location.</div>
                  </button>
                  <button onClick={() => { setPinMode('gps'); useCurrentLocation(); }} className={`w-full text-left px-3 py-2 rounded-md border ${pinMode === 'gps' ? 'border-green-600 bg-green-50' : 'border-slate-700/30'}`}>
                    Based on Location
                    <div className="text-xs text-slate-400 mt-1">Put the pin at your current location.</div>
                  </button>
                  <button onClick={() => setPinMode('coords')} className={`w-full text-left px-3 py-2 rounded-md border ${pinMode === 'coords' ? 'border-green-600 bg-green-50' : 'border-slate-700/30'}`}>
                    By Coordinates
                    <div className="text-xs text-slate-400 mt-1">Enter latitude and longitude manually.</div>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Latitude</label>
                    <input value={pinDraft.lat} onChange={(e)=>setPinDraft({ ...pinDraft, lat: e.target.value })} className="mt-1 w-full px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Longitude</label>
                    <input value={pinDraft.lng} onChange={(e)=>setPinDraft({ ...pinDraft, lng: e.target.value })} className="mt-1 w-full px-2 py-1 border rounded" />
                  </div>
                </div>
                <button onClick={useCurrentLocation} className="px-3 py-2 rounded-md border border-slate-700/30 text-sm font-semibold text-slate-300">Use Your Current Location</button>
              </div>
              <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-lg font-semibold">Map Preview</div>
                  <div className="text-sm">Latitude {pinDraft.lat || '--'}, Longitude {pinDraft.lng || '--'}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => setShowMapAdjust(false)} className="px-4 py-2 rounded-md border border-slate-700/30 text-sm font-semibold text-slate-300">Cancel</button>
              <button onClick={savePin} className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
