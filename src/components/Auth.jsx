// src/components/Auth.jsx
import React, { useState } from 'react';
import ScaffldLogo from './icons/ScaffldLogo';
import { useAuth } from '../contexts/AuthContext';

const getInitialAuthMode = () => {
  const path = window.location.pathname.toLowerCase();
  if (path === '/signup' || path === '/register') return 'signup';
  return 'login';
};

const Auth = () => {
  const { signUp, signIn, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState(getInitialAuthMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (authMode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        });
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setResetSent(false);
  };

  const inputCls = 'w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20';

  return (
    <div className="min-h-screen bg-midnight flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ScaffldLogo size="xl" />
          </div>
          {authMode === 'signup' && (
            <p className="text-slate-400 text-sm mt-2">14 days free. No credit card required.</p>
          )}
        </div>

        <div className="bg-charcoal p-8 rounded-xl border border-slate-700/30 shadow-lg">
          <h2 className="text-2xl font-bold font-display text-slate-100 mb-6 text-center">
            {authMode === 'login' && 'Welcome back'}
            {authMode === 'signup' && 'Start your free trial'}
            {authMode === 'forgot' && 'Reset your password'}
          </h2>

          {/* Forgot password flow */}
          {authMode === 'forgot' ? (
            resetSent ? (
              <div className="text-center">
                <div className="bg-scaffld-teal/10 border border-scaffld-teal/20 p-4 rounded-md mb-6">
                  <p className="text-sm text-scaffld-teal font-medium">Check your email for a password reset link.</p>
                </div>
                <button onClick={() => switchMode('login')} className="text-sm text-slate-400 hover:text-scaffld-teal transition-colors">
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-slate-400 mb-2">Enter your email and we'll send you a link to reset your password.</p>
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
                  <input id="resetEmail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@company.com" />
                </div>
                {error && (
                  <div className="text-sm text-signal-coral bg-signal-coral/10 border border-signal-coral/20 p-3 rounded-md">{error}</div>
                )}
                <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-scaffld-teal text-white font-semibold rounded-md hover:bg-scaffld-teal-deep focus:outline-none focus:ring-2 focus:ring-scaffld-teal/50 disabled:opacity-50 transition-colors">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )
          ) : (
            /* Login / Signup form */
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-1">First name</label>
                    <input id="firstName" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="Jesse" />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-1">Last name</label>
                    <input id="lastName" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Dean" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@company.com" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input id="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder={authMode === 'login' ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'Min. 6 characters'} />
                {authMode === 'login' && (
                  <div className="text-right mt-1">
                    <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-slate-400 hover:text-scaffld-teal transition-colors">Forgot password?</button>
                  </div>
                )}
              </div>

              {authMode === 'signup' && (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">
                    Phone <span className="text-slate-500">(optional)</span>
                  </label>
                  <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+64 21 123 4567" />
                </div>
              )}

              {error && (
                <div className="text-sm text-signal-coral bg-signal-coral/10 border border-signal-coral/20 p-3 rounded-md">{error}</div>
              )}

              <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-scaffld-teal text-white font-semibold rounded-md hover:bg-scaffld-teal-deep focus:outline-none focus:ring-2 focus:ring-scaffld-teal/50 disabled:opacity-50 transition-colors">
                {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Start Free Trial')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            {authMode === 'forgot' && !resetSent ? (
              <button onClick={() => switchMode('login')} className="text-sm text-slate-400 hover:text-scaffld-teal transition-colors">
                Back to sign in
              </button>
            ) : authMode !== 'forgot' && (
              <button onClick={() => switchMode(authMode === 'login' ? 'signup' : 'login')} className="text-sm text-slate-400 hover:text-scaffld-teal transition-colors">
                {authMode === 'login' ? 'Need an account? Start free trial' : 'Already have an account? Sign in'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
