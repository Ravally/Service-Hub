// src/components/CalendarView.jsx
import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

const STATUS_COLORS = {
  Scheduled: { bg: '#1e40af', fg: '#dbeafe' },
  'In Progress': { bg: '#b45309', fg: '#fef3c7' },
  Completed: { bg: '#0EA5A0', fg: '#ffffff' },
  Unscheduled: { bg: '#475569', fg: '#e2e8f0' },
};

const CalendarView = ({ jobs, calendarDate, setCalendarDate, onJobSelect, onJobReschedule, staff = [], scheduleRange = 'month' }) => {
  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();
  const [selectedDay, setSelectedDay] = useState(null);
  const [dragJobId, setDragJobId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [confirmDrop, setConfirmDrop] = useState(null);

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const paddingDays = firstDayOfMonth.getDay();
  const daysArr = Array.from({ length: paddingDays + daysInMonth }, (_, i) => i < paddingDays ? null : i - paddingDays + 1);

  const jobsByDate = useMemo(() => (
    (jobs || []).reduce((acc, job) => {
      if (!job.start) return acc;
      const date = new Date(job.start).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(job);
      return acc;
    }, {})
  ), [jobs]);

  const jobsById = useMemo(() => {
    const map = {};
    (jobs || []).forEach(j => { map[j.id] = j; });
    return map;
  }, [jobs]);

  const staffMap = useMemo(() => {
    const map = {};
    (staff || []).forEach(s => { if (s && s.id) map[s.id] = s; });
    return map;
  }, [staff]);

  const changePeriod = (offset) => {
    setSelectedDay(null);
    if (scheduleRange === 'month') {
      setCalendarDate(new Date(year, month + offset, 1));
    } else if (scheduleRange === 'week') {
      const d = new Date(calendarDate);
      d.setDate(d.getDate() + offset * 7);
      setCalendarDate(d);
    } else {
      const d = new Date(calendarDate);
      d.setDate(d.getDate() + offset);
      setCalendarDate(d);
    }
  };

  const getJobColor = (job) => {
    const status = STATUS_COLORS[job.status];
    if (status) return status;
    const staffColor = staffMap[(job.assignees || [])[0]]?.color;
    return staffColor ? { bg: staffColor, fg: '#1F2937' } : { bg: '#BFDBFE', fg: '#1F2937' };
  };

  // Drag and drop handlers
  const handleDragStart = (e, jobId) => {
    setDragJobId(jobId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', jobId);
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(dateStr);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e, dateStr) => {
    e.preventDefault();
    setDropTarget(null);
    const jobId = e.dataTransfer.getData('text/plain') || dragJobId;
    if (!jobId) return;
    const job = jobsById[jobId];
    if (!job) return;
    const currentDate = job.start ? new Date(job.start).toDateString() : null;
    if (currentDate === dateStr) return; // Dropped on same day
    setConfirmDrop({ job, newDate: new Date(dateStr) });
    setDragJobId(null);
  };

  const handleDragEnd = () => {
    setDragJobId(null);
    setDropTarget(null);
  };

  const confirmReschedule = () => {
    if (!confirmDrop || !onJobReschedule) return;
    const { job, newDate } = confirmDrop;
    // Preserve original time, just change date
    const original = job.start ? new Date(job.start) : new Date();
    newDate.setHours(original.getHours(), original.getMinutes(), original.getSeconds());
    onJobReschedule(job.id, { start: newDate.toISOString() });
    setConfirmDrop(null);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = new Date(year, month, day).toDateString();
    setSelectedDay(prev => prev === dateStr ? null : dateStr);
  };

  const handleWeekDayClick = (day) => {
    const dateStr = day.toDateString();
    setSelectedDay(prev => prev === dateStr ? null : dateStr);
  };

  const selectedDayJobs = selectedDay ? (jobsByDate[selectedDay] || []) : [];

  // Confirmation dialog
  const ConfirmDialog = () => {
    if (!confirmDrop) return null;
    const { job, newDate } = confirmDrop;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-charcoal border border-slate-700/30 rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Move job?</h3>
          <p className="text-sm text-slate-300 mb-4">
            Move <span className="font-semibold text-scaffld-teal">{job.title}</span> to{' '}
            <span className="font-semibold">{newDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>?
          </p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setConfirmDrop(null)} className="min-h-[44px] px-4 py-2 rounded-md border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-midnight">Cancel</button>
            <button onClick={confirmReschedule} className="min-h-[44px] px-4 py-2 rounded-md bg-scaffld-teal text-white text-sm font-semibold hover:bg-scaffld-teal/90">Confirm</button>
          </div>
        </div>
      </div>
    );
  };

  // Detail panel for selected day
  const DayDetailPanel = () => {
    if (!selectedDay) return null;
    const dateObj = new Date(selectedDay);
    return (
      <div className="mt-4 border-t border-slate-700/30 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            {dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{selectedDayJobs.length} job{selectedDayJobs.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setSelectedDay(null)} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Close</button>
          </div>
        </div>
        {selectedDayJobs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">No jobs scheduled for this day.</div>
        ) : (
          <div className="space-y-2">
            {selectedDayJobs.sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0)).map(job => {
              const ids = job.assignees || [];
              const colors = getJobColor(job);
              return (
                <div key={job.id} onClick={() => onJobSelect(job)} className="flex items-center justify-between p-3 bg-midnight rounded-lg border border-slate-700/30 hover:border-scaffld-teal/30 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-scaffld-teal text-sm truncate">{job.title}</p>
                      {job.status && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap" style={{ backgroundColor: colors.bg + '30', color: colors.bg, border: `1px solid ${colors.bg}40` }}>{job.status}</span>
                      )}
                    </div>
                    {job.start && (
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(job.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {ids.length > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-1.5">
                          {ids.slice(0, 3).map(id => (
                            <span key={id} className="inline-block h-5 w-5 rounded-full border-2 border-midnight" style={{ backgroundColor: (staffMap[id]?.color || '#9CA3AF') }} title={staffMap[id]?.name || ''} />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 ml-1">{ids.map(id => staffMap[id]?.name).filter(Boolean).join(', ') || 'Unassigned'}</span>
                      </div>
                    )}
                    <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Job pill component (reused across views)
  const JobPill = ({ job, small = false }) => {
    const colors = getJobColor(job);
    const ids = job.assignees || [];
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, job.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => { e.stopPropagation(); onJobSelect(job); }}
        className={`rounded-md p-1 ${small ? 'text-[10px]' : 'text-[11px]'} leading-tight mb-1 cursor-grab active:cursor-grabbing`}
        style={{ backgroundColor: colors.bg, color: colors.fg }}
        title={ids.length ? `Assigned: ${ids.map(id => staffMap[id]?.name).filter(Boolean).join(', ')}` : 'Unassigned'}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate">{job.title}</span>
          <div className="flex -space-x-1">
            {ids.slice(0, 3).map(id => (
              <span key={id} className="inline-block h-2 w-2 rounded-full border border-charcoal" style={{ backgroundColor: (staffMap[id]?.color || '#9CA3AF') }} />
            ))}
            {ids.length > 3 && (<span className="text-[9px] ml-1">+{ids.length - 3}</span>)}
          </div>
        </div>
      </div>
    );
  };

  // Render helpers
  const MonthGrid = () => (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1" style={{ gridAutoRows: '1fr', minHeight: `calc(100vh - ${selectedDay ? '32rem' : '22rem'})` }}>
        {daysArr.map((day, index) => {
          const fullDate = day ? new Date(year, month, day).toDateString() : null;
          const jobsForDay = fullDate ? (jobsByDate[fullDate] || []) : [];
          const isToday = fullDate === new Date().toDateString();
          const isSelected = fullDate === selectedDay;
          const isDragOver = fullDate === dropTarget;
          return (
            <div
              key={index}
              onClick={() => handleDayClick(day)}
              onDragOver={fullDate ? (e) => handleDragOver(e, fullDate) : undefined}
              onDragLeave={handleDragLeave}
              onDrop={fullDate ? (e) => handleDrop(e, fullDate) : undefined}
              className={`relative border rounded-md p-1 overflow-y-auto bg-midnight cursor-pointer transition-colors ${
                isDragOver ? 'border-scaffld-teal bg-scaffld-teal/10 ring-1 ring-scaffld-teal/30' :
                isSelected ? 'border-scaffld-teal ring-1 ring-scaffld-teal/30' :
                'border-slate-700/30 hover:border-slate-600'
              }`}
            >
              {day && (
                <span className={`absolute top-1 right-2 text-xs text-slate-300 ${isToday ? 'bg-scaffld-teal text-white rounded-full h-5 w-5 flex items-center justify-center' : ''}`}>{day}</span>
              )}
              {jobsForDay.map(job => <JobPill key={job.id} job={job} small />)}
            </div>
          );
        })}
      </div>
    </>
  );

  const WeekRow = () => {
    const d = new Date(calendarDate);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    start.setDate(start.getDate() - start.getDay());
    const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    return (
      <>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
          {days.map(day => <div key={day.toDateString()} className="py-1">{day.toLocaleDateString(undefined, { weekday: 'short' })}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2" style={{ gridAutoRows: '1fr', minHeight: `calc(100vh - ${selectedDay ? '32rem' : '22rem'})` }}>
          {days.map(day => {
            const key = day.toDateString();
            const jobsForDay = jobsByDate[key] || [];
            const isToday = key === new Date().toDateString();
            const isSelected = key === selectedDay;
            const isDragOver = key === dropTarget;
            return (
              <div
                key={key}
                onClick={() => handleWeekDayClick(day)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
                className={`relative border rounded-md p-2 overflow-y-auto bg-midnight cursor-pointer transition-colors ${
                  isDragOver ? 'border-scaffld-teal bg-scaffld-teal/10 ring-1 ring-scaffld-teal/30' :
                  isSelected ? 'border-scaffld-teal ring-1 ring-scaffld-teal/30' :
                  'border-slate-700/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={`font-medium ${isToday ? 'text-scaffld-teal' : 'text-slate-300'}`}>{day.getDate()}</span>
                </div>
                {jobsForDay.map(job => <JobPill key={job.id} job={job} />)}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const TodayList = () => {
    const key = calendarDate.toDateString();
    const jobsForDay = jobsByDate[key] || [];
    return (
      <div className="space-y-2">
        {jobsForDay.length === 0 ? (
          <div className="text-center p-10 text-slate-400 bg-midnight rounded-xl border border-slate-700/30">No jobs scheduled for today.</div>
        ) : jobsForDay.map(job => {
          const ids = job.assignees || [];
          const colors = getJobColor(job);
          return (
            <div key={job.id} onClick={() => onJobSelect(job)} className="bg-midnight rounded-xl shadow border border-slate-700/30 p-3 cursor-pointer hover:border-scaffld-teal/30 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-scaffld-teal">{job.title}</p>
                  {job.start && <p className="text-xs text-slate-400">{new Date(job.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {job.status && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: (STATUS_COLORS[job.status]?.bg || '#475569') + '30', color: STATUS_COLORS[job.status]?.bg || '#475569' }}>{job.status}</span>
                  )}
                  <div className="flex -space-x-1">
                    {ids.slice(0, 3).map(id => (
                      <span key={id} className="inline-block h-4 w-4 rounded-full border border-charcoal" style={{ backgroundColor: (staffMap[id]?.color || '#9CA3AF') }} title={staffMap[id]?.name || ''} />
                    ))}
                  </div>
                </div>
              </div>
              {ids.length > 0 && (
                <div className="mt-2 text-xs text-slate-400">
                  Assigned: {ids.map(id => staffMap[id]?.name).filter(Boolean).join(', ') || 'Unassigned'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const title = scheduleRange === 'month'
    ? calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    : scheduleRange === 'week'
      ? (() => { const d = new Date(calendarDate); const s = new Date(d); s.setDate(s.getDate() - s.getDay()); const e = new Date(s); e.setDate(e.getDate()+6); return `Week of ${s.toLocaleDateString()} – ${e.toLocaleDateString()}`; })()
      : calendarDate.toLocaleDateString();

  return (
    <div className="bg-charcoal p-4 rounded-xl shadow-lg border border-slate-700/30">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changePeriod(-1)} className="min-h-[44px] min-w-[44px] p-2 rounded-full text-slate-300 hover:bg-slate-dark hover:text-scaffld-teal transition-colors flex items-center justify-center"><ChevronLeftIcon /></button>
        <h2 className="text-base sm:text-lg font-semibold text-slate-100 truncate px-2">{title}</h2>
        <button onClick={() => changePeriod(1)} className="min-h-[44px] min-w-[44px] p-2 rounded-full text-slate-300 hover:bg-slate-dark hover:text-scaffld-teal transition-colors flex items-center justify-center"><ChevronRightIcon /></button>
      </div>

      {/* On mobile (<768px), show list view instead of grid for month/week */}
      <div className="hidden md:block">
        {scheduleRange === 'month' && <MonthGrid />}
        {scheduleRange === 'week' && <WeekRow />}
      </div>
      <div className="md:hidden">
        {(scheduleRange === 'month' || scheduleRange === 'week') && <TodayList />}
      </div>
      {scheduleRange === 'today' && <TodayList />}

      {scheduleRange !== 'today' && <DayDetailPanel />}
      <ConfirmDialog />
    </div>
  );
};

export default CalendarView;
