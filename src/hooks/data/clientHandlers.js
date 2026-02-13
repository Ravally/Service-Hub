import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * Creates all client-related handler functions.
 *
 * @param {Object} deps
 * @param {string} deps.userId
 * @param {import('firebase/firestore').Firestore} deps.db
 * @param {Array} deps.clients
 * @param {Array} deps.invoices
 * @param {Object} deps.appState - { setActiveView, setClientBeingEdited, setAutoAddProperty, selectedClient }
 * @param {Function} deps.logAudit - (action, targetType, targetId, details) => Promise
 * @param {Function} deps.findClientProperty
 * @returns {Object} All client handler functions
 */
export function createClientHandlers(deps) {
  const { userId, db, clients, invoices, appState, logAudit, findClientProperty } = deps;
  const { setActiveView, setClientBeingEdited, setAutoAddProperty, selectedClient } = appState;

  const handleCreateClientPage = async (data, options = {}) => {
    if (!db || !userId) return null;
    const cleanTags = (data.tags || []).map(t => (t || '').trim()).filter(Boolean);
    const cleanContacts = (data.contacts || []).map(c => ({
      role: (c.role||'').trim(),
      firstName: (c.firstName||'').trim(),
      lastName: (c.lastName||'').trim(),
      name: `${(c.firstName||'').trim()} ${(c.lastName||'').trim()}`.trim(),
      email: (c.email||'').trim(),
      phone: (c.phone||'').trim(),
      isBilling: !!c.isBilling,
      isPrimary: false,
      commPrefs: {
        quoteFollowups: !!(c.commPrefs && c.commPrefs.quoteFollowups),
        invoiceFollowups: !!(c.commPrefs && c.commPrefs.invoiceFollowups),
        visitReminders: !!(c.commPrefs && c.commPrefs.visitReminders),
        jobFollowups: !!(c.commPrefs && c.commPrefs.jobFollowups),
      },
    })).filter(c => c.firstName || c.lastName || c.email || c.phone);
    const phones = (data.phones || []).map(p => ({ label: (p.label||'').trim(), number: (p.number||'').trim() })).filter(p => p.label || p.number);
    const emails = (data.emails || []).map(e => ({ label: (e.label||'').trim(), address: (e.address||'').trim() })).filter(e => e.label || e.address);
    const properties = Array.isArray(data.properties) ? data.properties : [];
    const customFields = (data.customFields || [])
      .filter(cf => cf && (cf.fieldId || cf.key || cf.value))
      .map(cf => cf.fieldId
        ? { fieldId: cf.fieldId, fieldName: (cf.fieldName || '').trim(), fieldType: cf.fieldType || 'text', value: cf.value ?? '' }
        : { key: (cf.key || '').trim(), value: (cf.value || '').trim() }
      );
    const base = {
      name: data.name,
      title: (data.title||'').trim(),
      firstName: (data.firstName||'').trim(),
      lastName: (data.lastName||'').trim(),
      company: (data.company||'').trim(),
      email: (data.email||'').trim(),
      phone: (data.phone||'').trim(),
      receivesTexts: !!data.receivesTexts,
      phones, emails,
      address: (data.address||'').trim(),
      tags: cleanTags,
      contacts: cleanContacts,
      leadSource: (data.leadSource||'').trim(),
      customFields,
      commPrefs: {
        quoteFollowups: !!(data.commPrefs && data.commPrefs.quoteFollowups),
        invoiceFollowups: !!(data.commPrefs && data.commPrefs.invoiceFollowups),
        visitReminders: !!(data.commPrefs && data.commPrefs.visitReminders),
        jobFollowups: !!(data.commPrefs && data.commPrefs.jobFollowups),
        askForReview: !!(data.commPrefs && data.commPrefs.askForReview),
      },
      properties,
    };
    if (options?.editClientId) {
      const patch = { ...base, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, `users/${userId}/clients`, options.editClientId), patch);
      await logAudit('update', 'client', options.editClientId, { fields: Object.keys(patch||{}) });
      setClientBeingEdited(null);
      setActiveView('clients');
      return options.editClientId;
    } else {
      const payload = { ...base, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, `users/${userId}/clients`), payload);
      await logAudit('create', 'client', docRef.id, { name: data.name });
      if (!options?.createAnother) setActiveView('clients');
      return docRef.id;
    }
  };

  const handleUpdateClient = async (clientId, data) => {
    if (!db || !userId) return;
    await updateDoc(doc(db, `users/${userId}/clients`, clientId), data);
    await logAudit('update', 'client', clientId, { fields: Object.keys(data || {}) });
  };

  const handleUpdateProperty = async (clientId, propertyId, updates) => {
    if (!clientId || !propertyId) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const props = Array.isArray(client.properties) ? client.properties : [];
    const nextProps = props.map((p, idx) => {
      const pid = p.uid || p.id || String(idx);
      if (pid !== propertyId) return p;
      return { ...p, ...updates };
    });
    await handleUpdateClient(clientId, { properties: nextProps });
    if (selectedClient?.id === clientId) appState.setSelectedClient?.((prev) => ({ ...prev, properties: nextProps }));
    if (appState.selectedProperty && (appState.selectedProperty.uid || appState.selectedProperty.id) === propertyId) {
      appState.setSelectedProperty?.((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await deleteDoc(doc(db, `users/${userId}/clients`, clientId));
        await logAudit('delete', 'client', clientId);
        appState.setSelectedClient?.(null);
        appState.setSelectedProperty?.(null);
      } catch (error) { console.error("Error deleting client:", error); }
    }
  };

  const handleAddClientNote = async (clientId, noteText) => {
    if (!db || !userId || !noteText.trim()) return;
    await addDoc(collection(db, `users/${userId}/clients/${clientId}/notes`), {
      text: noteText,
      createdAt: new Date().toISOString(),
    });
  };

  const handleGenerateClientPortalLink = async (client) => {
    if (!db || !userId) return;
    try {
      let token = client.publicPortalToken;
      const now = new Date().toISOString();
      if (!token) {
        token = `${userId}.${client.id}.${Math.random().toString(36).slice(2,10)}`;
        await updateDoc(doc(db, `users/${userId}/clients`, client.id), {
          publicPortalToken: token,
          portalTokenCreatedAt: now,
        });
      }
      const link = `${window.location.origin}/?portalToken=${encodeURIComponent(token)}`;
      try { window.open(link, '_blank', 'noopener'); } catch (_) {}
      window.prompt('Copy portal link:', link);
    } catch (err) {
      console.error('Generate portal link error:', err);
      alert('Failed to generate portal link.');
    }
  };

  const handleCollectPaymentForClient = async (c) => {
    try {
      const list = invoices.filter(i=>i.clientId===c.id && !i.isCreditNote && (i.status==='Unpaid' || i.status==='Sent'))
        .sort((a,b)=>new Date(b.issueDate||b.createdAt||0)-new Date(a.issueDate||a.createdAt||0));
      if (list.length===0) { alert('No unpaid/sent invoices for this client.'); return; }
      const inv = list[0];
      const amtStr = prompt(`Record payment for invoice ${inv.invoiceNumber || inv.id.substring(0,6)}. Enter amount:`);
      const amount = parseFloat(amtStr||'');
      if (!Number.isFinite(amount) || amount<=0) return;
      const invoiceDocRef = doc(db, `users/${userId}/invoices`, inv.id);
      const payments = Array.isArray(inv.payments)? [...inv.payments]:[];
      payments.push({ amount, method: 'Recorded', createdAt: new Date().toISOString() });
      let status = inv.status;
      const paidSoFar = payments.reduce((s,p)=>s+(p.amount||0),0);
      if ((paidSoFar)>= (inv.total||0)) status = 'Paid';
      await updateDoc(invoiceDocRef, { payments, status, paidAt: status==='Paid'? new Date().toISOString(): (inv.paidAt||null) });
      alert('Payment recorded.');
    } catch (e) { console.error(e); alert('Failed to record payment'); }
  };

  const viewAsClient = (c) => {
    try {
      const token = `${userId}.${c.id}`;
      const link = `${window.location.origin}/?portalToken=${encodeURIComponent(token)}`;
      window.open(link, '_blank');
    } catch {}
  };

  const downloadVCardForClient = (c) => {
    const fullName = c.name || '';
    const email = c.email || '';
    const phone = c.phone || '';
    const adr = (c.address||'').replace(/,/g,';');
    const v = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nTEL;TYPE=CELL:${phone}\nEMAIL:${email}\nADR;TYPE=WORK:;;${adr}\nEND:VCARD`;
    const blob = new Blob([v], { type: 'text/vcard' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(fullName||'client').replace(/[^a-z0-9_-]+/gi,'_')}.vcf`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  };

  const archiveClient = async (c) => {
    try { await handleUpdateClient(c.id, { archived: true, status: 'Archived' }); alert('Client archived'); }
    catch(e){ console.error(e); alert('Failed to archive client'); }
  };

  const startNewPropertyForClient = (c) => {
    if (!c) return;
    setClientBeingEdited(c);
    setAutoAddProperty(true);
    setActiveView('createClient');
  };

  const handleBulkArchiveClients = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    try {
      await Promise.all(ids.map(id =>
        updateDoc(doc(db, `users/${userId}/clients`, id), { archived: true, status: 'Archived' })
      ));
    } catch (e) { console.error('Bulk archive clients error', e); }
  };

  const handleBulkDeleteClients = async (ids = []) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} client(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db, `users/${userId}/clients`, id))));
    } catch (e) { console.error('Bulk delete clients error', e); }
  };

  const handleBulkTagClients = async (ids = [], tag) => {
    if (!db || !userId || !Array.isArray(ids) || ids.length === 0 || !tag) return;
    try {
      await Promise.all(ids.map(id => {
        const client = clients.find(c => c.id === id);
        const newTags = [...new Set([...(client?.tags || []), tag])];
        return updateDoc(doc(db, `users/${userId}/clients`, id), { tags: newTags });
      }));
    } catch (e) { console.error('Bulk tag clients error', e); }
  };

  return {
    handleCreateClientPage,
    handleUpdateClient,
    handleUpdateProperty,
    handleDeleteClient,
    handleAddClientNote,
    handleGenerateClientPortalLink,
    handleCollectPaymentForClient,
    viewAsClient,
    downloadVCardForClient,
    archiveClient,
    startNewPropertyForClient,
    handleBulkArchiveClients,
    handleBulkDeleteClients,
    handleBulkTagClients,
  };
}
