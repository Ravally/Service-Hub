import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { initialInvoiceSettings } from '../constants';
import { formatCurrency } from '../utils';
import {
  generateTimeSlots, getAvailableSlots, isWorkingDay,
  toDateString, formatTimeSlot,
} from '../utils/bookingUtils';

const STEPS = ['service', 'datetime', 'details', 'confirmation'];

export default function PublicBookingPage({ context }) {
  const { uid, companySettings } = context;
  const booking = companySettings.onlineBooking || {};
  const services = booking.services || [];

  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState('');

  if (!booking.enabled) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <div className="bg-charcoal rounded-xl shadow-lg p-6 border border-slate-700/30 max-w-lg w-full text-center">
          <p className="text-slate-300">Online booking is not currently available.</p>
        </div>
      </div>
    );
  }

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    const dateStr = toDateString(selectedDate);
    setLoadingSlots(true);
    setSelectedSlot(null);

    (async () => {
      try {
        const jobsRef = collection(db, `users/${uid}/jobs`);
        const q = query(jobsRef, where('start', '>=', `${dateStr}T00:00`), where('start', '<=', `${dateStr}T23:59`));
        const snap = await getDocs(q);
        const dayJobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const duration = selectedService.duration || companySettings.defaultAppointmentDuration || 60;
        const buffer = companySettings.bufferTimeBetweenJobs || 0;
        const allSlots = generateTimeSlots(
          companySettings.workingHoursStart || '07:00',
          companySettings.workingHoursEnd || '17:00',
          duration,
          buffer
        );
        const open = getAvailableSlots(dateStr, allSlots, dayJobs, buffer);
        setAvailableSlots(open);
      } catch (err) {
        console.error('Failed to load availability:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [selectedDate, selectedService]);

  const handleSubmit = async () => {
    if (!customerName || !customerEmail || !selectedService || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const dateStr = toDateString(selectedDate);
      const requireApproval = booking.requireApproval;

      // Find existing client by email
      const clientsRef = collection(db, `users/${uid}/clients`);
      const cSnap = await getDocs(query(clientsRef, where('email', '==', customerEmail.toLowerCase())));
      let clientId = '';
      if (!cSnap.empty) {
        clientId = cSnap.docs[0].id;
      } else {
        const clientRef = await addDoc(clientsRef, {
          name: customerName,
          email: customerEmail.toLowerCase(),
          phone: customerPhone || '',
          status: 'Lead',
          tags: ['online-booking'],
          properties: [],
          contacts: [],
          notes: '',
          customFields: [],
          createdAt: new Date().toISOString(),
        });
        clientId = clientRef.id;
      }

      // Generate job number
      const invSettingsRef = doc(db, `users/${uid}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      const jobNumber = await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextJob || 1;
        const prefix = s.prefixJob || 'JOB';
        const padding = s.padding ?? 4;
        const composed = `${prefix}-${pad(seq, padding)}`;
        tx.set(invSettingsRef, { nextJob: seq + 1, prefixJob: prefix, padding }, { merge: true });
        return composed;
      });

      const status = requireApproval ? 'Unscheduled' : 'Scheduled';
      await addDoc(collection(db, `users/${uid}/jobs`), {
        clientId,
        title: selectedService.name,
        start: `${dateStr}T${selectedSlot.start}`,
        end: `${dateStr}T${selectedSlot.end}`,
        status,
        jobNumber,
        source: 'online_booking',
        bookingDetails: {
          customerName,
          customerEmail: customerEmail.toLowerCase(),
          customerPhone: customerPhone || '',
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceDuration: selectedService.duration,
          servicePrice: selectedService.price,
          bookedAt: new Date().toISOString(),
        },
        lineItems: selectedService.price ? [{
          type: 'line_item',
          name: selectedService.name,
          description: selectedService.description || '',
          qty: 1,
          price: selectedService.price,
          unitCost: 0,
        }] : [],
        assignees: [],
        checklist: [],
        notes: '',
        createdAt: new Date().toISOString(),
      });

      // Notification for owner
      await addDoc(collection(db, `users/${uid}/notifications`), {
        message: `New online booking: ${selectedService.name} on ${dateStr} at ${selectedSlot.start} from ${customerName}`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'online_booking',
      });

      setBooked(true);
    } catch (err) {
      console.error('Booking failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <div className="bg-charcoal rounded-xl shadow-lg p-8 border border-slate-700/30 max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-scaffld-teal/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-scaffld-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Booking {booking.requireApproval ? 'Submitted' : 'Confirmed'}!</h2>
          <p className="text-slate-400 mb-4">
            {booking.requireApproval
              ? 'Your booking request has been submitted. We\'ll confirm your appointment shortly.'
              : booking.bookingMessage || 'Thank you for booking with us!'
            }
          </p>
          <div className="bg-midnight rounded-lg p-4 text-left">
            <p className="text-sm text-slate-400">Service</p>
            <p className="text-slate-100 font-medium mb-2">{selectedService.name}</p>
            <p className="text-sm text-slate-400">Date & Time</p>
            <p className="text-slate-100 font-medium">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTimeSlot(selectedSlot.start, selectedSlot.end)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canGoNext = () => {
    if (step === 0) return !!selectedService;
    if (step === 1) return !!selectedSlot;
    if (step === 2) return customerName.trim() && customerEmail.trim() && customerEmail.includes('@');
    return false;
  };

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4 md:p-6">
      <div className="bg-charcoal rounded-xl shadow-lg p-6 md:p-8 border border-slate-700/30 max-w-2xl w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">{companySettings.name || 'Book an Appointment'}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 0 && 'Select a service'}
            {step === 1 && 'Choose a date and time'}
            {step === 2 && 'Your details'}
            {step === 3 && 'Review and confirm'}
          </p>
          {/* Step indicators */}
          <div className="flex gap-2 mt-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-scaffld-teal' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        {/* Step 0: Service Selection */}
        {step === 0 && (
          <div className="space-y-3">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setSelectedService(svc)}
                className={`w-full text-left p-4 rounded-lg border transition-all min-h-[56px] ${
                  selectedService?.id === svc.id
                    ? 'border-scaffld-teal bg-scaffld-teal/10'
                    : 'border-slate-700 bg-midnight hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-100 font-medium">{svc.name}</p>
                    {svc.description && <p className="text-sm text-slate-400 mt-1">{svc.description}</p>}
                    <p className="text-xs text-slate-500 mt-1">{svc.duration} min</p>
                  </div>
                  {svc.price > 0 && (
                    <span className="text-scaffld-teal font-semibold whitespace-nowrap ml-4">
                      {formatCurrency(svc.price / 100)}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-slate-400 text-center py-8">No services available for booking.</p>
            )}
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <DateTimeStep
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            availableSlots={availableSlots}
            loadingSlots={loadingSlots}
            workingDays={companySettings.workingDays}
            allowSameDay={booking.allowSameDay !== false}
            maxAdvanceDays={booking.maxAdvanceDays || 60}
          />
        )}

        {/* Step 2: Contact Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
              <input
                type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-3 border border-slate-700 rounded-lg bg-midnight text-slate-100 focus:ring-scaffld-teal/30 focus:border-scaffld-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input
                type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-3 border border-slate-700 rounded-lg bg-midnight text-slate-100 focus:ring-scaffld-teal/30 focus:border-scaffld-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
              <input
                type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-3 border border-slate-700 rounded-lg bg-midnight text-slate-100 focus:ring-scaffld-teal/30 focus:border-scaffld-teal"
              />
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-midnight rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Service</p>
                <p className="text-slate-100 font-medium">{selectedService?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Date & Time</p>
                <p className="text-slate-100 font-medium">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-slate-300 text-sm">{selectedSlot && formatTimeSlot(selectedSlot.start, selectedSlot.end)}</p>
              </div>
              {selectedService?.price > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Price</p>
                  <p className="text-scaffld-teal font-semibold">{formatCurrency(selectedService.price / 100)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Contact</p>
                <p className="text-slate-100">{customerName}</p>
                <p className="text-slate-400 text-sm">{customerEmail}</p>
                {customerPhone && <p className="text-slate-400 text-sm">{customerPhone}</p>}
              </div>
            </div>
            {booking.cancellationPolicy && (
              <p className="text-xs text-slate-500">{booking.cancellationPolicy}</p>
            )}
            {error && <p className="text-signal-coral text-sm">{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-700/30">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors min-h-[44px]"
            >
              Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="px-6 py-3 bg-scaffld-teal hover:bg-scaffld-teal-deep text-white rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[44px]"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-scaffld-teal hover:bg-scaffld-teal-deep text-white rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[44px]"
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Date/time selection step with calendar grid and time slots.
 */
function DateTimeStep({
  selectedDate, setSelectedDate, selectedSlot, setSelectedSlot,
  availableSlots, loadingSlots, workingDays,
  allowSameDay, maxAdvanceDays,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const minDate = allowSameDay ? today : new Date(today.getTime() + 86400000);
  const maxDate = new Date(today.getTime() + maxAdvanceDays * 86400000);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const isDaySelectable = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < minDate || d > maxDate) return false;
    return isWorkingDay(d, workingDays || {});
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Calendar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }}
            className="p-2 text-slate-400 hover:text-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            &larr;
          </button>
          <p className="text-slate-100 font-medium">
            {new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }}
            className="p-2 text-slate-400 hover:text-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            &rarr;
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-1">
          {dayNames.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const selectable = isDaySelectable(day);
            const sel = isSelected(day);
            return (
              <button
                key={day}
                onClick={() => selectable && setSelectedDate(new Date(viewYear, viewMonth, day))}
                disabled={!selectable}
                className={`py-2 rounded-lg text-sm min-h-[40px] transition-colors ${
                  sel
                    ? 'bg-scaffld-teal text-white font-semibold'
                    : selectable
                      ? 'text-slate-100 hover:bg-slate-700'
                      : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      <div className="flex-1 min-w-0">
        {!selectedDate ? (
          <p className="text-slate-500 text-sm text-center py-8">Select a date to see available times</p>
        ) : loadingSlots ? (
          <p className="text-slate-400 text-sm text-center py-8">Loading availability...</p>
        ) : availableSlots.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No available times for this date</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Available Times</p>
            {availableSlots.map((slot) => (
              <button
                key={slot.start}
                onClick={() => setSelectedSlot(slot)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all min-h-[44px] ${
                  selectedSlot?.start === slot.start
                    ? 'border-scaffld-teal bg-scaffld-teal/10 text-scaffld-teal'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {formatTimeSlot(slot.start, slot.end)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
