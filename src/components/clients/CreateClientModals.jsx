import React from 'react';

export function CommSettingsModal({ commPrefs, setCommPrefs, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-charcoal rounded-xl shadow-2xl border border-slate-700/30 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Communication Settings</h3>
        <p className="text-sm text-slate-400 mb-4">Automated communications can be toggled per client.</p>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Quotes & Invoices</div>
            <label className="flex items-center justify-between text-sm py-2"><span>Outstanding quote follow-ups</span><input type="checkbox" checked={commPrefs.quoteFollowups} onChange={(e) => setCommPrefs({ ...commPrefs, quoteFollowups: e.target.checked })} /></label>
            <label className="flex items-center justify-between text-sm py-2"><span>Overdue invoice follow-ups</span><input type="checkbox" checked={commPrefs.invoiceFollowups} onChange={(e) => setCommPrefs({ ...commPrefs, invoiceFollowups: e.target.checked })} /></label>
          </div>
          <div>
            <div className="text-sm font-semibold">Jobs & Visits</div>
            <label className="flex items-center justify-between text-sm py-2"><span>Upcoming assessment or visit reminders</span><input type="checkbox" checked={commPrefs.visitReminders} onChange={(e) => setCommPrefs({ ...commPrefs, visitReminders: e.target.checked })} /></label>
            <label className="flex items-center justify-between text-sm py-2"><span>Job closure follow-ups</span><input type="checkbox" checked={commPrefs.jobFollowups} onChange={(e) => setCommPrefs({ ...commPrefs, jobFollowups: e.target.checked })} /></label>
          </div>
          <div>
            <div className="text-sm font-semibold">Reviews</div>
            <label className="flex items-center justify-between text-sm py-2"><span>Ask for a review</span><input type="checkbox" checked={commPrefs.askForReview} onChange={(e) => setCommPrefs({ ...commPrefs, askForReview: e.target.checked })} /></label>
          </div>
        </div>
        <div className="mt-4 text-right space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-midnight rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 bg-green-600 text-white rounded-md">Save</button>
        </div>
      </div>
    </div>
  );
}

export function AddContactModal({ contactDraft, setContactDraft, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-charcoal rounded-xl shadow-2xl border border-slate-700/30 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Add contact</h3>
        <div className="space-y-3">
          <input value={contactDraft.role} onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value })} placeholder="Role" className="w-full px-3 py-2 border rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input value={contactDraft.firstName} onChange={(e) => setContactDraft({ ...contactDraft, firstName: e.target.value })} placeholder="First name" className="px-3 py-2 border rounded" />
            <input value={contactDraft.lastName} onChange={(e) => setContactDraft({ ...contactDraft, lastName: e.target.value })} placeholder="Last name" className="px-3 py-2 border rounded" />
          </div>
          <label className="inline-flex items-center text-sm text-slate-300"><input type="checkbox" checked={contactDraft.isBilling} onChange={(e) => setContactDraft({ ...contactDraft, isBilling: e.target.checked })} className="mr-2" />Set as billing contact</label>
          <input value={contactDraft.phone} onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} placeholder="Phone number" className="w-full px-3 py-2 border rounded" />
          <input value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 border rounded" />
          <div className="mt-2">
            <div className="text-sm font-semibold mb-1">Communication settings</div>
            <label className="flex items-center justify-between text-sm py-2"><span>Outstanding quote follow-ups</span><input type="checkbox" checked={contactDraft.commPrefs.quoteFollowups} onChange={(e) => setContactDraft({ ...contactDraft, commPrefs: { ...contactDraft.commPrefs, quoteFollowups: e.target.checked } })} /></label>
            <label className="flex items-center justify-between text-sm py-2"><span>Overdue invoice follow-ups</span><input type="checkbox" checked={contactDraft.commPrefs.invoiceFollowups} onChange={(e) => setContactDraft({ ...contactDraft, commPrefs: { ...contactDraft.commPrefs, invoiceFollowups: e.target.checked } })} /></label>
            <label className="flex items-center justify-between text-sm py-2"><span>Upcoming assessment or visit reminders</span><input type="checkbox" checked={contactDraft.commPrefs.visitReminders} onChange={(e) => setContactDraft({ ...contactDraft, commPrefs: { ...contactDraft.commPrefs, visitReminders: e.target.checked } })} /></label>
            <label className="flex items-center justify-between text-sm py-2"><span>Job closure follow-ups</span><input type="checkbox" checked={contactDraft.commPrefs.jobFollowups} onChange={(e) => setContactDraft({ ...contactDraft, commPrefs: { ...contactDraft.commPrefs, jobFollowups: e.target.checked } })} /></label>
          </div>
        </div>
        <div className="mt-4 text-right space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-midnight rounded-md">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-green-600 text-white rounded-md">Add contact</button>
        </div>
      </div>
    </div>
  );
}

export function PropContactModal({ propContactDraft, setPropContactDraft, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-charcoal rounded-xl shadow-2xl border border-slate-700/30 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Add property contact</h3>
        <div className="space-y-3">
          <input value={propContactDraft.role} onChange={(e) => setPropContactDraft({ ...propContactDraft, role: e.target.value })} placeholder="Role" className="w-full px-3 py-2 border rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input value={propContactDraft.firstName} onChange={(e) => setPropContactDraft({ ...propContactDraft, firstName: e.target.value })} placeholder="First name" className="px-3 py-2 border rounded" />
            <input value={propContactDraft.lastName} onChange={(e) => setPropContactDraft({ ...propContactDraft, lastName: e.target.value })} placeholder="Last name" className="px-3 py-2 border rounded" />
          </div>
          <label className="inline-flex items-center text-sm text-slate-300">
            <input type="checkbox" checked={!!propContactDraft.isBilling} onChange={(e) => setPropContactDraft({ ...propContactDraft, isBilling: e.target.checked })} className="mr-2" />
            Set as billing contact
          </label>
          <input value={propContactDraft.phone} onChange={(e) => setPropContactDraft({ ...propContactDraft, phone: e.target.value })} placeholder="Phone number" className="w-full px-3 py-2 border rounded" />
          <input value={propContactDraft.email} onChange={(e) => setPropContactDraft({ ...propContactDraft, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 border rounded" />
        </div>
        <div className="mt-4 text-right space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-midnight rounded-md">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-green-600 text-white rounded-md">Add contact</button>
        </div>
      </div>
    </div>
  );
}
