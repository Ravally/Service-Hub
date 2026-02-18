import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

/**
 * Modal for clients to request service from the portal
 */
export default function ServiceRequestModal({ uid, clientId, clientName, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    serviceType: '',
    preferredDate: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const serviceTypes = [
    'General Service',
    'Maintenance',
    'Repair',
    'Installation',
    'Consultation',
    'Emergency Service',
    'Other',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Create service request document
      await addDoc(collection(db, `users/${uid}/serviceRequests`), {
        clientId,
        clientName,
        serviceType: formData.serviceType,
        preferredDate: formData.preferredDate,
        notes: formData.notes,
        status: 'New',
        createdAt: new Date().toISOString(),
        source: 'Client Portal',
      });

      // Create notification for the business
      await addDoc(collection(db, `users/${uid}/notifications`), {
        message: `New service request from ${clientName}: ${formData.serviceType}`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'service_request',
        clientId,
      });

      // Success!
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error submitting service request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 animate-fade-in-fast max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">Request Service</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-300 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-signal-coral/10 border border-signal-coral/30 text-signal-coral rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => handleChange('serviceType', e.target.value)}
                required
                className="w-full min-h-[44px] px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-scaffld-teal focus:border-scaffld-teal"
              >
                <option value="">Select a service type</option>
                {serviceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Preferred Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Preferred Date (optional)
              </label>
              <input
                type="date"
                value={formData.preferredDate}
                onChange={(e) => handleChange('preferredDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full min-h-[44px] px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 focus:ring-scaffld-teal focus:border-scaffld-teal"
              />
              <p className="mt-1 text-xs text-slate-400">
                We'll try to accommodate your preferred date, but it's not guaranteed.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                placeholder="Please describe what you need help with..."
                className="w-full min-h-[44px] px-3 py-2 border border-slate-700 rounded-md bg-midnight text-slate-100 placeholder-slate-500 focus:ring-scaffld-teal focus:border-scaffld-teal"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] px-4 py-2 border border-slate-700 text-slate-300 rounded-md hover:bg-midnight/60 font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[44px] px-4 py-2 bg-scaffld-teal text-white rounded-md hover:bg-scaffld-teal/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-center text-slate-400">
          We'll review your request and contact you within 1-2 business days.
        </p>
      </div>
    </div>
  );
}
