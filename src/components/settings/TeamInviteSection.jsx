import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { inputCls, labelCls, sectionCls, saveBtnCls } from './settingsShared';
import { ShieldIcon } from '../icons';

const INVITE_ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access to all features and settings' },
  { value: 'manager', label: 'Manager', desc: 'Manage clients, jobs, quotes, invoices' },
  { value: 'tech', label: 'Technician', desc: 'View schedule, jobs, and log work' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access to clients and dashboard' },
];

export default function TeamInviteSection({ newInvite, setNewInvite, handleInviteUser, userEmail }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'invites'), where('invitedBy', '==', userEmail));
      const snap = await getDocs(q);
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to fetch pending invites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, [userEmail]);

  const handleSubmit = async (e) => {
    await handleInviteUser(e);
    fetchPending();
  };

  const handleRevoke = async (inviteId) => {
    if (!window.confirm('Revoke this invitation?')) return;
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      setPending((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldIcon className="h-5 w-5 text-scaffld-teal" />
        <h4 className="text-lg font-semibold text-slate-100">Team Invitations</h4>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invite form */}
        <div className={sectionCls}>
          <h4 className="font-semibold mb-3 text-slate-100">Invite Team Member</h4>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className={labelCls}>Email address</label>
              <input
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                placeholder="colleague@company.com"
                required
                className={inputCls}
              />
            </div>
            <div className="mb-3">
              <label className={labelCls}>Role</label>
              <select
                value={newInvite.role}
                onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                className={inputCls}
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                {INVITE_ROLES.find((r) => r.value === newInvite.role)?.desc}
              </p>
            </div>
            <div className="mt-4 text-right">
              <button type="submit" className={saveBtnCls}>Send Invite</button>
            </div>
          </form>
        </div>

        {/* Pending invitations */}
        <div className={sectionCls}>
          <h4 className="font-semibold mb-3 text-slate-100">Pending Invitations</h4>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-slate-400">No pending invitations.</p>
          ) : (
            <ul className="divide-y divide-slate-700/30">
              {pending.map((inv) => (
                <li key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{inv.email}</p>
                    <p className="text-xs text-slate-400">
                      {inv.role || 'member'} &middot; {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-signal-coral hover:text-red-800 text-sm font-semibold"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
