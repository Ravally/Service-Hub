import { useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { initialCompanySettings, initialInvoiceSettings } from '../../constants';

/**
 * Hook that sets up all Firestore real-time subscriptions for the authenticated user.
 * Populates the AppState context with live data from Firebase.
 */
export function useFirebaseSubscriptions(userId, appState) {
  const {
    setClients, setQuotes, setJobs, setInvoices, setStaff,
    setQuoteTemplates, setNotifications,
    setCompanySettings, setInvoiceSettings, setEmailTemplates,
    setIsLoading, setError,
  } = appState;

  // Main collection subscriptions
  useEffect(() => {
    if (!userId) return;

    const collectionsConfig = {
      clients: setClients,
      quotes: setQuotes,
      jobs: (data) => setJobs(data.sort((a, b) => new Date(a.start) - new Date(b.start))),
      invoices: setInvoices,
      notifications: (data) => setNotifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))),
      quoteTemplates: setQuoteTemplates,
      staff: setStaff,
    };

    const unsubscribes = Object.entries(collectionsConfig).map(([name, setter]) => {
      const path = `users/${userId}/${name}`;
      const q = query(collection(db, path));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setter(data);
      });
    });

    // Company settings subscription
    const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      setCompanySettings(docSnap.exists() ? { ...initialCompanySettings, ...docSnap.data() } : initialCompanySettings);
    });
    unsubscribes.push(unsubSettings);

    // Invoice settings subscription
    const invoiceSettingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    const unsubInvSettings = onSnapshot(invoiceSettingsRef, (snap) => {
      setInvoiceSettings(snap.exists() ? { ...initialInvoiceSettings, ...snap.data() } : initialInvoiceSettings);
    });
    unsubscribes.push(unsubInvSettings);

    // Email templates subscription
    const emailTplRef = doc(db, `users/${userId}/settings/emailTemplates`);
    const unsubEmailTpl = onSnapshot(emailTplRef, (snap) => {
      if (snap.exists()) setEmailTemplates(prev => ({ ...prev, ...snap.data() }));
    });
    unsubscribes.push(unsubEmailTpl);

    // Initial data loading check
    const fetchInitialData = async () => {
      try {
        const clientPath = `users/${userId}/clients`;
        await getDocs(collection(db, clientPath));
        setIsLoading(false);
      } catch (err) {
        setError("Could not connect to database.");
        setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [userId]);

  // Client notes subscription
  useEffect(() => {
    if (userId && appState.selectedClient) {
      const notesPath = `users/${userId}/clients/${appState.selectedClient.id}/notes`;
      const q = query(collection(db, notesPath));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        appState.setClientNotes(notesData);
      });
      return () => unsubscribe();
    }
  }, [userId, appState.selectedClient]);
}
