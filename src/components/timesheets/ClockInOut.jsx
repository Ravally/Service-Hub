// src/components/timesheets/ClockInOut.jsx
import React, { useState, useEffect } from 'react';
import { useTimeTracking } from '../../hooks/data';
import { formatDateTime } from '../../utils';

/**
 * Clock In/Out Component
 * Simple interface for staff to clock in and out of jobs
 */
export default function ClockInOut({ job, currentUserId, staff = [] }) {
  const {
    getActiveEntry,
    clockIn,
    clockOut,
  } = useTimeTracking();

  const [activeEntry, setActiveEntry] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState(currentUserId || '');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for active entry on mount and when job/staff changes
  useEffect(() => {
    if (job && selectedStaffId) {
      const entry = getActiveEntry(job.id, selectedStaffId);
      setActiveEntry(entry);
    } else {
      setActiveEntry(null);
    }
  }, [job, selectedStaffId, getActiveEntry]);

  // Update elapsed time every second if clocked in
  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateTimer = () => {
      const start = new Date(activeEntry.start);
      const now = new Date();
      const diff = now - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleClockIn = async () => {
    if (!selectedStaffId) {
      alert('Please select a staff member');
      return;
    }

    if (!job) {
      alert('Please select a job');
      return;
    }

    setIsProcessing(true);

    try {
      const entry = await clockIn(job.id, selectedStaffId);
      setActiveEntry(entry);
      alert('Successfully clocked in!');
    } catch (error) {
      alert(error.message || 'Failed to clock in');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;

    const confirmed = window.confirm(
      'Clock out now? This will end your current time entry.'
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      const result = await clockOut(job.id, selectedStaffId);
      setActiveEntry(null);
      alert(`Successfully clocked out! Total time: ${result.hours.toFixed(2)} hours`);
    } catch (error) {
      alert(error.message || 'Failed to clock out');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  return (
    <div className="bg-charcoal rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100">Time Clock</h3>
        {job && (
          <p className="text-sm text-slate-400 mt-1">
            Job: <span className="font-medium">{job.jobNumber || job.id.substring(0, 8)}</span> - {job.title}
          </p>
        )}
      </div>

      {/* Staff Selection */}
      {!activeEntry && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Staff Member
          </label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          >
            <option value="">Select staff member</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.hourlyRate ? ` ($${s.hourlyRate}/hr)` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clock Display */}
      {activeEntry ? (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6 text-center">
          <div className="text-sm text-green-700 font-medium mb-2">CLOCKED IN</div>
          <div className="text-4xl font-bold text-green-700 mb-2 font-mono">{elapsedTime}</div>
          <div className="text-sm text-green-600">
            {selectedStaff?.name || 'Unknown Staff'}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Started: {formatDateTime(activeEntry.start)}
          </div>
          {activeEntry.rate > 0 && (
            <div className="text-xs text-green-600 mt-1">
              Current cost: ${((parseFloat(elapsedTime.split(':')[0]) + parseFloat(elapsedTime.split(':')[1]) / 60) * activeEntry.rate).toFixed(2)}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-midnight/60 border-2 border-slate-700 rounded-lg p-6 mb-6 text-center">
          <div className="text-sm text-slate-400 font-medium mb-2">NOT CLOCKED IN</div>
          <div className="text-4xl font-bold text-slate-500 mb-2 font-mono">00:00:00</div>
          <div className="text-sm text-slate-400">
            {selectedStaff?.name || 'Select a staff member'}
          </div>
        </div>
      )}

      {/* Clock In/Out Buttons */}
      <div className="space-y-3">
        {!activeEntry ? (
          <button
            onClick={handleClockIn}
            disabled={isProcessing || !selectedStaffId || !job}
            className="w-full px-6 py-4 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {isProcessing ? 'Clocking In...' : '▶ Clock In'}
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={isProcessing}
            className="w-full px-6 py-4 text-lg font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {isProcessing ? 'Clocking Out...' : '⏹ Clock Out'}
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-slate-400 text-center">
        {!activeEntry
          ? 'Click "Clock In" to start tracking time on this job'
          : 'Click "Clock Out" when you finish working'}
      </div>
    </div>
  );
}
