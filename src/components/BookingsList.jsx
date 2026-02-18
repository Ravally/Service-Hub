import React, { useMemo, useState } from 'react';
import { STATUS_COLORS } from '../constants';
import { formatCurrency } from '../utils';
import { useIsMobile } from '../hooks/ui';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
];

export default function BookingsList({
  jobs, getClientNameById, onSelectJob, onApproveBooking, onDeclineBooking,
}) {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState('all');

  const bookings = useMemo(() => {
    const all = jobs.filter((j) => j.source === 'online_booking');
    if (filter === 'pending') return all.filter((j) => j.status === 'Unscheduled' && !j.bookingDeclined);
    if (filter === 'scheduled') return all.filter((j) => j.status === 'Scheduled');
    if (filter === 'completed') return all.filter((j) => j.status === 'Completed');
    return all;
  }, [jobs, filter]);

  const pendingCount = useMemo(
    () => jobs.filter((j) => j.source === 'online_booking' && j.status === 'Unscheduled' && !j.bookingDeclined).length,
    [jobs]
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bookings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Online booking requests from customers
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-harvest-amber/20 text-harvest-amber">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-midnight rounded-lg p-1 w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors min-h-[36px] ${
              filter === tab.key
                ? 'bg-charcoal text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-charcoal rounded-xl border border-slate-700/30 p-12 text-center">
          <p className="text-slate-400">
            {filter === 'all'
              ? 'No bookings yet. Share your booking link to start receiving online bookings.'
              : `No ${filter} bookings.`}
          </p>
        </div>
      ) : (
        <div className={isMobile ? 'bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden' : 'space-y-3'}>
          {bookings.map((job) => {
            const details = job.bookingDetails || {};
            const isPending = job.status === 'Unscheduled' && !job.bookingDeclined;
            const statusClass = job.bookingDeclined
              ? 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30'
              : (STATUS_COLORS[job.status] || 'bg-slate-700/30 text-slate-400 border border-slate-700');

            if (isMobile) {
              return (
                <div
                  key={job.id}
                  className="border-b border-slate-700/30 p-4 last:border-b-0 cursor-pointer"
                  onClick={() => onSelectJob(job)}
                >
                  {/* Row 1: Client name + Status */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-slate-100 font-semibold truncate">
                      {details.customerName || getClientNameById(job.clientId)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusClass}`}>
                      {job.bookingDeclined ? 'Declined' : job.status}
                    </span>
                  </div>
                  {/* Row 2: Service requested */}
                  <p className="text-sm text-slate-400 truncate">{job.title}</p>
                  {/* Row 3: Date/time + Actions */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-xs text-slate-500">
                      {job.start && new Date(job.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {job.start && ` at ${new Date(job.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                    </span>
                    {isPending && (
                      <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onApproveBooking(job)}
                          className="px-3 py-2 bg-scaffld-teal hover:bg-scaffld-teal-deep text-white rounded-lg text-xs font-medium transition-colors min-h-[44px]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onDeclineBooking(job)}
                          className="px-3 py-2 bg-midnight hover:bg-slate-700 text-signal-coral rounded-lg text-xs font-medium border border-signal-coral/30 transition-colors min-h-[44px]"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={job.id}
                className="bg-charcoal rounded-xl border border-slate-700/30 p-4 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => onSelectJob(job)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-slate-100 font-medium truncate">{job.title}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {job.bookingDeclined ? 'Declined' : job.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {details.customerName || getClientNameById(job.clientId)}
                      {details.customerEmail && <span className="text-slate-500"> &middot; {details.customerEmail}</span>}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {job.start && new Date(job.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {job.start && ` at ${new Date(job.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      {details.serviceDuration && <span> &middot; {details.serviceDuration} min</span>}
                    </p>
                  </div>

                  {/* Price */}
                  {details.servicePrice > 0 && (
                    <div className="text-right">
                      <p className="text-scaffld-teal font-semibold">{formatCurrency(details.servicePrice / 100)}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <div className="flex gap-2 sm:ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onApproveBooking(job)}
                        className="px-3 py-2 bg-scaffld-teal hover:bg-scaffld-teal-deep text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onDeclineBooking(job)}
                        className="px-3 py-2 bg-midnight hover:bg-slate-700 text-signal-coral rounded-lg text-sm font-medium border border-signal-coral/30 transition-colors min-h-[44px]"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
