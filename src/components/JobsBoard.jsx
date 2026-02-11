// src/components/JobsBoard.jsx
import React, { useMemo, useState, useEffect } from 'react';

const JobsBoard = ({ jobs = [], clients = [], staff = [], onOpenJob, onStatusChange, userRole }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState([]); // array of statuses
  const [assignee, setAssignee] = useState(''); // '' | 'unassigned' | staffId
  const [clientId, setClientId] = useState(''); // '' | clientId
  const [range, setRange] = useState(() => {
    try { const saved = localStorage.getItem('jobsRange'); return saved || 'all'; } catch { return 'all'; }
  }); // 'all' | 'today' | 'week' | 'month'
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jobsPresets') || '{}'); } catch { return {}; }
  });
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => { try { localStorage.setItem('jobsRange', range); } catch {} }, [range]);

  const staffMap = useMemo(() => Object.fromEntries((staff || []).filter(s=>s&&s.id).map(s => [s.id, s])), [staff]);
  const clientMap = useMemo(() => Object.fromEntries((clients || []).filter(c=>c&&c.id).map(c => [c.id, c])), [clients]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const inRange = (d) => {
      if (!d) return range === 'all';
      const dt = new Date(d);
      if (range === 'all') return true;
      if (range === 'today') return dt >= startOfDay && dt <= endOfDay;
      if (range === 'week') return dt >= startOfWeek && dt <= endOfWeek;
      if (range === 'month') return dt >= startOfMonth && dt <= endOfMonth;
      return true;
    };

    return (jobs || [])
      .filter(j => (statusFilter.length === 0 ? true : statusFilter.includes(j.status)))
      .filter(j => {
        if (!assignee) return true;
        if (assignee === 'unassigned') return !j.assignees || j.assignees.length === 0;
        return (j.assignees || []).includes(assignee);
      })
      .filter(j => (clientId ? j.clientId === clientId : true))
      .filter(j => inRange(j.start))
      .filter(j => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        const c = clientMap[j.clientId]?.name || '';
        return (j.title || '').toLowerCase().includes(term) || c.toLowerCase().includes(term) || (j.notes || '').toLowerCase().includes(term);
      })
      .sort((a,b) => new Date(a.start || 0) - new Date(b.start || 0));
  }, [jobs, statusFilter, assignee, clientId, search, range, clientMap]);

  const clearFilters = () => { setSearch(''); setStatusFilter([]); setAssignee(''); setClientId(''); setRange('all'); };
  const savePreset = () => {
    const name = prompt('Preset name:');
    if (!name) return;
    const next = { ...presets, [name]: { search, statusFilter, assignee, clientId, range } };
    setPresets(next);
    try { localStorage.setItem('jobsPresets', JSON.stringify(next)); } catch {}
    setSelectedPreset(name);
  };
  const applyPreset = (name) => {
    setSelectedPreset(name);
    const p = presets[name]; if (!p) return;
    setSearch(p.search || '');
    setStatusFilter(Array.isArray(p.statusFilter) ? p.statusFilter : []);
    setAssignee(p.assignee || '');
    setClientId(p.clientId || '');
    setRange(p.range || 'all');
  };
  const deletePreset = () => {
    if (!selectedPreset) return;
    const next = { ...presets }; delete next[selectedPreset];
    setPresets(next);
    try { localStorage.setItem('jobsPresets', JSON.stringify(next)); } catch {}
    setSelectedPreset('');
  };

  const statuses = ['Unscheduled','Scheduled','In Progress','Completed'];

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">Jobs</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search jobs..." className="px-3 py-2 border border-gray-300 rounded-md text-sm"/>
          <select value={clientId} onChange={(e)=>setClientId(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={assignee} onChange={(e)=>setAssignee(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={range} onChange={(e)=>setRange(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          {(search || statusFilter.length>0 || assignee || clientId || range!=='all') && (
            <button onClick={clearFilters} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Clear</button>
          )}
          <div className="flex items-center gap-2">
            <select value={selectedPreset} onChange={(e)=>applyPreset(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Presets</option>
              {Object.keys(presets).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <button onClick={savePreset} className="px-2 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white">Save Preset</button>
            <button onClick={deletePreset} disabled={!selectedPreset} className={`px-2 py-1 rounded-md text-xs font-medium ${selectedPreset ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>Delete</button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {statuses.map(s => {
          const active = statusFilter.includes(s);
          return (
            <button key={s} onClick={() => setStatusFilter(prev => active ? prev.filter(x=>x!==s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{s}</button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-gray-500">No matching jobs.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map(job => (
              <li key={job.id} className="p-4 sm:p-6 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="cursor-pointer" onClick={() => onOpenJob && onOpenJob(job)}>
                    <p className="font-semibold text-blue-700">{job.title}</p>
                    <p className="text-sm text-gray-600">{clientMap[job.clientId]?.name || 'Unknown Client'}</p>
                    <p className="text-xs text-gray-500 mt-1">{job.start ? new Date(job.start).toLocaleString() : 'Unscheduled'}</p>
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'Scheduled' ? 'bg-indigo-100 text-indigo-800' : job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : job.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>{job.status}</span>
                    <select value={job.status} onChange={(e) => onStatusChange && onStatusChange(job, e.target.value)} disabled={!(userRole === 'admin' || userRole === 'manager')} className={`p-1 border rounded-md shadow-sm text-xs ${ (userRole === 'admin' || userRole === 'manager') ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' }`}>
                      <option disabled>Change status...</option>
                      {['Unscheduled','Scheduled','In Progress','Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default JobsBoard;
