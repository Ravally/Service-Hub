import React, { useState, useMemo } from 'react';
import { formatDateTime } from '../../utils';
import { toLocalInput, groupVisits } from './jobDetailUtils';

export default function JobVisitsCard({ job, staff, visits, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ start: '', end: '', assignees: [], notes: '' });

  const staffMap = useMemo(() => Object.fromEntries((staff || []).map((s) => [s.id, s])), [staff]);

  const visitGroups = useMemo(() => {
    const data = Array.isArray(visits) ? visits : (job?.visits || []);
    return groupVisits(data);
  }, [visits, job]);

  const handleAdd = () => {
    if (!draft.start) return;
    const next = [...(job?.visits || []), {
      id: `visit_${Date.now()}`,
      start: draft.start,
      end: draft.end || '',
      assignees: draft.assignees || [],
      notes: draft.notes || '',
      status: 'Scheduled',
    }];
    onUpdate(job.id, { visits: next });
    setDraft({ start: '', end: '', assignees: [], notes: '' });
    setShowForm(false);
  };

  const handleToggleComplete = (visitId, visitStart) => {
    const next = (job?.visits || []).map((v) => {
      if (visitId) { if (v.id !== visitId) return v; }
      else if (visitStart) { if (v.start !== visitStart) return v; }
      else { return v; }
      return { ...v, status: v.status === 'Completed' ? 'Scheduled' : 'Completed' };
    });
    onUpdate(job.id, { visits: next });
  };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-slate-100">Visits</h3>
        <button onClick={() => setShowForm((v) => !v)} className="min-h-[44px] px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-midnight">
          {showForm ? 'Cancel' : 'New Visit'}
        </button>
      </div>
      {showForm && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <input type="datetime-local" value={toLocalInput(draft.start)} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="sm:col-span-1 md:col-span-2 min-h-[44px] px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
          <input type="datetime-local" value={toLocalInput(draft.end)} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="sm:col-span-1 md:col-span-2 min-h-[44px] px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
          <div className="md:col-span-2 border border-slate-700/30 rounded-md p-2">
            <div className="text-xs text-slate-400 mb-2">Assignees</div>
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => (
                <label key={s.id} className="inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={draft.assignees.includes(s.id)} onChange={() => {
                    setDraft((prev) => {
                      const set = new Set(prev.assignees);
                      set.has(s.id) ? set.delete(s.id) : set.add(s.id);
                      return { ...prev, assignees: Array.from(set) };
                    });
                  }} />
                  {s.name}
                </label>
              ))}
              {staff.length === 0 && <span className="text-xs text-slate-400">No staff available.</span>}
            </div>
          </div>
          <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Visit notes" className="sm:col-span-2 md:col-span-4 min-h-[44px] px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100" />
          <div className="sm:col-span-2 md:col-span-2 flex justify-end">
            <button onClick={handleAdd} className="min-h-[44px] px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Add Visit</button>
          </div>
        </div>
      )}
      {visitGroups.length === 0 ? (
        <div className="text-sm text-slate-400">No visits scheduled yet.</div>
      ) : (
        <div className="space-y-4">
          {visitGroups.map((group) => (
            <div key={group.label}>
              <div className="text-sm font-semibold text-scaffld-teal mb-2">{group.label}</div>
              <div className="divide-y border border-slate-700/30 rounded-lg">
                {group.items.map((visit) => {
                  const assignedNames = (visit.assignees || job.assignees || []).map((id) => staffMap[id]?.name).filter(Boolean);
                  return (
                    <div key={visit.id || visit.start} className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-5 w-5 shrink-0" checked={visit.status === 'Completed'} onChange={() => handleToggleComplete(visit.id, visit.start)} />
                        <div className="font-semibold text-slate-100">{formatDateTime(visit.start)}</div>
                      </div>
                      <div className="text-slate-400">{assignedNames.length ? `Assigned to ${assignedNames.join(', ')}` : 'Unassigned'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
