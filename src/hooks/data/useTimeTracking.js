// src/hooks/data/useTimeTracking.js
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../contexts/AppStateContext';
import { formatDateTime } from '../../utils';

/**
 * Time Tracking Hook
 * Manages labor entries across all jobs with clock in/out functionality
 */
export function useTimeTracking() {
  const { userId } = useAuth();
  const { jobs, setJobs, staff = [] } = useAppState();
  const [activeTimers, setActiveTimers] = useState({});

  // Get all time entries across all jobs
  const allTimeEntries = useMemo(() => {
    const entries = [];
    jobs.forEach((job) => {
      if (Array.isArray(job.laborEntries)) {
        job.laborEntries.forEach((entry) => {
          entries.push({
            ...entry,
            jobId: job.id,
            jobTitle: job.title,
            jobNumber: job.jobNumber,
            clientId: job.clientId,
          });
        });
      }
    });
    return entries.sort((a, b) => {
      const aDate = new Date(a.start || a.createdAt || 0);
      const bDate = new Date(b.start || b.createdAt || 0);
      return bDate - aDate; // Newest first
    });
  }, [jobs]);

  // Add time entry to a job
  const addTimeEntry = useCallback(
    async (jobId, entryData) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      const newEntry = {
        id: `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        staffId: entryData.staffId || '',
        staffName: entryData.staffName || '',
        start: entryData.start || new Date().toISOString(),
        end: entryData.end || null,
        hours: entryData.hours || 0,
        rate: entryData.rate || 0,
        cost: entryData.cost || 0,
        note: entryData.note || '',
        createdAt: new Date().toISOString(),
        billable: entryData.billable !== false,
      };

      const updatedLaborEntries = [...(job.laborEntries || []), newEntry];

      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === jobId ? { ...j, laborEntries: updatedLaborEntries } : j
        )
      );

      return newEntry;
    },
    [jobs, setJobs]
  );

  // Update time entry
  const updateTimeEntry = useCallback(
    async (jobId, entryId, updates) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      const updatedLaborEntries = (job.laborEntries || []).map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      );

      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === jobId ? { ...j, laborEntries: updatedLaborEntries } : j
        )
      );
    },
    [jobs, setJobs]
  );

  // Delete time entry
  const deleteTimeEntry = useCallback(
    async (jobId, entryId) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      const updatedLaborEntries = (job.laborEntries || []).filter(
        (entry) => entry.id !== entryId
      );

      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === jobId ? { ...j, laborEntries: updatedLaborEntries } : j
        )
      );
    },
    [jobs, setJobs]
  );

  // Clock in - creates entry with start time, no end time
  const clockIn = useCallback(
    async (jobId, staffId) => {
      const staffMember = staff.find((s) => s.id === staffId);
      if (!staffMember) {
        throw new Error('Staff member not found');
      }

      // Check if already clocked in on this job
      const job = jobs.find((j) => j.id === jobId);
      const existingActive = (job?.laborEntries || []).find(
        (entry) => entry.staffId === staffId && !entry.end
      );

      if (existingActive) {
        throw new Error('Already clocked in on this job');
      }

      const entry = await addTimeEntry(jobId, {
        staffId,
        staffName: staffMember.name,
        start: new Date().toISOString(),
        end: null,
        rate: staffMember.hourlyRate || 0,
        note: 'Clocked in',
      });

      // Track active timer locally
      setActiveTimers((prev) => ({
        ...prev,
        [`${jobId}_${staffId}`]: entry.id,
      }));

      return entry;
    },
    [jobs, staff, addTimeEntry]
  );

  // Clock out - sets end time and calculates hours
  const clockOut = useCallback(
    async (jobId, staffId) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      const activeEntry = (job.laborEntries || []).find(
        (entry) => entry.staffId === staffId && !entry.end
      );

      if (!activeEntry) {
        throw new Error('No active clock-in found');
      }

      const endTime = new Date();
      const startTime = new Date(activeEntry.start);
      const hours = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
      const cost = hours * (activeEntry.rate || 0);

      await updateTimeEntry(jobId, activeEntry.id, {
        end: endTime.toISOString(),
        hours: Number(hours.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        note: activeEntry.note === 'Clocked in' ? 'Clocked out' : activeEntry.note,
      });

      // Remove from active timers
      setActiveTimers((prev) => {
        const next = { ...prev };
        delete next[`${jobId}_${staffId}`];
        return next;
      });

      return { hours, cost };
    },
    [jobs, updateTimeEntry]
  );

  // Get active entry for a staff member on a job
  const getActiveEntry = useCallback(
    (jobId, staffId) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return null;

      return (job.laborEntries || []).find(
        (entry) => entry.staffId === staffId && !entry.end
      );
    },
    [jobs]
  );

  // Calculate hours between two timestamps
  const calculateHours = useCallback((start, end) => {
    if (!start || !end) return 0;
    const startTime = new Date(start);
    const endTime = new Date(end);
    return Number(((endTime - startTime) / (1000 * 60 * 60)).toFixed(2));
  }, []);

  // Get entries by staff member
  const getEntriesByStaff = useCallback(
    (staffId, startDate, endDate) => {
      let filtered = allTimeEntries.filter(
        (entry) => entry.staffId === staffId
      );

      if (startDate) {
        filtered = filtered.filter(
          (entry) => new Date(entry.start) >= new Date(startDate)
        );
      }

      if (endDate) {
        filtered = filtered.filter(
          (entry) => new Date(entry.start) <= new Date(endDate)
        );
      }

      return filtered;
    },
    [allTimeEntries]
  );

  // Get entries by job
  const getEntriesByJob = useCallback(
    (jobId) => {
      return allTimeEntries.filter((entry) => entry.jobId === jobId);
    },
    [allTimeEntries]
  );

  // Calculate total hours
  const calculateTotalHours = useCallback((entries) => {
    return entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  }, []);

  // Calculate total cost
  const calculateTotalCost = useCallback((entries) => {
    return entries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
  }, []);

  // Get timesheet summary by staff
  const getTimesheetSummary = useCallback(
    (startDate, endDate) => {
      let entries = allTimeEntries;

      if (startDate) {
        entries = entries.filter(
          (entry) => new Date(entry.start) >= new Date(startDate)
        );
      }

      if (endDate) {
        entries = entries.filter(
          (entry) => new Date(entry.start) <= new Date(endDate)
        );
      }

      const byStaff = {};

      entries.forEach((entry) => {
        const staffId = entry.staffId || 'unknown';
        if (!byStaff[staffId]) {
          byStaff[staffId] = {
            staffId,
            staffName: entry.staffName || 'Unknown',
            totalHours: 0,
            totalCost: 0,
            entries: [],
          };
        }

        byStaff[staffId].totalHours += entry.hours || 0;
        byStaff[staffId].totalCost += entry.cost || 0;
        byStaff[staffId].entries.push(entry);
      });

      return Object.values(byStaff);
    },
    [allTimeEntries]
  );

  return {
    allTimeEntries,
    activeTimers,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    clockIn,
    clockOut,
    getActiveEntry,
    calculateHours,
    getEntriesByStaff,
    getEntriesByJob,
    calculateTotalHours,
    calculateTotalCost,
    getTimesheetSummary,
  };
}
