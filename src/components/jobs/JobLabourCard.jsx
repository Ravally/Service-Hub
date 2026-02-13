import React, { useState, useMemo } from 'react';
import { formatCurrency, formatDateTime } from '../../utils';
import ClockInOut from '../timesheets/ClockInOut';
import { toLocalInput } from './jobDetailUtils';

export default function JobLabourCard({ job, staff, laborEntries, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ staffId: '', start: '', end: '', hours: '', cost: '', note: '' });

  const staffMap = useMemo(() => Object.fromEntries((staff || []).map((s) => [s.id, s])), [staff]);

  const handleAdd = () => {
    if (!draft.staffId && !draft.note) return;
    const next = [...(job?.laborEntries || []), {
      id: `labor_${Date.now()}`,
      staffId: draft.staffId || '',
      start: draft.start || '',
      end: draft.end || '',
      hours: draft.hours || '',
      cost: Number(draft.cost || 0),
      note: draft.note || '',
    }];
    onUpdate(job.id, { laborEntries: next });
    setDraft({ staffId: '', start: '', end: '', hours: '', cost: '', note: '' });
    setShowForm(false);
  };

  return (
    <div className="bg-charcoal rounded-2xl border border-slate-700/30 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-slate-100">Labour</h3>
        <button onClick={() => setShowForm((v) => !v)} className="px-3 py-1.5 rounded-md border border-slate-700/30 text-sm font-semibold text-scaffld-teal hover:bg-green-50">
          {showForm ? 'Cancel' : 'Manual Time Entry'}
        </button>
      </div>

      {job && staff && staff.length > 0 && (
        <div className="mb-6"><ClockInOut job={job} staff={staff} /></div>
      )}

      {showForm && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
          <select value={draft.staffId} onChange={(e) => setDraft({ ...draft, staffId: e.target.value })} className="md:col-span-2 px-3 py-2 border border-slate-700 rounded-md">
            <option value="">Select team member</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="datetime-local" value={toLocalInput(draft.start)} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="px-3 py-2 border border-slate-700 rounded-md" />
          <input type="datetime-local" value={toLocalInput(draft.end)} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="px-3 py-2 border border-slate-700 rounded-md" />
          <input type="number" min="0" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="Hours" className="px-3 py-2 border border-slate-700 rounded-md" />
          <input type="number" min="0" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} placeholder="Cost" className="px-3 py-2 border border-slate-700 rounded-md" />
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Notes" className="md:col-span-4 px-3 py-2 border border-slate-700 rounded-md" />
          <div className="md:col-span-2 flex justify-end">
            <button onClick={handleAdd} className="px-4 py-2 bg-scaffld-teal text-white rounded-md text-sm font-semibold hover:bg-scaffld-teal/90">Add Time Entry</button>
          </div>
        </div>
      )}
      {laborEntries.length === 0 ? (
        <div className="text-sm text-slate-400">No labour entries yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 border-b">
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
                <td className="py-3 font-semibold text-slate-100">{staffMap[entry.staffId]?.name || entry.name || 'Team member'}</td>
                <td className="py-3 text-slate-400">{entry.note || '-'}</td>
                <td className="py-3 text-slate-400">{formatDateTime(entry.start)}</td>
                <td className="py-3 text-right text-slate-100">{entry.hours || '-'}</td>
                <td className="py-3 text-right font-semibold text-slate-100">{formatCurrency(entry.cost || entry.amount || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
