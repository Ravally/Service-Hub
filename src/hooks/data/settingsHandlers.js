import { collection, addDoc, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../firebase/config';
import { generateQuoteSMSLink } from '../../utils';

/**
 * Creates email/notification and settings handler functions.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.userId
 * @param {Object} deps.db
 * @param {Object} deps.functions
 * @param {Array} deps.clients
 * @param {Object} deps.companySettings
 * @param {Function} deps.setCompanySettings
 * @param {Object} deps.invoiceSettings
 * @param {Function} deps.setInvoiceSettings
 * @param {Object} deps.emailTemplates
 * @param {Function} deps.setEmailTemplates
 * @param {Object} deps.logoFile
 * @param {Function} deps.setLogoFile
 * @param {Object} deps.selectedQuote
 * @param {Function} deps.setSelectedQuote
 * @param {Object} deps.selectedInvoice
 * @param {Function} deps.setSelectedInvoice
 * @param {Object} deps.newInvite
 * @param {Function} deps.setNewInvite
 * @param {Object} deps.newTemplate
 * @param {Function} deps.setNewTemplate
 * @param {Object} deps.newStaff
 * @param {Function} deps.setNewStaff
 * @param {Array} deps.quoteTemplates
 * @param {Function} deps.logAudit
 * @param {Function} deps.getClientById
 * @param {Function} deps.renderTemplate
 */
export function createSettingsHandlers(deps) {
  const {
    userId,
    clients,
    companySettings, setCompanySettings,
    invoiceSettings, setInvoiceSettings,
    emailTemplates, setEmailTemplates,
    logoFile, setLogoFile,
    selectedQuote, setSelectedQuote,
    selectedInvoice, setSelectedInvoice,
    newInvite, setNewInvite,
    newTemplate, setNewTemplate,
    newStaff, setNewStaff,
    quoteTemplates,
    logAudit,
    getClientById,
    renderTemplate,
  } = deps;

  // --- Email/Notification Handlers ---

  const handleSendInvoice = async (invoice) => {
    if (!db || !userId) return;
    try {
      const client = getClientById(invoice.clientId);
      if (!client?.email) {
        alert('Client has no email address. Please add an email to the client profile.');
        return;
      }

      // Call the Cloud Function
      const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
      const result = await sendInvoiceEmail({ uid: userId, invoiceId: invoice.id });

      // Create notification
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Sent invoice ${invoice.invoiceNumber || invoice.id.substring(0,8)} to ${client.email}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Log audit
      await logAudit('send', 'invoice', invoice.id);

      alert(`Invoice email sent successfully to ${client.email}!`);

      // Update local state if this is the selected invoice
      if (selectedInvoice?.id === invoice.id) {
        const updatedSnap = await getDoc(doc(db, `users/${userId}/invoices`, invoice.id));
        if (updatedSnap.exists()) {
          setSelectedInvoice({ id: updatedSnap.id, ...updatedSnap.data() });
        }
      }
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      alert(`Failed to send invoice email: ${error.message}`);
    }
  };

  const handleSendQuote = async (quote) => {
    if (!db || !userId) return;
    try {
      const client = getClientById(quote.clientId);
      if (!client?.email) {
        alert('Client has no email address. Please add an email to the client profile.');
        return;
      }

      // Generate quote approval link
      const token = `${userId}.${quote.id}.${Math.random().toString(36).substring(2, 15)}`;
      const approvalLink = `${window.location.origin}/?quoteToken=${token}`;

      // Update quote with token and approval link before sending
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
        token,
        approvalLink,
        tokenCreatedAt: new Date().toISOString()
      });

      // Call the Cloud Function
      const sendQuoteEmail = httpsCallable(functions, 'sendQuoteEmail');
      const result = await sendQuoteEmail({ uid: userId, quoteId: quote.id });

      // Create notification
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Sent quote ${quote.quoteNumber || quote.id.substring(0,8)} to ${client.email}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Log audit
      await logAudit('send', 'quote', quote.id);

      alert(`Quote email sent successfully to ${client.email}!`);

      // Update local state if this is the selected quote
      if (selectedQuote?.id === quote.id) {
        const updatedSnap = await getDoc(doc(db, `users/${userId}/quotes`, quote.id));
        if (updatedSnap.exists()) {
          setSelectedQuote({ id: updatedSnap.id, ...updatedSnap.data() });
        }
      }
    } catch (error) {
      console.error('Failed to send quote email:', error);
      alert(`Failed to send quote email: ${error.message}`);
    }
  };

  const handleSendQuoteText = async (quote) => {
    if (!db || !userId || !quote) return;
    try {
      const client = getClientById(quote.clientId);
      if (!client?.phone) {
        alert('Client has no phone number. Please add a phone number to the client profile.');
        return;
      }

      // Generate quote approval link (similar to email)
      const token = `${userId}.${quote.id}.${Math.random().toString(36).substring(2, 15)}`;
      const approvalLink = `${window.location.origin}/?quoteToken=${token}`;

      // Update quote with token and approval link
      await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), {
        token,
        approvalLink,
        tokenCreatedAt: new Date().toISOString()
      });

      // Update status to Awaiting Response
      const sentAt = quote.sentAt || new Date().toISOString();
      if (quote.status === 'Draft' || quote.status === 'Awaiting Response' || quote.status === 'Sent') {
        await updateDoc(doc(db, `users/${userId}/quotes`, quote.id), { status: 'Awaiting Response', sentAt });
        if (selectedQuote?.id === quote.id) setSelectedQuote(prev => ({ ...prev, status: 'Awaiting Response', sentAt, token, approvalLink }));
      }

      // Generate and open SMS link
      const smsLink = generateQuoteSMSLink(client.phone, { ...quote, token, approvalLink }, companySettings);

      // Log audit
      await logAudit('send', 'quote', quote.id, { channel: 'text' });

      // Create notification
      await addDoc(collection(db, `users/${userId}/notifications`), {
        message: `Opened SMS to send quote ${quote.quoteNumber || quote.id.substring(0,8)} to ${client.phone}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Open SMS app
      window.location.href = smsLink;
    } catch (error) {
      console.error('Failed to prepare quote SMS:', error);
      alert(`Failed to prepare quote SMS: ${error.message}`);
    }
  };

  const handleMarkNotificationAsRead = async (id) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/notifications`, id), { read: true });
  };

  // --- Settings Handlers ---

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!newInvite.email) return alert("Please enter an email address to invite.");
    try {
      await addDoc(collection(db, 'invites'), { email: newInvite.email.toLowerCase(), role: newInvite.role, invitedBy: deps.userProfile?.email, createdAt: new Date().toISOString() });
      alert(`Invitation sent to ${newInvite.email}!`);
      setNewInvite({ email: '', role: 'member' });
    } catch (error) { console.error("Error sending invitation: ", error); alert("Failed to send invitation."); }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name) return;
    await addDoc(collection(db, `users/${userId}/quoteTemplates`), newTemplate);
    setNewTemplate({ name: '', price: 0 });
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await deleteDoc(doc(db, `users/${userId}/quoteTemplates`, id));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    alert('Saving settings...');
    const settingsDocRef = doc(db, `users/${userId}/settings/companyDetails`);
    await setDoc(settingsDocRef, companySettings, { merge: true });
    if (logoFile) {
      const logoRef = ref(storage, `users/${userId}/logo/company_logo`);
      try {
        const snapshot = await uploadBytes(logoRef, logoFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        await updateDoc(settingsDocRef, { logoUrl: downloadURL });
        setCompanySettings(prev => ({...prev, logoUrl: downloadURL}));
      } catch (error) { console.error("Error uploading logo: ", error); alert("Logo upload failed."); }
    }
    setLogoFile(null);
    alert('Settings saved successfully!');
  };

  const handleSaveInvoiceSettings = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    const settingsRef = doc(db, `users/${userId}/settings/invoiceSettings`);
    await setDoc(settingsRef, invoiceSettings, { merge: true });
    alert('Invoice settings saved');
  };

  const handleSaveEmailTemplates = async (e) => {
    e.preventDefault();
    if (!db || !userId) return;
    const settingsRef = doc(db, `users/${userId}/settings/emailTemplates`);
    await setDoc(settingsRef, emailTemplates, { merge: true });
    alert('Email templates saved');
  };

  return {
    // Email/Notification handlers
    handleSendInvoice,
    handleSendQuote,
    handleSendQuoteText,
    handleMarkNotificationAsRead,

    // Settings handlers
    handleInviteUser,
    handleAddTemplate,
    handleDeleteTemplate,
    handleSaveSettings,
    handleSaveInvoiceSettings,
    handleSaveEmailTemplates,
  };
}
