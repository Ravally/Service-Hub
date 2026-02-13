import { useEffect } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';

/**
 * Check if a token has expired (90 days default)
 */
function isTokenExpired(tokenCreatedAt, expiryDays = 90) {
  if (!tokenCreatedAt) return false; // If no creation date, assume valid (old tokens)
  const createdDate = new Date(tokenCreatedAt);
  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  return new Date() > expiryDate;
}

/**
 * Log portal access for security auditing
 */
async function logPortalAccess(uid, clientId, action, metadata = {}) {
  try {
    await addDoc(collection(db, `users/${uid}/portalAccessLogs`), {
      clientId,
      action, // 'view', 'approve_quote', 'decline_quote', 'pay_invoice', etc.
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...metadata,
    });
  } catch (error) {
    console.warn('Failed to log portal access:', error);
    // Don't fail the main operation if logging fails
  }
}

/**
 * Hook to detect public quote approval and client portal tokens from the URL.
 * Sets the public contexts in AppState when valid tokens are found.
 */
export function usePublicAccess(appState) {
  const {
    setPublicQuoteContext, setPublicError, setPublicPortalContext,
    setPublicBookingContext, setPublicReviewContext,
    setPublicUnsubscribeContext,
  } = appState;

  // Detect public quote approval token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('quoteToken');
    if (!token) return;
    (async () => {
      try {
        const parts = token.split('.');
        if (parts.length < 2) { setPublicError('Invalid link.'); return; }
        const uid = parts[0];
        const quoteId = parts[1];
        const auth = getAuth();
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) { /* ignore */ }
        }
        const qSnap = await getDoc(doc(db, `users/${uid}/quotes`, quoteId));
        if (!qSnap.exists()) { setPublicError('Quote not found.'); return; }
        const quote = { id: qSnap.id, ...qSnap.data() };

        // Check token expiration
        if (isTokenExpired(quote.tokenCreatedAt || quote.createdAt)) {
          setPublicError('This quote link has expired. Please contact the business for a new link.');
          return;
        }

        // Log access
        await logPortalAccess(uid, quote.clientId, 'view_quote_approval', { quoteId, quoteNumber: quote.quoteNumber });

        if (!quote.openedAt) {
          try {
            const openedAt = new Date().toISOString();
            await updateDoc(doc(db, `users/${uid}/quotes`, quoteId), { openedAt });
            quote.openedAt = openedAt;
          } catch (err) {
            console.warn('Unable to record quote open time:', err?.message || err);
          }
        }
        const cSnap = quote.clientId ? await getDoc(doc(db, `users/${uid}/clients`, quote.clientId)) : null;
        const client = cSnap && cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } : null;
        const settingsSnap = await getDoc(doc(db, `users/${uid}/settings/companyDetails`));
        const company = settingsSnap.exists() ? settingsSnap.data() : {};
        setPublicQuoteContext({ uid, token, quote, client, company });
      } catch (err) {
        console.error('Public approval error:', err);
        setPublicError('Unable to load approval link.');
      }
    })();
  }, []);

  // Detect public client portal token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portalToken');
    if (!token) return;
    const parts = token.split('.');
    if (parts.length < 2) { setPublicError('Invalid portal link.'); return; }
    const uid = parts[0];
    const clientId = parts[1];
    (async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.error('[Portal] Anonymous sign-in failed:', e);
          }
        }
        const cSnap = await getDoc(doc(db, `users/${uid}/clients`, clientId));
        if (!cSnap.exists()) { setPublicError('Client not found.'); return; }

        const client = { id: cSnap.id, ...cSnap.data() };

        // Check token expiration
        if (isTokenExpired(client.portalTokenCreatedAt)) {
          setPublicError('This portal link has expired. Please contact the business for a new link.');
          return;
        }

        // Log portal access
        await logPortalAccess(uid, clientId, 'view_portal', { clientName: client.name });

        setPublicPortalContext({ uid, clientId });
      } catch (err) {
        console.error('Portal load error:', err);
        setPublicError('Unable to load portal.');
      }
    })();
  }, []);

  // Detect public booking token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('bookingToken');
    if (!token) return;
    const parts = token.split('.');
    if (parts.length < 2 || parts[1] !== 'booking') {
      setPublicError('Invalid booking link.');
      return;
    }
    const uid = parts[0];
    (async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) { /* ignore */ }
        }
        const settingsSnap = await getDoc(doc(db, `users/${uid}/settings/companyDetails`));
        const companySettings = settingsSnap.exists() ? settingsSnap.data() : {};

        if (!companySettings.onlineBooking?.enabled) {
          setPublicError('Online booking is not currently available.');
          return;
        }

        await logPortalAccess(uid, '', 'view_booking', {});
        setPublicBookingContext({ uid, companySettings });
      } catch (err) {
        console.error('Booking load error:', err);
        setPublicError('Unable to load booking page.');
      }
    })();
  }, []);

  // Detect public review token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reviewToken');
    if (!token) return;
    const parts = token.split('.');
    if (parts.length < 3) { setPublicError('Invalid review link.'); return; }
    const uid = parts[0];
    const jobId = parts[1];
    (async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) { /* ignore */ }
        }
        const jobSnap = await getDoc(doc(db, `users/${uid}/jobs`, jobId));
        if (!jobSnap.exists()) { setPublicError('Job not found.'); return; }
        const job = { id: jobSnap.id, ...jobSnap.data() };

        if (job.reviewToken !== token) {
          setPublicError('Invalid review link.');
          return;
        }

        if (isTokenExpired(job.reviewTokenCreatedAt)) {
          setPublicError('This review link has expired. Please contact the business for a new link.');
          return;
        }

        const settingsSnap = await getDoc(doc(db, `users/${uid}/settings/companyDetails`));
        const company = settingsSnap.exists() ? settingsSnap.data() : {};

        await logPortalAccess(uid, job.clientId || '', 'view_review', { jobId });
        setPublicReviewContext({ uid, job, company });
      } catch (err) {
        console.error('Review load error:', err);
        setPublicError('Unable to load review page.');
      }
    })();
  }, []);

  // Detect unsubscribe token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('unsubscribe');
    if (!token) return;
    const parts = token.split('.');
    if (parts.length < 2) { setPublicError('Invalid unsubscribe link.'); return; }
    const uid = parts[0];
    const clientId = parts[1];
    (async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) { /* ignore */ }
        }
        setPublicUnsubscribeContext({ uid, clientId });
      } catch (err) {
        console.error('Unsubscribe load error:', err);
        setPublicError('Unable to process unsubscribe.');
      }
    })();
  }, []);
}
