import { collection, addDoc, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { initialJobState, initialInvoiceSettings } from '../../constants';
import { padNumber } from './handlerUtils';

/**
 * Creates job-related handler functions.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.userId
 * @param {Object} deps.db
 * @param {Object} deps.storage
 * @param {Object} deps.newJob
 * @param {Function} deps.setNewJob
 * @param {Object} deps.selectedJob
 * @param {Function} deps.setSelectedJob
 * @param {Function} deps.setShowJobForm
 * @param {Function} deps.logAudit
 * @param {Function} deps.findClientProperty
 * @param {Function} deps.buildPropertySnapshot
 * @param {Function} deps.getClientNameById
 * @param {Function} deps.createInvoiceFromJob
 */
export function createJobHandlers(deps) {
  const {
    userId,
    newJob, setNewJob,
    selectedJob, setSelectedJob,
    setShowJobForm,
    logAudit,
    findClientProperty,
    buildPropertySnapshot,
    getClientNameById,
    createInvoiceFromJob,
  } = deps;

  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!newJob.clientId || !newJob.title || !newJob.start || !db || !userId) return;
    const property = findClientProperty(newJob.clientId, newJob.propertyId);
    const propertyId = newJob.propertyId || property?.uid || property?.id || '';
    const propertySnapshot = buildPropertySnapshot(property);
    const jobNumber = await (async () => {
      const invSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      const num = await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : { ...initialInvoiceSettings };
        const seq = s.nextJob || 1; const prefix = s.prefixJob || 'JOB'; const padding = s.padding ?? 4;
        const composed = `${prefix}-${pad(seq, padding)}`;
        tx.set(invSettingsRef, { nextJob: seq + 1, prefixJob: prefix, padding }, { merge: true });
        return composed;
      });
      return num;
    })();
    await addDoc(collection(db, `users/${userId}/jobs`), { ...newJob, propertyId, propertySnapshot, jobNumber, assignees: newJob.assignees || [], createdAt: new Date().toISOString() });
    await logAudit('create', 'job', '(auto)', { title: newJob.title });
    if (newJob.quoteId) {
      await updateDoc(doc(db, `users/${userId}/quotes`, newJob.quoteId), { status: 'Converted', convertedAt: new Date().toISOString() });
    }
    setNewJob(initialJobState); setShowJobForm(false);
  };

  const handleUpdateJobStatus = async (job, newStatus) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { status: newStatus });
    await logAudit('status_change', 'job', job.id, { from: job.status, to: newStatus });
    if (newStatus === 'Completed') createInvoiceFromJob(job);
  };

  const handleUpdateJobDetails = async (jobId, details) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/jobs`, jobId), details);
  };

  const handleUploadJobAttachment = async (job, file) => {
    if (!db || !userId || !file) return;
    try {
      const key = `users/${userId}/jobs/${job.id}/attachments/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, key);
      const snap = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snap.ref);
      const record = { name: file.name, url, type: file.type || '', size: file.size || 0, createdAt: new Date().toISOString() };
      const next = [...(job.attachments || []), record];
      await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { attachments: next });
      if (selectedJob?.id === job.id) setSelectedJob(prev => ({ ...prev, attachments: next }));
      await logAudit('upload', 'job_attachment', job.id, { name: file.name, url });
      alert('Attachment uploaded');
    } catch (err) { console.error('Upload failed', err); alert('Upload failed'); }
  };

  const handleRemoveJobAttachment = async (job, url) => {
    if (!db || !userId) return;
    try {
      const next = (job.attachments || []).filter(a => a.url !== url);
      await updateDoc(doc(db, `users/${userId}/jobs`, job.id), { attachments: next });
      if (selectedJob?.id === job.id) setSelectedJob(prev => ({ ...prev, attachments: next }));
      await logAudit('delete', 'job_attachment', job.id, { url });
    } catch (err) { console.error('Remove failed', err); alert('Remove failed'); }
  };

  const toggleNewJobAssignee = (staffId) => {
    setNewJob(j => {
      const ids = new Set(j.assignees || []);
      if (ids.has(staffId)) ids.delete(staffId); else ids.add(staffId);
      return { ...j, assignees: Array.from(ids) };
    });
  };

  return {
    handleAddJob,
    handleUpdateJobStatus,
    handleUpdateJobDetails,
    handleUploadJobAttachment,
    handleRemoveJobAttachment,
    toggleNewJobAssignee,
  };
}
