import React, { useState } from 'react';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls } from './settingsShared';

export default function BillingAccountTab({ tab, userProfile, handleLogout }) {
  const { updateUserProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: userProfile?.phone || '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateUserProfile({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      phone: profileForm.phone.trim(),
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', type: '' });
    if (passwordForm.new.length < 6) {
      setPasswordMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ text: 'Passwords do not match', type: 'error' });
      return;
    }
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, passwordForm.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.new);
      setPasswordForm({ current: '', new: '', confirm: '' });
      setPasswordMsg({ text: 'Password updated successfully', type: 'success' });
    } catch (err) {
      const msg = err.code === 'auth/wrong-password' ? 'Current password is incorrect'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.'
        : err.message;
      setPasswordMsg({ text: msg, type: 'error' });
    }
  };

  if (tab === 'billing') {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-100 mb-6">Billing & Subscription</h3>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Current Plan</h4>
          {userProfile?.subscriptionStatus === 'trial' && userProfile?.trialStartDate ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-100 text-lg">Free Trial</p>
                <p className="text-sm text-slate-400">Full access to all features</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-harvest-amber">
                  {Math.max(0, 14 - Math.floor((Date.now() - new Date(userProfile.trialStartDate).getTime()) / 86400000))} days left
                </span>
                <p className="text-xs text-slate-500">Started {new Date(userProfile.trialStartDate).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-100 text-lg">{userProfile?.subscriptionStatus === 'active' ? 'Pro Plan' : 'No Active Plan'}</p>
                <p className="text-sm text-slate-400">{userProfile?.subscriptionStatus === 'active' ? 'Full access to all features' : 'Subscribe to continue using Scaffld'}</p>
              </div>
            </div>
          )}
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Upgrade</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-700 hover:border-scaffld-teal/50 transition-colors">
              <p className="font-semibold text-slate-100">Monthly</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">$49<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-400 mt-2">Billed monthly, cancel anytime</p>
              <button type="button" className={saveBtnCls + ' mt-4 w-full text-center'}>Choose Monthly</button>
            </div>
            <div className="p-4 rounded-lg border border-scaffld-teal/50 bg-scaffld-teal/5 relative">
              <span className="absolute -top-2 right-3 bg-scaffld-teal text-white text-xs font-semibold px-2 py-0.5 rounded">Save 20%</span>
              <p className="font-semibold text-slate-100">Annual</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">$39<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-400 mt-2">$468 billed annually</p>
              <button type="button" className={saveBtnCls + ' mt-4 w-full text-center'}>Choose Annual</button>
            </div>
          </div>
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Payment Method</h4>
          <p className="text-sm text-slate-400">No payment method on file.</p>
          <button type="button" className="mt-3 px-4 py-2 text-sm font-medium border border-slate-700 rounded-md text-slate-300 hover:bg-midnight transition-colors">Add Payment Method</button>
        </div>
      </div>
    );
  }

  // account tab
  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Account</h3>

      <form onSubmit={handleSaveProfile} className="mb-6">
        <h4 className={sectionTitle}>Your Profile</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><label className={labelCls}>First Name</label><input type="text" value={profileForm.firstName} onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))} className={inputCls} placeholder="Your first name" /></div>
          <div><label className={labelCls}>Last Name</label><input type="text" value={profileForm.lastName} onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))} className={inputCls} placeholder="Your last name" /></div>
          <div><label className={labelCls}>Phone</label><input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="+64 21 123 4567" /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={userProfile?.email || ''} disabled className={inputCls + ' opacity-60 cursor-not-allowed'} /></div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className={saveBtnCls}>Save Profile</button>
          {profileSaved && <span className="text-sm text-scaffld-teal">Saved!</span>}
        </div>
      </form>

      <form onSubmit={handleChangePassword} className="mb-6">
        <h4 className={sectionTitle}>Change Password</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelCls}>Current Password</label>
            <input type="password" autoComplete="current-password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" autoComplete="new-password" value={passwordForm.new} onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))} className={inputCls} required placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className={labelCls}>Confirm Password</label>
            <input type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className={inputCls} required />
          </div>
        </div>
        {passwordMsg.text && (
          <p className={`text-sm mb-3 ${passwordMsg.type === 'error' ? 'text-signal-coral' : 'text-scaffld-teal'}`}>{passwordMsg.text}</p>
        )}
        <button type="submit" className={saveBtnCls}>Update Password</button>
      </form>

      <div className="bg-midnight/60 p-5 rounded-lg border border-slate-700/30 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Role</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-scaffld-teal/15 text-scaffld-teal capitalize">{userProfile?.role}</span>
        </div>
        {userProfile?.subscriptionStatus === 'trial' && userProfile?.trialStartDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Plan</span>
            <span className="text-sm text-harvest-amber font-medium">
              Free Trial — {Math.max(0, 14 - Math.floor((Date.now() - new Date(userProfile.trialStartDate).getTime()) / 86400000))} days remaining
            </span>
          </div>
        )}
      </div>

      <button onClick={handleLogout} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Logout</button>
    </div>
  );
}
