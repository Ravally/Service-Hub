import React from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { inputCls, labelCls, sectionCls, saveBtnCls } from './settingsShared';
import TeamInviteSection from './TeamInviteSection';
import ClampHelpCard from '../clamp/ClampHelpCard';

export default function StaffTemplatesTab({ tab, userId, staff, quoteTemplates, newStaff, setNewStaff, newTemplate, setNewTemplate, handleAddTemplate, handleDeleteTemplate, newInvite, setNewInvite, handleInviteUser, userEmail }) {
  if (tab === 'staff') {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-100 mb-6">Staff</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={sectionCls}>
            <h4 className="font-semibold mb-3 text-slate-100">Add Staff Member</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const palette = ['#60A5FA','#34D399','#F59E0B','#F472B6','#A78BFA','#F87171','#2DD4BF','#FBBF24'];
              const color = newStaff.color || palette[Math.floor(Math.random() * palette.length)];
              await addDoc(collection(db, `users/${userId}/staff`), { ...newStaff, color });
              setNewStaff({ name: '', email: '', role: 'tech', color: '' });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className={labelCls}>Name</label><input type="text" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} required className={inputCls} /></div>
                <div><label className={labelCls}>Email</label><input type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Role</label><select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className={inputCls}><option value="tech">Technician</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
                <div><label className={labelCls}>Color</label><input type="color" value={newStaff.color || '#60A5FA'} onChange={e => setNewStaff({ ...newStaff, color: e.target.value })} className="w-full h-10 p-1 border border-slate-700 rounded-md bg-midnight" /></div>
              </div>
              <div className="mt-4 text-right"><button type="submit" className={saveBtnCls}>Add Staff</button></div>
            </form>
          </div>
          <div className={sectionCls}>
            <h4 className="font-semibold mb-3 text-slate-100">Current Staff</h4>
            {staff.length === 0 ? <p className="text-sm text-slate-400">No staff yet.</p> : (
              <ul className="divide-y divide-slate-700/30">
                {staff.map(s => (
                  <li key={s.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color || '#9CA3AF' }} />
                      <div><p className="font-medium text-slate-100">{s.name}</p><p className="text-xs text-slate-400">{s.email || '-'} / {s.role || 'tech'}</p></div>
                    </div>
                    <button onClick={async () => { if (!window.confirm('Remove this staff member?')) return; await deleteDoc(doc(db, `users/${userId}/staff`, s.id)); }} className="text-red-600 hover:text-red-800 text-sm font-semibold">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {handleInviteUser && (
          <TeamInviteSection
            newInvite={newInvite}
            setNewInvite={setNewInvite}
            handleInviteUser={handleInviteUser}
            userEmail={userEmail}
          />
        )}
      </div>
    );
  }

  // templates tab
  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Item Templates</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionCls}>
          <h4 className="font-semibold mb-3 text-slate-100">Create Template</h4>
          <form onSubmit={handleAddTemplate}>
            <div className="mb-3"><label className={labelCls}>Template Name</label><input type="text" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="e.g., Small House Wash" className={inputCls} /></div>
            <div className="mb-3"><label className={labelCls}>Unit Price</label><input type="number" step="0.01" value={newTemplate.price} onChange={e => setNewTemplate({ ...newTemplate, price: e.target.value })} className={inputCls} /></div>
            <div className="mt-4 text-right"><button type="submit" className={saveBtnCls}>Save Template</button></div>
          </form>
        </div>
        <div className={sectionCls}>
          <h4 className="font-semibold mb-3 text-slate-100">Existing Templates</h4>
          {quoteTemplates.length === 0 ? <p className="text-sm text-slate-400">No templates yet.</p> : (
            <ul className="divide-y divide-slate-700/30">
              {quoteTemplates.map(t => (
                <li key={t.id} className="py-3 flex items-center justify-between">
                  <div><p className="font-medium text-slate-100">{t.name}</p><p className="text-xs text-slate-400">Unit Price: ${parseFloat(t.price || 0).toFixed(2)}</p></div>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ClampHelpCard chips={[
        'Suggest common item templates for my trade',
        'What pricing should I use for house washing?',
        'Help me set up my service catalogue',
      ]} />
    </div>
  );
}
