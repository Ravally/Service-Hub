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
        setPublicQuoteContext({ uid, token, quote, client });
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
}
