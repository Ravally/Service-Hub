// src/components/CalendarView.jsx
import React, { useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

const CalendarView = ({ jobs, calendarDate, setCalendarDate, onJobSelect, staff = [], scheduleRange = 'month' }) => {
  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();

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

  const staffMap = useMemo(() => {
    const map = {};
    (staff || []).forEach(s => { if (s && s.id) map[s.id] = s; });
    return map;
  }, [staff]);

  const changePeriod = (offset) => {
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
  const getJobColor = (job) => staffMap[(job.assignees || [])[0]]?.color || '#BFDBFE';
  const getContrast = (hex) => {
    const h = (hex || '').replace('#','');
    const full = h.length === 3 ? h.split('').map(x=>x+x).join('') : h;
    const val = parseInt(full, 16);
    if (isNaN(val)) return '#1F2937';
    const r = (val >> 16) & 255, g = (val >> 8) & 255, b = val & 255;
    const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
    return luminance > 0.6 ? '#1F2937' : '#FFFFFF';
  };

  // Render helpers
  const MonthGrid = () => (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {daysArr.map((day, index) => {
          const fullDate = day ? new Date(year, month, day).toDateString() : null;
          const jobsForDay = fullDate ? (jobsByDate[fullDate] || []) : [];
          const isToday = fullDate === new Date().toDateString();
          return (
            <div key={index} className="relative h-28 border border-gray-100 rounded-md p-1 overflow-y-auto">
              {day && (
                <span className={`absolute top-1 right-2 text-xs ${isToday ? 'bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center' : ''}`}>{day}</span>
              )}
              {jobsForDay.map(job => {
                const bg = getJobColor(job);
                const fg = getContrast(bg);
                const ids = job.assignees || [];
                return (
                  <div key={job.id} onClick={() => onJobSelect(job)} className="rounded-md p-1 text-[10px] leading-tight mb-1 cursor-pointer" style={{ backgroundColor: bg, color: fg }} title={ids.length ? `Assigned: ${ids.map(id=>staffMap[id]?.name).filter(Boolean).join(', ')}` : 'Unassigned'}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{job.title}</span>
                      <div className="flex -space-x-1">
                        {ids.slice(0,3).map(id => (
                          <span key={id} className="inline-block h-2 w-2 rounded-full border border-white" style={{ backgroundColor: (staffMap[id]?.color || '#9CA3AF') }} />
                        ))}
                        {ids.length > 3 && (<span className="text-[9px] ml-1">+{ids.length - 3}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 mb-2">
          {days.map(day => <div key={day.toDateString()} className="py-1">{day.toLocaleDateString(undefined, { weekday: 'short' })}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const key = day.toDateString();
            const jobsForDay = jobsByDate[key] || [];
            const isToday = key === new Date().toDateString();
            return (
              <div key={key} className="relative min-h-[12rem] border border-gray-100 rounded-md p-2 overflow-y-auto">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={`font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day.getDate()}</span>
                </div>
                {jobsForDay.map(job => {
                  const bg = getJobColor(job);
                  const fg = getContrast(bg);
                  const ids = job.assignees || [];
                  return (
                    <div key={job.id} onClick={() => onJobSelect(job)} className="rounded-md p-1 text-[11px] leading-tight mb-1 cursor-pointer" style={{ backgroundColor: bg, color: fg }} title={ids.length ? `Assigned: ${ids.map(id=>staffMap[id]?.name).filter(Boolean).join(', ')}` : 'Unassigned'}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{job.title}</span>
                        <div className="flex -space-x-1">
                          {ids.slice(0,3).map(id => (
                            <span key={id} className="inline-block h-2 w-2 rounded-full border border-white" style={{ backgroundColor: (staffMap[id]?.color || '#9CA3AF') }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
          <div className="text-center p-10 text-gray-500 bg-white rounded-xl border border-gray-200">No jobs scheduled for today.</div>
        ) : jobsForDay.map(job => {
          const ids = job.assignees || [];
          const bg = getJobColor(job); const fg = getContrast(bg);
          return (
            <div key={job.id} className="bg-white rounded-xl shadow border border-gray-200 p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-blue-700">{job.title}</p>
                  {job.start && <p className="text-xs text-gray-500">{new Date(job.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                </div>
                <div className="flex -space-x-1 ml-2">
                  {ids.slice(0,3).map(id => (
                    <span key={id} className="inline-block h-4 w-4 rounded-full border border-white" style={{ backgroundColor: (staffMap[id]?.color || '#9CA3AF') }} title={staffMap[id]?.name || ''} />
                  ))}
                </div>
              </div>
              <div className="mt-2 rounded p-1 text-[11px]" style={{ backgroundColor: bg, color: fg }}>
                Assigned: {ids.map(id=>staffMap[id]?.name).filter(Boolean).join(', ') || 'Unassigned'}
              </div>
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
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changePeriod(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon /></button>
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={() => changePeriod(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button>
      </div>

      {scheduleRange === 'month' && <MonthGrid />}
      {scheduleRange === 'week' && <WeekRow />}
      {scheduleRange === 'today' && <TodayList />}
    </div>
  );
};

export default CalendarView;

