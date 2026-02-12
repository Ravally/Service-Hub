// src/components/timesheets/TimeEntryForm.jsx
import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../../utils';

/**
 * Time Entry Form Component
 * For manual time entry creation and editing
 */
export default function TimeEntryForm({
  entry = null,
  job = null,
  staff = [],
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    staffId: '',
    start: '',
    end: '',
    hours: '',
    rate: '',
    cost: '',
    note: '',
    billable: true,
  });

  const [autoCalculate, setAutoCalculate] = useState(true);

  // Initialize form with existing entry or defaults
  useEffect(() => {
    if (entry) {
      setFormData({
        staffId: entry.staffId || '',
        start: entry.start ? formatToLocalInput(entry.start) : '',
        end: entry.end ? formatToLocalInput(entry.end) : '',
        hours: entry.hours || '',
        rate: entry.rate || '',
        cost: entry.cost || '',
        note: entry.note || '',
        billable: entry.billable !== false,
      });
      setAutoCalculate(false); // Editing mode, don't auto-calculate
    } else {
      // New entry defaults
      setFormData({
        staffId: '',
        start: formatToLocalInput(new Date().toISOString()),
        end: '',
        hours: '',
        rate: '',
        cost: '',
        note: '',
        billable: true,
      });
    }
  }, [entry]);

  // Auto-fill staff rate when staff is selected
  useEffect(() => {
    if (formData.staffId && staff.length > 0) {
      const selectedStaff = staff.find((s) => s.id === formData.staffId);
      if (selectedStaff && selectedStaff.hourlyRate && !formData.rate) {
        setFormData((prev) => ({
          ...prev,
          rate: selectedStaff.hourlyRate,
        }));
      }
    }
  }, [formData.staffId, staff]);

  // Auto-calculate hours when start/end change
  useEffect(() => {
    if (autoCalculate && formData.start && formData.end) {
      const startTime = new Date(formData.start);
      const endTime = new Date(formData.end);
      const hours = (endTime - startTime) / (1000 * 60 * 60);

      if (hours > 0 && hours < 24) {
        setFormData((prev) => ({
          ...prev,
          hours: hours.toFixed(2),
        }));
      }
    }
  }, [formData.start, formData.end, autoCalculate]);

  // Auto-calculate cost when hours/rate change
  useEffect(() => {
    if (autoCalculate && formData.hours && formData.rate) {
      const cost = Number(formData.hours) * Number(formData.rate);
      setFormData((prev) => ({
        ...prev,
        cost: cost.toFixed(2),
      }));
    }
  }, [formData.hours, formData.rate, autoCalculate]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Disable auto-calculate if user manually changes hours or cost
    if (field === 'hours' || field === 'cost') {
      setAutoCalculate(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.staffId) {
      alert('Please select a staff member');
      return;
    }

    if (!formData.start) {
      alert('Please enter a start time');
      return;
    }

    if (!formData.hours && !formData.end) {
      alert('Please enter either an end time or hours');
      return;
    }

    // Get staff name
    const selectedStaff = staff.find((s) => s.id === formData.staffId);

    const timeEntry = {
      staffId: formData.staffId,
      staffName: selectedStaff?.name || '',
      start: formData.start,
      end: formData.end || null,
      hours: Number(formData.hours) || 0,
      rate: Number(formData.rate) || 0,
      cost: Number(formData.cost) || 0,
      note: formData.note,
      billable: formData.billable,
    };

    onSave(timeEntry);
  };

  const formatToLocalInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  return (
    <div className="bg-charcoal rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        {entry ? 'Edit Time Entry' : 'Add Time Entry'}
        {job && <span className="text-sm text-slate-400 ml-2">for {job.title}</span>}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Staff Member */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Staff Member <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.staffId}
            onChange={(e) => handleChange('staffId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
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

        {/* Date/Time Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start}
              onChange={(e) => handleChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              value={formData.end}
              onChange={(e) => handleChange('end', e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Hours, Rate, Cost Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Hours
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.hours}
              onChange={(e) => handleChange('hours', e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {autoCalculate && formData.start && formData.end && (
              <p className="text-xs text-slate-400 mt-1">Auto-calculated</p>
            )}
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Hourly Rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => handleChange('rate', e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total Cost */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Total Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            {autoCalculate && formData.hours && formData.rate && (
              <p className="text-xs text-slate-400 mt-1">Auto-calculated</p>
            )}
          </div>
        </div>

        {/* Billable Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="billable"
            checked={formData.billable}
            onChange={(e) => handleChange('billable', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-700 rounded"
          />
          <label htmlFor="billable" className="ml-2 block text-sm text-slate-300">
            Billable time
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add notes about this time entry..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/30">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-charcoal border border-slate-700 rounded-md hover:bg-midnight/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {entry ? 'Update Entry' : 'Add Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
