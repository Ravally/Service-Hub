// src/components/timesheets/TimesheetView.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../contexts/AppStateContext';
import { useTimeTracking } from '../../hooks/data';
import { formatCurrency, formatDate, formatDateTime } from '../../utils';
import TimeEntryForm from './TimeEntryForm';

/**
 * Timesheet View Component
 * Main interface for viewing and managing all time entries
 */
export default function TimesheetView({
  onExportPayroll,
  onOpenJob,
}) {
  const { userId } = useAuth();
  const { jobs, clients, staff = [] } = useAppState();
  const {
    allTimeEntries,
    getTimesheetSummary,
    updateTimeEntry,
    deleteTimeEntry,
    addTimeEntry,
    calculateTotalHours,
    calculateTotalCost,
  } = useTimeTracking();

  // Filters
  const [filterStaffId, setFilterStaffId] = useState('');
  const [filterJobId, setFilterJobId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [groupBy, setGroupBy] = useState('date'); // 'date', 'staff', 'job'
  const [payrollFormat, setPayrollFormat] = useState('xero'); // 'xero', 'myob', 'standard', 'gusto', 'quickbooks'

  // UI State
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // Get default date range (current week)
  useMemo(() => {
    if (!filterDateStart && !filterDateEnd) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999);

      setFilterDateStart(startOfWeek.toISOString().split('T')[0]);
      setFilterDateEnd(endOfWeek.toISOString().split('T')[0]);
    }
  }, []);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let entries = [...allTimeEntries];

    // Filter by staff
    if (filterStaffId) {
      entries = entries.filter((e) => e.staffId === filterStaffId);
    }

    // Filter by job
    if (filterJobId) {
      entries = entries.filter((e) => e.jobId === filterJobId);
    }

    // Filter by date range
    if (filterDateStart) {
      entries = entries.filter((e) => {
        const entryDate = new Date(e.start);
        return entryDate >= new Date(filterDateStart);
      });
    }

    if (filterDateEnd) {
      entries = entries.filter((e) => {
        const entryDate = new Date(e.start);
        const endDate = new Date(filterDateEnd);
        endDate.setHours(23, 59, 59, 999);
        return entryDate <= endDate;
      });
    }

    return entries;
  }, [allTimeEntries, filterStaffId, filterJobId, filterDateStart, filterDateEnd]);

  // Grouped entries
  const groupedEntries = useMemo(() => {
    const groups = {};

    filteredEntries.forEach((entry) => {
      let key;
      let label;

      switch (groupBy) {
        case 'staff':
          key = entry.staffId || 'unknown';
          label = entry.staffName || 'Unknown Staff';
          break;
        case 'job':
          key = entry.jobId || 'unknown';
          label = entry.jobTitle || entry.jobNumber || 'Unknown Job';
          break;
        case 'date':
        default:
          const date = new Date(entry.start);
          key = date.toISOString().split('T')[0];
          label = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          break;
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          entries: [],
          totalHours: 0,
          totalCost: 0,
        };
      }

      groups[key].entries.push(entry);
      groups[key].totalHours += entry.hours || 0;
      groups[key].totalCost += entry.cost || 0;
    });

    // Sort groups by key (newest first for dates)
    return Object.values(groups).sort((a, b) => {
      if (groupBy === 'date') {
        return b.key.localeCompare(a.key); // Newest date first
      }
      return a.label.localeCompare(b.label); // Alphabetical for others
    });
  }, [filteredEntries, groupBy]);

  // Summary stats
  const summaryStats = useMemo(() => {
    return {
      totalHours: calculateTotalHours(filteredEntries),
      totalCost: calculateTotalCost(filteredEntries),
      entryCount: filteredEntries.length,
      billableHours: calculateTotalHours(
        filteredEntries.filter((e) => e.billable !== false)
      ),
      billableCost: calculateTotalCost(
        filteredEntries.filter((e) => e.billable !== false)
      ),
    };
  }, [filteredEntries, calculateTotalHours, calculateTotalCost]);

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setSelectedJob(jobs.find((j) => j.id === entry.jobId));
    setShowEntryForm(true);
  };

  const handleDeleteEntry = (entry) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    deleteTimeEntry(entry.jobId, entry.id);
  };

  const handleSaveEntry = (entryData) => {
    if (editingEntry) {
      // Update existing entry
      updateTimeEntry(editingEntry.jobId, editingEntry.id, entryData);
    } else {
      // Add new entry
      if (!selectedJob) {
        alert('Please select a job');
        return;
      }
      addTimeEntry(selectedJob.id, entryData);
    }

    setShowEntryForm(false);
    setEditingEntry(null);
    setSelectedJob(null);
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setSelectedJob(null);
    setShowEntryForm(true);
  };

  const handleSetDateRange = (range) => {
    const now = new Date();
    let start, end;

    switch (range) {
      case 'today':
        start = new Date(now);
        end = new Date(now);
        break;
      case 'this-week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'last-week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    setFilterDateStart(start.toISOString().split('T')[0]);
    setFilterDateEnd(end.toISOString().split('T')[0]);
  };

  const getClientName = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return '';
    const client = clients.find((c) => c.id === job.clientId);
    return client?.name || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Timesheets</h2>
        <div className="flex gap-2">
          {/* Payroll Format Selector */}
          <select
            value={payrollFormat}
            onChange={(e) => setPayrollFormat(e.target.value)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="xero">Xero (NZ)</option>
            <option value="myob">MYOB (NZ)</option>
            <option value="standard">Standard CSV</option>
            <option value="gusto">Gusto</option>
            <option value="quickbooks">QuickBooks</option>
          </select>
          <button
            onClick={() => onExportPayroll && onExportPayroll(filteredEntries, payrollFormat)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={filteredEntries.length === 0}
          >
            📊 Export for Payroll
          </button>
          <button
            onClick={handleNewEntry}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            + Add Time Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Hours</div>
          <div className="text-2xl font-bold text-gray-900">
            {summaryStats.totalHours.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summaryStats.entryCount} entries
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Cost</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summaryStats.totalCost)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Billable Hours</div>
          <div className="text-2xl font-bold text-green-600">
            {summaryStats.billableHours.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Billable Cost</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summaryStats.billableCost)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member
            </label>
            <select
              value={filterStaffId}
              onChange={(e) => setFilterStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Job Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job
            </label>
            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber || j.id.substring(0, 8)} - {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Quick Date Range Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => handleSetDateRange('today')}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Today
          </button>
          <button
            onClick={() => handleSetDateRange('this-week')}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            This Week
          </button>
          <button
            onClick={() => handleSetDateRange('last-week')}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Last Week
          </button>
          <button
            onClick={() => handleSetDateRange('this-month')}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            This Month
          </button>
          <button
            onClick={() => handleSetDateRange('last-month')}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Last Month
          </button>
        </div>

        {/* Group By */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupBy('date')}
              className={`px-3 py-1 text-sm rounded-md ${
                groupBy === 'date'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => setGroupBy('staff')}
              className={`px-3 py-1 text-sm rounded-md ${
                groupBy === 'staff'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => setGroupBy('job')}
              className={`px-3 py-1 text-sm rounded-md ${
                groupBy === 'job'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Job
            </button>
          </div>
        </div>
      </div>

      {/* Time Entry Form Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {!selectedJob && !editingEntry ? (
              /* Job Selection */
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Select a Job
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">
                        {job.jobNumber || job.id.substring(0, 8)} - {job.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getClientName(job.id)}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowEntryForm(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Time Entry Form */
              <TimeEntryForm
                entry={editingEntry}
                job={selectedJob || jobs.find((j) => j.id === editingEntry?.jobId)}
                staff={staff}
                onSave={handleSaveEntry}
                onCancel={() => {
                  setShowEntryForm(false);
                  setEditingEntry(null);
                  setSelectedJob(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No time entries found for the selected filters.</p>
          <button
            onClick={handleNewEntry}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add First Time Entry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {groupedEntries.map((group) => (
            <div key={group.key} className="border-b border-gray-200 last:border-b-0">
              {/* Group Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {group.label}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{group.totalHours.toFixed(2)} hours</span>
                    <span>{formatCurrency(group.totalCost)}</span>
                  </div>
                </div>
              </div>

              {/* Group Entries */}
              <div className="divide-y divide-gray-200">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.staffName || 'Unknown Staff'}
                          </span>
                          {entry.billable === false && (
                            <span className="px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded">
                              Non-billable
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {entry.jobNumber || entry.jobId?.substring(0, 8)} - {entry.jobTitle}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDateTime(entry.start)}
                          {entry.end && ` → ${formatDateTime(entry.end)}`}
                        </div>
                        {entry.note && (
                          <div className="text-sm text-gray-600 mt-2 italic">
                            {entry.note}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 ml-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {entry.hours?.toFixed(2) || '0.00'} hrs
                          </div>
                          {entry.rate > 0 && (
                            <div className="text-xs text-gray-500">
                              ${entry.rate}/hr
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900 mt-1">
                            {formatCurrency(entry.cost)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
