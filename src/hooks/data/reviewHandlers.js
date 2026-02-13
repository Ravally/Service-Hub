import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';

/**
 * Creates review-related handler functions.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.userId
 * @param {Object} deps.functions
 * @param {Array} deps.clients
 * @param {Object} deps.companySettings
 * @param {Function} deps.logAudit
 * @param {Function} deps.getClientById
 */
export function createReviewHandlers(deps) {
  const { userId, functions, clients, companySettings, logAudit, getClientById } = deps;

  const handleSendReviewRequest = async (job) => {
    if (!db || !userId || !job) return;
    try {
      const reviewSettings = companySettings?.reviewSettings || {};
      if (!reviewSettings.enabled || !reviewSettings.autoRequest) return;

      const client = getClientById(job.clientId);
      if (!client?.commPrefs?.askForReview) return;
      if (!client?.email) return;

      const randomPart = Math.random().toString(36).substring(2, 10);
      const reviewToken = `${userId}.${job.id}.${randomPart}`;
      const now = new Date().toISOString();

      await updateDoc(doc(db, `users/${userId}/jobs`, job.id), {
        reviewToken,
        reviewTokenCreatedAt: now,
        reviewRequestSentAt: now,
      });

      if (functions) {
        try {
          const sendReview = httpsCallable(functions, 'sendReviewRequest');
          await sendReview({ uid: userId, jobId: job.id, reviewToken });
        } catch (err) {
          console.warn('Review email send failed:', err);
        }
      }

      await addDoc(collection(db, `users/${userId}/notifications`), {
        type: 'review_request_sent',
        title: 'Review Request Sent',
        message: `Review request sent to ${client.name || 'client'}`,
        jobId: job.id,
        read: false,
        createdAt: now,
      });

      await logAudit('send', 'review_request', job.id, { clientId: job.clientId });
    } catch (err) {
      console.error('Failed to send review request:', err);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!db || !userId || !reviewId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/reviews`, reviewId));
      await logAudit('delete', 'review', reviewId);
    } catch (err) {
      console.error('Failed to delete review:', err);
    }
  };

  return { handleSendReviewRequest, handleDeleteReview };
}
