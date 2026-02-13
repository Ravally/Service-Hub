/**
 * Booking utility functions for online appointment scheduling.
 * Pure functions — no React, no Firestore.
 */

/**
 * Parse HH:mm time string to minutes since midnight.
 */
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight to HH:mm string.
 */
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate all possible time slots for a working day.
 * @param {string} workStart - e.g. '07:00'
 * @param {string} workEnd - e.g. '17:00'
 * @param {number} durationMinutes - service duration
 * @param {number} bufferMinutes - buffer between appointments
 * @returns {Array<{start: string, end: string}>}
 */
export function generateTimeSlots(workStart, workEnd, durationMinutes, bufferMinutes = 0) {
  const startMins = timeToMinutes(workStart);
  const endMins = timeToMinutes(workEnd);
  const slots = [];
  let cursor = startMins;

  while (cursor + durationMinutes <= endMins) {
    slots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(cursor + durationMinutes),
    });
    cursor += durationMinutes + bufferMinutes;
  }
  return slots;
}

/**
 * Filter out time slots that overlap with existing jobs on a given date.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {Array} allSlots - from generateTimeSlots
 * @param {Array} existingJobs - jobs array with start/end datetime strings
 * @param {number} bufferMinutes - buffer between appointments
 * @returns {Array<{start: string, end: string}>}
 */
export function getAvailableSlots(dateStr, allSlots, existingJobs, bufferMinutes = 0) {
  const dayJobs = existingJobs.filter((job) => {
    if (!job.start) return false;
    return job.start.startsWith(dateStr);
  });

  return allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end) + bufferMinutes;

    return !dayJobs.some((job) => {
      const jobStart = timeToMinutes(job.start.substring(11, 16));
      const jobEnd = job.end
        ? timeToMinutes(job.end.substring(11, 16))
        : jobStart + 60;
      const jobEndBuffered = jobEnd + bufferMinutes;

      return slotStart < jobEndBuffered && slotEnd > jobStart;
    });
  });
}

/**
 * Check if a date falls on a configured working day.
 * @param {Date} date
 * @param {Object} workingDays - e.g. { monday: true, tuesday: true, ... }
 * @returns {boolean}
 */
export function isWorkingDay(date, workingDays) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  return Boolean(workingDays[dayName]);
}

/**
 * Generate a booking token for a user.
 */
export function generateBookingToken(userId) {
  return `${userId}.booking`;
}

/**
 * Parse a booking token to extract the uid.
 * @returns {{ uid: string } | null}
 */
export function parseBookingToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2 || parts[1] !== 'booking') return null;
  return { uid: parts[0] };
}

/**
 * Format a date to YYYY-MM-DD.
 */
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format time slot for display (e.g. "9:00 AM - 10:00 AM").
 */
export function formatTimeSlot(start, end) {
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
