import React from 'react';
import { JOB_STATUSES } from '../../constants';
import CalendarIcon from '../icons/CalendarIcon';
import PlusCircleIcon from '../icons/PlusCircleIcon';

export default function ScheduleToolbar({
  scheduleView, updateScheduleView,
  scheduleRange, updateScheduleRange,
  jobStatusFilter, setJobStatusFilter,
  assigneeFilter, setAssigneeFilter,
  staff,
  showJobForm, setShowJobForm,
}) {
  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold font-display text-slate-100 flex items-center"><CalendarIcon /> Schedule</h2>
          <div className="ml-4 flex items-center gap-3">
            <span className="isolate inline-flex rounded-md shadow-sm">
              <button onClick={() => updateScheduleView('list')} className={`relative inline-flex items-center rounded-l-md px-3 py-1 text-sm font-semibold transition-colors ${scheduleView === 'list' ? 'bg-scaffld-teal text-white' : 'bg-charcoal text-slate-300 border border-slate-700 hover:bg-slate-dark'}`}>List</button>
              <button onClick={() => updateScheduleView('calendar')} className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1 text-sm font-semibold transition-colors ${scheduleView === 'calendar' ? 'bg-scaffld-teal text-white' : 'bg-charcoal text-slate-300 border border-slate-700 hover:bg-slate-dark'}`}>Calendar</button>
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Range</label>
              <select value={scheduleRange} onChange={(e) => updateScheduleRange(e.target.value)} className="px-2 py-1 bg-charcoal border border-slate-700 text-slate-100 rounded-md text-xs focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
        <button onClick={() => setShowJobForm(s => !s)} className="flex items-center justify-center px-4 py-2 bg-scaffld-teal text-white font-semibold rounded-lg shadow-md hover:bg-scaffld-teal-deep focus:outline-none focus:ring-2 focus:ring-scaffld-teal/40 transition-colors"><PlusCircleIcon /><span>{showJobForm ? 'Cancel' : 'Schedule Job'}</span></button>
      </div>
      {/* Job status filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {JOB_STATUSES.map(s => {
          const active = jobStatusFilter.includes(s);
          return <button key={s} onClick={() => setJobStatusFilter(prev => active ? prev.filter(x => x !== s) : [...prev, s])} className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-scaffld-teal text-white border-scaffld-teal' : 'bg-charcoal text-slate-300 border-slate-700'}`}>{s}</button>;
        })}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-slate-400">Assignee</label>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-2 py-1 bg-charcoal border border-slate-700 text-slate-100 rounded-md text-xs focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20">
            <option value="">All</option>
            <option value="unassigned">Unassigned</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {(jobStatusFilter.length > 0 || assigneeFilter) && <button onClick={() => { setJobStatusFilter([]); setAssigneeFilter(''); }} className="px-2 py-1 rounded-full text-xs font-medium bg-charcoal text-slate-300 border border-slate-700">Clear</button>}
      </div>
    </>
  );
}
