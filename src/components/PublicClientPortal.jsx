// src/components/PublicClientPortal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, onSnapshot, query, updateDoc, where, addDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatCurrency, formatDate, formatDateTime } from '../utils';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import ServiceRequestModal from './clientPortal/ServiceRequestModal';

const PublicClientPortal = ({ uid, clientId, company }) => {
  const [client, setClient] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const [message, setMessage] = useState('');
  const [jobsTab, setJobsTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [showServiceRequestModal, setShowServiceRequestModal] = useState(false);

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
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

  // Computed values
  const creditsByInvoice = useMemo(() => {
    const map = new Map();
    invoices.forEach(inv => {
      if (inv.isCreditNote && inv.creditForInvoiceId) {
        map.set(inv.creditForInvoiceId, (map.get(inv.creditForInvoiceId) || 0) + (inv.total || 0));
      }
    });
    return map;
  }, [invoices]);

  const upcomingJobs = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => {
      if (j.status === 'Completed') return false;
      if (!j.start) return true; // unscheduled jobs count as upcoming
      return new Date(j.start) >= now;
    });
  }, [jobs]);

  const pastJobs = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => {
      if (j.status === 'Completed') return false;
      if (!j.start) return false;
      return new Date(j.start) < now;
    });
  }, [jobs]);

  const completedJobs = useMemo(() => {
    return jobs
      .filter(j => j.status === 'Completed')
      .sort((a, b) => new Date(b.completedAt || b.start || 0) - new Date(a.completedAt || a.start || 0));
  }, [jobs]);

  const paymentHistory = useMemo(() => {
    const payments = [];
    invoices.forEach(inv => {
      if (inv.payments && Array.isArray(inv.payments)) {
        inv.payments.forEach(payment => {
          payments.push({
            ...payment,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
          });
        });
      }
    });
    return payments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

  const handleDownloadInvoice = (invoice) => {
    try {
      downloadInvoicePDF(invoice, client, company);
    } catch (e) {
      console.error('PDF generation error:', e);
      setError('Failed to generate PDF');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleServiceRequestSuccess = () => {
    setMessage('Service request submitted successfully! We\'ll be in touch soon.');
    setTimeout(() => setMessage(''), 4000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-midnight">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header with Request Service Button */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{company?.name || 'Your Company'} - Client Portal</h1>
            <p className="text-slate-400 mt-1">Welcome, {client?.name}</p>
          </div>
          <button
            onClick={() => setShowServiceRequestModal(true)}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Request Service
          </button>
        </div>

        {(message) && <div className="mb-4 p-3 rounded bg-green-50 text-trellio-teal border border-green-200 text-sm sm:text-base">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Details */}
          <div className="lg:col-span-1 bg-charcoal rounded-xl shadow border border-slate-700/30 p-4">
            <h2 className="text-lg font-semibold mb-3">Your Details</h2>
            <div className="space-y-2">
              <input value={edit?.name || ''} onChange={(e)=>setEdit({...edit, name: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-md" placeholder="Full Name"/>
              <input value={edit?.email || ''} onChange={(e)=>setEdit({...edit, email: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-md" placeholder="Email"/>
              <input value={edit?.phone || ''} onChange={(e)=>setEdit({...edit, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-md" placeholder="Phone"/>
              <input value={edit?.address || ''} onChange={(e)=>setEdit({...edit, address: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-md" placeholder="Address"/>
              <div className="text-right">
                <button onClick={handleSaveClient} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
              </div>
            </div>
          </div>

          {/* Quotes */}
          <div className="lg:col-span-2 bg-charcoal rounded-xl shadow border border-slate-700/30 p-4">
            <h2 className="text-lg font-semibold mb-3">Your Quotes</h2>
            {quotes.length === 0 ? <p className="text-sm text-slate-400">No quotes yet.</p> : (
              <ul className="divide-y divide-gray-100">
                {quotes.map(q => (
                  <li key={q.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{q.quoteNumber || q.id.substring(0,6)}</p>
                        <p className="text-xs text-slate-400">Total {formatCurrency(q.total || 0)}</p>
                      </div>
                      <div className="flex gap-2">
                        {(q.status === 'Draft' || q.status === 'Sent' || q.status === 'Awaiting Response') && (
                          <>
                            <button onClick={() => { const n = window.prompt('Please type your full name to approve:'); if (!n) return; portalApproveQuote(q, n); }} className="px-3 py-1 text-sm bg-trellio-teal text-white rounded-md">Approve</button>
                            <button onClick={() => { const n = window.prompt('Please type your full name to decline:'); if (!n) return; portalDeclineQuote(q, n); }} className="px-3 py-1 text-sm bg-midnight text-slate-100 rounded-md">Decline</button>
                          </>
                        )}
                        {(q.status === 'Approved' || q.status === 'Accepted') && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-trellio-teal">Approved</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Jobs with Tabs */}
        <div className="mt-6 bg-charcoal rounded-xl shadow border border-slate-700/30 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Your Jobs</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setJobsTab('upcoming')}
                className={`px-3 py-1 text-sm rounded-md font-medium ${
                  jobsTab === 'upcoming'
                    ? 'bg-blue-600 text-white'
                    : 'bg-midnight text-slate-100 hover:bg-gray-200'
                }`}
              >
                Upcoming ({upcomingJobs.length})
              </button>
              <button
                onClick={() => setJobsTab('past')}
                className={`px-3 py-1 text-sm rounded-md font-medium ${
                  jobsTab === 'past'
                    ? 'bg-blue-600 text-white'
                    : 'bg-midnight text-slate-100 hover:bg-gray-200'
                }`}
              >
                Past ({pastJobs.length})
              </button>
            </div>
          </div>

          {jobsTab === 'upcoming' ? (
            upcomingJobs.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming jobs scheduled.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingJobs.map(j => (
                  <li key={j.id} className="py-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <div>
                        <p className="font-medium text-slate-100">{j.title}</p>
                        <p className="text-xs text-slate-400">{j.status}</p>
                      </div>
                      <span className="text-sm text-slate-100 sm:text-right">{j.start ? formatDateTime(j.start) : 'Not scheduled'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            pastJobs.length === 0 ? (
              <p className="text-sm text-slate-400">No past jobs.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pastJobs.map(j => (
                  <li key={j.id} className="py-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <div>
                        <p className="font-medium text-slate-100">{j.title}</p>
                        <p className="text-xs text-slate-400">{j.status}</p>
                      </div>
                      <span className="text-sm text-slate-100 sm:text-right">{j.start ? formatDateTime(j.start) : 'Not scheduled'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>

        {/* Invoices */}
        <div className="mt-6 bg-charcoal rounded-xl shadow border border-slate-700/30 p-4">
          <h2 className="text-lg font-semibold mb-3">Your Invoices</h2>
          {invoices.filter(i => !i.isCreditNote).length === 0 ? <p className="text-sm text-slate-400">No invoices yet.</p> : (
            <ul className="divide-y divide-gray-100">
              {invoices.filter(i => !i.isCreditNote).map(i => {
                const credits = creditsByInvoice.get(i.id) || 0;
                const net = Math.max(0, (i.total || 0) - credits);
                const canPay = (i.paymentSettings?.acceptCard ?? true) || (i.paymentSettings?.acceptBank ?? false);
                return (
                  <li key={i.id} className="py-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold">{i.invoiceNumber || i.id.substring(0,6)}</p>
                        <p className="text-xs text-slate-400">Issued {formatDate(i.issueDate || i.createdAt)}</p>
                        {credits > 0 && <p className="text-xs text-purple-700">Credits applied: {formatCurrency(credits)}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(net)}</p>
                          {i.status !== 'Paid' ? (
                            !canPay ? (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-midnight text-slate-400">Payments disabled</span>
                            ) :
                            i.paymentLink ? (
                              <a href={i.paymentLink} className="inline-block mt-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Pay Now</a>
                            ) : (
                              <button onClick={() => portalPayInvoice(i)} className="inline-block mt-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Pay Now (test)</button>
                            )
                          ) : (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-trellio-teal">Paid</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownloadInvoice(i)}
                          className="px-3 py-1 text-sm bg-midnight text-slate-100 rounded-md hover:bg-gray-200 whitespace-nowrap"
                          title="Download PDF"
                        >
                          📄 PDF
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="mt-6 bg-charcoal rounded-xl shadow border border-slate-700/30 p-4">
            <h2 className="text-lg font-semibold mb-3">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-midnight border-b">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-100">Date</th>
                    <th className="text-left p-2 font-medium text-slate-100">Invoice</th>
                    <th className="text-left p-2 font-medium text-slate-100">Method</th>
                    <th className="text-right p-2 font-medium text-slate-100">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentHistory.map((payment, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-slate-100">{formatDate(payment.createdAt)}</td>
                      <td className="p-2 text-slate-100">{payment.invoiceNumber || payment.invoiceId.substring(0, 8)}</td>
                      <td className="p-2 text-slate-400">{payment.method}</td>
                      <td className="p-2 text-right font-medium text-slate-100">
                        {formatCurrency((payment.amount || 0) + (payment.tip || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service History */}
        {completedJobs.length > 0 && (
          <div className="mt-6 bg-charcoal rounded-xl shadow border border-slate-700/30 p-4">
            <h2 className="text-lg font-semibold mb-3">Service History</h2>
            <ul className="space-y-3">
              {completedJobs.slice(0, 10).map(job => {
                const relatedInvoice = invoices.find(inv => inv.jobId === job.id);
                return (
                  <li key={job.id} className="flex flex-col sm:flex-row sm:justify-between pb-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-100">{job.title}</p>
                      <p className="text-xs text-slate-400">Completed: {formatDate(job.completedAt || job.start)}</p>
                      {relatedInvoice && (
                        <p className="text-xs text-blue-600 mt-1">
                          Invoice: {relatedInvoice.invoiceNumber} ({relatedInvoice.status})
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 mt-2 sm:mt-0 sm:text-right">
                      {job.notes && <p className="text-xs italic">{job.notes.substring(0, 100)}{job.notes.length > 100 ? '...' : ''}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {completedJobs.length > 10 && (
              <p className="text-xs text-center text-slate-400 mt-3">Showing 10 most recent services</p>
            )}
          </div>
        )}

        {/* Service Request Modal */}
        {showServiceRequestModal && (
          <ServiceRequestModal
            uid={uid}
            clientId={clientId}
            clientName={client?.name}
            onClose={() => setShowServiceRequestModal(false)}
            onSuccess={handleServiceRequestSuccess}
          />
        )}

        <div className="text-center text-xs text-gray-400 mt-8">Powered by Service Hub</div>
      </div>
    </div>
  );
};

export default PublicClientPortal;
