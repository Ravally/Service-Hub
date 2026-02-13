import React, { useState } from 'react';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';
import { generateBookingToken } from '../../utils/bookingUtils';

export default function BookingSettingsTab({ companySettings, cs, csn, handleSaveSettings, userId }) {
  const booking = companySettings.onlineBooking || {};
  const services = booking.services || [];
  const [newService, setNewService] = useState({ name: '', duration: 60, price: 0, description: '' });
  const [editingId, setEditingId] = useState(null);
  const [copied, setCopied] = useState(false);

  const bookingUrl = `${window.location.origin}?bookingToken=${generateBookingToken(userId)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddService = () => {
    if (!newService.name.trim()) return;
    const svc = {
      id: `svc_${Date.now()}`,
      name: newService.name.trim(),
      duration: parseInt(newService.duration) || 60,
      price: Math.round((parseFloat(newService.price) || 0) * 100),
      description: newService.description.trim(),
    };
    csn('onlineBooking', { services: [...services, svc] });
    setNewService({ name: '', duration: 60, price: 0, description: '' });
  };

  const handleRemoveService = (id) => {
    csn('onlineBooking', { services: services.filter((s) => s.id !== id) });
  };

  const handleUpdateService = (id, updates) => {
    csn('onlineBooking', {
      services: services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
    setEditingId(null);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Online Booking</h3>
      <form onSubmit={handleSaveSettings}>
        {/* Enable/Disable */}
        <div className={sectionCls}>
          <Toggle
            checked={booking.enabled || false}
            onChange={(v) => csn('onlineBooking', { enabled: v })}
            label="Enable online booking"
          />
          {booking.enabled && (
            <p className="text-xs text-slate-500 mt-2">
              Customers can book appointments through your booking link.
            </p>
          )}
        </div>

        {/* Booking Link */}
        {booking.enabled && (
          <div className={sectionCls}>
            <h4 className={sectionTitle}>Your Booking Link</h4>
            <div className="flex gap-2">
              <input type="text" readOnly value={bookingUrl} className={`${inputCls} flex-1 text-xs`} />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 bg-scaffld-teal/10 text-scaffld-teal rounded-md text-sm font-medium hover:bg-scaffld-teal/20 transition-colors min-h-[44px] whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Services */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Services</h4>
          {services.length > 0 && (
            <div className="space-y-2 mb-4">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center gap-3 p-3 bg-midnight rounded-lg border border-slate-700/30">
                  {editingId === svc.id ? (
                    <EditServiceRow
                      svc={svc}
                      onSave={(updates) => handleUpdateService(svc.id, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-100 font-medium text-sm">{svc.name}</p>
                        <p className="text-xs text-slate-500">
                          {svc.duration} min
                          {svc.price > 0 && ` · $${(svc.price / 100).toFixed(2)}`}
                        </p>
                      </div>
                      <button type="button" onClick={() => setEditingId(svc.id)}
                        className="text-xs text-slate-400 hover:text-scaffld-teal transition-colors min-h-[44px] px-2">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleRemoveService(svc.id)}
                        className="text-xs text-slate-400 hover:text-signal-coral transition-colors min-h-[44px] px-2">
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Service Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g. House Wash" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Duration (min)</label>
              <select value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} className={inputCls}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Price ($)</label>
              <input type="number" min="0" step="0.01" value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                placeholder="0.00" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={handleAddService}
                className="w-full px-4 py-2 bg-scaffld-teal/10 text-scaffld-teal rounded-md text-sm font-medium hover:bg-scaffld-teal/20 transition-colors min-h-[44px]">
                Add Service
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className={labelCls}>Description (optional)</label>
            <input type="text" value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              placeholder="Brief description of the service" className={inputCls} />
          </div>
        </div>

        {/* Preferences */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Preferences</h4>
          <div className="space-y-4">
            <Toggle
              checked={booking.requireApproval || false}
              onChange={(v) => csn('onlineBooking', { requireApproval: v })}
              label="Require manual approval for bookings"
            />
            <Toggle
              checked={booking.allowSameDay !== false}
              onChange={(v) => csn('onlineBooking', { allowSameDay: v })}
              label="Allow same-day bookings"
            />
            <div>
              <label className={labelCls}>Max Advance Booking (days)</label>
              <input type="number" min="1" max="365" value={booking.maxAdvanceDays || 60}
                onChange={(e) => csn('onlineBooking', { maxAdvanceDays: parseInt(e.target.value) || 60 })}
                className={`${inputCls} max-w-[120px]`} />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Messages</h4>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Confirmation Message</label>
              <textarea value={booking.bookingMessage || ''} rows={2}
                onChange={(e) => csn('onlineBooking', { bookingMessage: e.target.value })}
                placeholder="Thank you for booking with us!" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cancellation Policy</label>
              <textarea value={booking.cancellationPolicy || ''} rows={2}
                onChange={(e) => csn('onlineBooking', { cancellationPolicy: e.target.value })}
                placeholder="Optional cancellation policy text" className={inputCls} />
            </div>
          </div>
        </div>

        <button type="submit" className={saveBtnCls}>Save</button>
      </form>
    </div>
  );
}

function EditServiceRow({ svc, onSave, onCancel }) {
  const [name, setName] = useState(svc.name);
  const [duration, setDuration] = useState(svc.duration);
  const [price, setPrice] = useState((svc.price / 100).toFixed(2));

  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-2">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} text-sm`} />
      <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className={`${inputCls} text-sm w-28`}>
        <option value={15}>15 min</option>
        <option value={30}>30 min</option>
        <option value={45}>45 min</option>
        <option value={60}>1 hr</option>
        <option value={90}>1.5 hr</option>
        <option value={120}>2 hr</option>
      </select>
      <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} text-sm w-24`} placeholder="$" />
      <button type="button" onClick={() => onSave({ name: name.trim(), duration, price: Math.round(parseFloat(price || 0) * 100) })}
        className="text-xs text-scaffld-teal hover:underline min-h-[44px] px-2">Save</button>
      <button type="button" onClick={onCancel}
        className="text-xs text-slate-400 hover:underline min-h-[44px] px-2">Cancel</button>
    </div>
  );
}
