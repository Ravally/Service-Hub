// src/components/PublicClientPortal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, onSnapshot, query, updateDoc, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatCurrency, formatDate, formatDateTime } from '../utils';

const PublicClientPortal = ({ uid, clientId, company }) => {
  const [client, setClient] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let unsubs = [];
    (async () => {
      try {
        const cRef = doc(db, `users/${uid}/clients`, clientId);
        const cSnap = await getDoc(cRef);
        if (!cSnap.exists()) { setError('Client not found.'); setLoading(false); return; }
        const c = { id: cSnap.id, ...cSnap.data() };
        setClient(c);
        setEdit({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' });

        const qQuotes = query(collection(db, `users/${uid}/quotes`), where('clientId', '==', clientId));
        const unsubQ = onSnapshot(qQuotes, (snap) => {
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          arr.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setQuotes(arr);
        });
        unsubs.push(unsubQ);

        const qJobs = query(collection(db, `users/${uid}/jobs`), where('clientId', '==', clientId));
        const unsubJ = onSnapshot(qJobs, (snap) => {
          const now = new Date();
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(j => j.start ? new Date(j.start) >= now : true);
          arr.sort((a,b) => new Date(a.start || 0) - new Date(b.start || 0));
          setJobs(arr);
        });
        unsubs.push(unsubJ);

        const qInvoices = query(collection(db, `users/${uid}/invoices`), where('clientId', '==', clientId));
        const unsubI = onSnapshot(qInvoices, (snap) => {
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setInvoices(arr);
        });
        unsubs.push(unsubI);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Failed to load portal.');
        setLoading(false);
      }
    })();
    return () => unsubs.forEach(u => u());
  }, [uid, clientId]);

  const creditsByInvoice = useMemo(() => {
    const map = new Map();
    invoices.forEach(inv => {
      if (inv.isCreditNote && inv.creditForInvoiceId) {
        map.set(inv.creditForInvoiceId, (map.get(inv.creditForInvoiceId) || 0) + (inv.total || 0));
      }
    });
    return map;
  }, [invoices]);

  useEffect(() => {
    if (!uid || invoices.length === 0) return;
    const now = new Date().toISOString();
    invoices.forEach((inv) => {
      if (inv.isCreditNote) return;
      if (!inv.viewedAt && (inv.status === 'Sent' || inv.status === 'Unpaid')) {
        updateDoc(doc(db, `users/${uid}/invoices`, inv.id), { viewedAt: now });
      }
    });
  }, [uid, invoices]);

  const handleSaveClient = async () => {
    try {
      await updateDoc(doc(db, `users/${uid}/clients`, clientId), edit);
      setMessage('Details updated');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setError('Failed to update'); }
  };

  const portalApproveQuote = async (q, signer) => {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, `users/${uid}/quotes`, q.id), {
        status: 'Approved',
        approvalStatus: 'approved',
        approvedAt: now,
        approvedByName: (signer || '').trim() || 'Client',
      });
      // Create numbered job
      const invSettingsRef = doc(db, `users/${uid}/settings/invoiceSettings`);
      const pad = (n, width) => String(n).padStart(width ?? 4, '0');
      const jobNumber = await runTransaction(db, async (tx) => {
        const snap = await tx.get(invSettingsRef);
        const s = snap.exists() ? { nextJob: 1, prefixJob: 'JOB', padding: 4, ...snap.data() } : { nextJob: 1, prefixJob: 'JOB', padding: 4 };
        const num = `${s.prefixJob || 'JOB'}-${pad(s.nextJob || 1, s.padding ?? 4)}`;
        tx.set(invSettingsRef, { nextJob: (s.nextJob || 1) + 1 }, { merge: true });
        return num;
      });
      await addDoc(collection(db, `users/${uid}/jobs`), {
        status: 'Draft',
        clientId,
        quoteId: q.id,
        title: q.lineItems?.[0]?.description || `Job for ${client?.name || 'Client'}`,
        jobNumber,
        createdAt: now,
      });
      setMessage('Quote approved.');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setError('Failed to approve'); }
  };
  const portalDeclineQuote = async (q, signer) => {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, `users/${uid}/quotes`, q.id), {
        status: 'Changes Requested',
        approvalStatus: 'declined',
        declinedAt: now,
        declinedByName: (signer || '').trim() || 'Client',
      });
      setMessage('Quote declined.');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setError('Failed to decline'); }
  };

  // Mock Pay Now: marks invoice paid and logs a payment record (stub for Stripe)
  const portalPayInvoice = async (inv) => {
    try {
      const allowPartial = inv?.paymentSettings?.allowPartialPayments ?? true;
      const tipRaw = window.prompt('Add a tip? Enter amount or leave blank.');
      const tip = tipRaw ? parseFloat(tipRaw) : 0;
      const now = new Date().toISOString();
      const invRef = doc(db, `users/${uid}/invoices`, inv.id);
      const payments = Array.isArray(inv.payments) ? inv.payments : [];
      const credits = creditsByInvoice.get(inv.id) || 0;
      const netDue = Math.max(0, (inv.total || 0) - credits);
      let amount = netDue;
      if (allowPartial) {
        const raw = window.prompt(`Enter amount to pay (max ${formatCurrency(netDue)}):`, netDue.toFixed(2));
        if (!raw) return;
        const parsed = parseFloat(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        amount = Math.min(netDue, parsed);
      }
      const paidRecord = { amount, tip: Number.isFinite(tip) ? tip : 0, method: 'Card (test)', createdAt: now };
      const isPaid = amount >= netDue;
      await updateDoc(invRef, {
        status: isPaid ? 'Paid' : (inv.status || 'Unpaid'),
        paidAt: isPaid ? now : (inv.paidAt || null),
        payments: [...payments, paidRecord],
      });
      setMessage('Payment recorded. Thank you!');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setError('Payment failed.'); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Your Company'} - Client Portal</h1>
          <p className="text-gray-600">Welcome, {client?.name}</p>
        </div>

        {(message) && <div className="mb-4 p-3 rounded bg-green-50 text-green-700 border border-green-200">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Details */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-3">Your Details</h2>
            <div className="space-y-2">
              <input value={edit?.name || ''} onChange={(e)=>setEdit({...edit, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Full Name"/>
              <input value={edit?.email || ''} onChange={(e)=>setEdit({...edit, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Email"/>
              <input value={edit?.phone || ''} onChange={(e)=>setEdit({...edit, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Phone"/>
              <input value={edit?.address || ''} onChange={(e)=>setEdit({...edit, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Address"/>
              <div className="text-right">
                <button onClick={handleSaveClient} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
              </div>
            </div>
          </div>

          {/* Quotes */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-3">Your Quotes</h2>
            {quotes.length === 0 ? <p className="text-sm text-gray-500">No quotes yet.</p> : (
              <ul className="divide-y divide-gray-100">
                {quotes.map(q => (
                  <li key={q.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{q.quoteNumber || q.id.substring(0,6)}</p>
                        <p className="text-xs text-gray-500">Total {formatCurrency(q.total || 0)}</p>
                      </div>
                      <div className="flex gap-2">
                        {(q.status === 'Draft' || q.status === 'Sent' || q.status === 'Awaiting Response') && (
                          <>
                            <button onClick={() => { const n = window.prompt('Please type your full name to approve:'); if (!n) return; portalApproveQuote(q, n); }} className="px-3 py-1 text-sm bg-green-600 text-white rounded-md">Approve</button>
                            <button onClick={() => { const n = window.prompt('Please type your full name to decline:'); if (!n) return; portalDeclineQuote(q, n); }} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md">Decline</button>
                          </>
                        )}
                        {(q.status === 'Approved' || q.status === 'Accepted') && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Approved</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Jobs */}
        <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">Upcoming Jobs</h2>
          {jobs.length === 0 ? <p className="text-sm text-gray-500">No scheduled jobs yet.</p> : (
            <ul className="divide-y divide-gray-100">
              {jobs.map(j => (
                <li key={j.id} className="py-2 text-sm">
                  <div className="flex justify-between">
                    <span>{j.title}</span>
                    <span className="text-gray-500">{j.start ? formatDateTime(j.start) : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Invoices */}
        <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">Your Invoices</h2>
          {invoices.filter(i => !i.isCreditNote).length === 0 ? <p className="text-sm text-gray-500">No invoices yet.</p> : (
            <ul className="divide-y divide-gray-100">
              {invoices.filter(i => !i.isCreditNote).map(i => {
                const credits = creditsByInvoice.get(i.id) || 0;
                const net = Math.max(0, (i.total || 0) - credits);
                const canPay = (i.paymentSettings?.acceptCard ?? true) || (i.paymentSettings?.acceptBank ?? false);
                return (
                  <li key={i.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{i.invoiceNumber || i.id.substring(0,6)}</p>
                        <p className="text-xs text-gray-500">Issued {formatDate(i.issueDate || i.createdAt)}</p>
                        {credits > 0 && <p className="text-xs text-purple-700">Credits applied: {formatCurrency(credits)}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(net)}</p>
                        {i.status !== 'Paid' ? (
                          !canPay ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Payments disabled</span>
                          ) :
                          i.paymentLink ? (
                            <a href={i.paymentLink} className="inline-block mt-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Pay Now</a>
                          ) : (
                            <button onClick={() => portalPayInvoice(i)} className="inline-block mt-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Pay Now (test)</button>
                          )
                        ) : (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Paid</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 mt-8">Powered by Service Hub</div>
      </div>
    </div>
  );
};

export default PublicClientPortal;
