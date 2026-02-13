import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { computeClientSegments } from '../../utils/clientSegments';

/**
 * Creates campaign-related handler functions.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.userId
 * @param {Object} deps.functions
 * @param {Array} deps.clients
 * @param {Object} deps.companySettings
 * @param {Array} deps.jobs
 * @param {Array} deps.invoices
 * @param {Function} deps.logAudit
 */
export function createCampaignHandlers(deps) {
  const { userId, functions, clients, companySettings, jobs, invoices, logAudit } = deps;

  const getFilteredRecipients = (recipientType, statusFilter, tagFilter, customIds, segmentFilter) => {
    const eligible = clients.filter((c) => {
      if (!c.email) return false;
      if (c.commPrefs?.marketingOptOut) return false;
      return true;
    });

    if (recipientType === 'all') return eligible;

    if (recipientType === 'byStatus') {
      if (!statusFilter?.length) return eligible;
      return eligible.filter((c) => statusFilter.includes(c.status));
    }

    if (recipientType === 'byTag') {
      if (!tagFilter?.length) return eligible;
      return eligible.filter((c) =>
        c.tags?.some((t) => tagFilter.includes(t))
      );
    }

    if (recipientType === 'bySegment') {
      if (!segmentFilter?.length) return eligible;
      const segMap = computeClientSegments(clients, jobs, invoices);
      return eligible.filter((c) => {
        const segs = segMap.get(c.id) || [];
        return segmentFilter.some((s) => segs.includes(s));
      });
    }

    if (recipientType === 'custom') {
      if (!customIds?.length) return [];
      return eligible.filter((c) => customIds.includes(c.id));
    }

    return eligible;
  };

  const computeRecipientCount = (recipientType, statusFilter, tagFilter, customIds, segmentFilter) => {
    return getFilteredRecipients(recipientType, statusFilter, tagFilter, customIds, segmentFilter).length;
  };

  const handleCreateCampaign = async (data) => {
    if (!db || !userId) return null;
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, `users/${userId}/campaigns`), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await logAudit('create', 'campaign', docRef.id, { name: data.name });
      return docRef.id;
    } catch (err) {
      console.error('Failed to create campaign:', err);
      return null;
    }
  };

  const handleUpdateCampaign = async (id, updates) => {
    if (!db || !userId || !id) return;
    try {
      await updateDoc(doc(db, `users/${userId}/campaigns`, id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('update', 'campaign', id);
    } catch (err) {
      console.error('Failed to update campaign:', err);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!db || !userId || !id) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/campaigns`, id));
      await logAudit('delete', 'campaign', id);
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const handleSendCampaign = async (id) => {
    if (!db || !userId || !id) return;
    try {
      await updateDoc(doc(db, `users/${userId}/campaigns`, id), {
        status: 'Sending',
        updatedAt: new Date().toISOString(),
      });

      if (functions) {
        const sendCampaign = httpsCallable(functions, 'sendEmailCampaign');
        await sendCampaign({ uid: userId, campaignId: id });
      }

      await logAudit('send', 'campaign', id);
    } catch (err) {
      console.error('Failed to send campaign:', err);
      await updateDoc(doc(db, `users/${userId}/campaigns`, id), {
        status: 'Failed',
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleScheduleCampaign = async (id, scheduledFor) => {
    if (!db || !userId || !id) return;
    try {
      await updateDoc(doc(db, `users/${userId}/campaigns`, id), {
        status: 'Scheduled',
        scheduledFor,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('schedule', 'campaign', id, { scheduledFor });
    } catch (err) {
      console.error('Failed to schedule campaign:', err);
    }
  };

  return {
    handleCreateCampaign,
    handleUpdateCampaign,
    handleDeleteCampaign,
    handleSendCampaign,
    handleScheduleCampaign,
    computeRecipientCount,
    getFilteredRecipients,
  };
}
