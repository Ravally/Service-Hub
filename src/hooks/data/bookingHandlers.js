import { collection, addDoc, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { initialInvoiceSettings } from '../../constants';

/**
 * Creates booking-related handler functions.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.userId
 * @param {Array} deps.clients
 * @param {Array} deps.jobs
 * @param {Object} deps.companySettings
 * @param {Function} deps.logAudit
 * @param {Function} deps.setActiveView
 * @param {Function} deps.setSelectedJob
 */
export function createBookingHandlers(deps) {
  const {
    userId, clients, jobs, companySettings,
    logAudit, setActiveView, setSelectedJob,
  } = deps;

  /**
   * Create a job from an online booking submission.
   */
  const handleCreateBookingJob = async (bookingData) => {
    if (!db || !userId) return;
    const { customerName, customerEmail, customerPhone, service, date, timeSlot } = bookingData;
    const requireApproval = companySettings.onlineBooking?.requireApproval;

    // 1. Find existing client by email or create a new one
    let clientId = '';
    const existingClient = clients.find(
      (c) => c.email && c.email.toLowerCase() === customerEmail.toLowerCase()
    );

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const clientRef = await addDoc(collection(db, `users/${userId}/clients`), {
        name: customerName,
        email: customerEmail,
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

    // 2. Generate job number (same transaction pattern as jobHandlers)
    const jobNumber = await (async () => {
      const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextJob || 1;
        const prefix = s.prefixJob || 'JOB';
        const padding = s.padding ?? 4;
        const composed = `${prefix}-${pad(seq, padding)}`;
        tx.set(invSettingsRef, { nextJob: seq + 1, prefixJob: prefix, padding }, { merge: true });
        return composed;
      });
    })();

    // 3. Build start/end datetime strings
    const startDateTime = `${date}T${timeSlot.start}`;
    const endDateTime = `${date}T${timeSlot.end}`;

    // 4. Create job
    const status = requireApproval ? 'Unscheduled' : 'Scheduled';
    await addDoc(collection(db, `users/${userId}/jobs`), {
      clientId,
      title: service.name,
      start: startDateTime,
      end: endDateTime,
      status,
      jobNumber,
      source: 'online_booking',
      bookingDetails: {
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.duration,
        servicePrice: service.price,
        bookedAt: new Date().toISOString(),
      },
      lineItems: service.price ? [{
        type: 'line_item',
        name: service.name,
        description: service.description || '',
        qty: 1,
        price: service.price,
        unitCost: 0,
      }] : [],
      assignees: [],
      checklist: [],
      notes: '',
      createdAt: new Date().toISOString(),
    });

    // 5. Create notification for owner
    await addDoc(collection(db, `users/${userId}/notifications`), {
      message: `New online booking: ${service.name} on ${date} at ${timeSlot.start} from ${customerName}`,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'online_booking',
    });

    // 6. Log audit
    await logAudit('create', 'booking', '(auto)', { service: service.name, customer: customerName });
  };

  /**
   * Approve a pending booking (Unscheduled → Scheduled).
   */
  const handleApproveBooking = async (job) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { status: 'Scheduled' });
    await logAudit('approve', 'booking', job.id, { title: job.title });
  };

  /**
   * Decline a pending booking.
   */
  const handleDeclineBooking = async (job) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/jobs`, job.id), {
      status: 'Completed',
      bookingDeclined: true,
      declinedAt: new Date().toISOString(),
    });
    await logAudit('decline', 'booking', job.id, { title: job.title });
  };

  return {
    handleCreateBookingJob,
    handleApproveBooking,
    handleDeclineBooking,
  };
}
