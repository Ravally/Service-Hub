import React, { useState, useEffect } from 'react';
import { MapPinIcon, PhoneIcon, AtSignIcon, EditIcon } from '../icons';
import { STATUS_COLORS } from '../../constants';
import { formatAddress, getJobProperty, buildDetailRows, toLocalInput } from './jobDetailUtils';

export default function JobInfoCard({ job, client, staff, statusColors, onUpdate, onOpenClient, getClientNameById }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...job });

  useEffect(() => {
    setEditData({ ...job });
    setIsEditing(false);
  }, [job]);

  const clientName = client?.name || getClientNameById?.(job.clientId) || 'Unknown Client';
  const primaryProperty = getJobProperty(job, client);
  const addressLines = formatAddress(client, primaryProperty);
  const contactPhone = client?.phone || client?.phones?.[0]?.number || 'No phone';
  const contactEmail = client?.email || client?.emails?.[0]?.address || 'No email';
  const detailRows = buildDetailRows(job);
  const jobStatusClass = statusColors?.[job.status] || STATUS_COLORS[job.status] || 'bg-midnight text-slate-100';
  const isToday = job?.start && new Date(job.start).toDateString() === new Date().toDateString();

  const handleSaveDetails = () => {
    onUpdate(job.id, editData);
    setIsEditing(false);
  };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {isToday && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-scaffld-teal">Today</span>}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${jobStatusClass}`}>{job.status}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-100">{clientName}</h1>
            {onOpenClient && (
              <button onClick={() => onOpenClient(job.clientId)} className="text-scaffld-teal text-lg font-semibold hover:text-green-800">Link</button>
            )}
          </div>
          {job.title && <p className="text-sm text-slate-400 mt-1">{job.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing((v) => !v)}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-100 text-sm font-semibold hover:bg-midnight"
          >
            <span className="inline-flex items-center gap-2"><EditIcon /> {isEditing ? 'Cancel Edit' : 'Edit'}</span>
          </button>
          <div className="text-sm font-semibold text-slate-100">Job {job.jobNumber || `#${(job.id || '').substring(0, 6)}`}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Property address</h3>
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-xl border border-slate-700/30 flex items-center justify-center text-scaffld-teal bg-green-50">
                <MapPinIcon />
              </div>
              <div className="text-sm text-slate-100 space-y-1">
                {addressLines.map((line, idx) => <div key={idx}>{line}</div>)}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Contact details</h3>
            <div className="space-y-2 text-sm text-slate-100">
              <div className="flex items-center gap-2"><PhoneIcon /> <span>{contactPhone}</span></div>
              <div className="flex items-center gap-2"><AtSignIcon /> <span className="text-scaffld-teal">{contactEmail}</span></div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100 mb-3">Job details</h3>
          <div className="border border-slate-700/30 rounded-xl overflow-hidden">
            {detailRows.map((row, idx) => (
              <div key={row.label} className={`flex items-center justify-between px-4 py-2 text-sm ${idx % 2 === 0 ? 'bg-midnight' : 'bg-charcoal'}`}>
                <span className="text-slate-400">{row.label}</span>
                <span className="font-semibold text-slate-100">{row.value || 'Not set'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="mt-6 border-t border-slate-700/30 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-100">Job Title</label>
              <input type="text" value={editData.title || ''} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-700 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-100">Start time</label>
              <input type="datetime-local" value={toLocalInput(editData.start)} onChange={(e) => setEditData({ ...editData, start: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-700 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-100">End time</label>
              <input type="datetime-local" value={toLocalInput(editData.end)} onChange={(e) => setEditData({ ...editData, end: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-700 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1">Assignees</label>
              <div className="flex flex-wrap gap-2">
                {staff.length === 0 && <span className="text-sm text-slate-400">No staff yet.</span>}
                {staff.map((s) => (
                  <label key={s.id} className="inline-flex items-center text-sm bg-midnight px-2 py-1 rounded-md border">
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
            <button onClick={handleSaveDetails} className="px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
