// src/components/Auth.jsx
import React, { useState } from 'react';
import TrellioLogo from './icons/TrellioLogo';
import { useAuth } from '../contexts/AuthContext';

const Auth = () => {
  const { signUp, signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
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

  return (
    <div className="min-h-screen bg-midnight flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <TrellioLogo size="xl" />
          </div>
          {!isLogin && (
            <p className="text-slate-400 text-sm mt-2">14 days free. No credit card required.</p>
          )}
        </div>

        <div className="bg-charcoal p-8 rounded-xl border border-slate-700/30 shadow-lg">
          <h2 className="text-2xl font-bold font-display text-slate-100 mb-6 text-center">
            {isLogin ? 'Welcome back' : 'Start your free trial'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-1">First name</label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20"
                    placeholder="Jesse"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-1">Last name</label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20"
                    placeholder="Dean"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20"
                placeholder={isLogin ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'Min. 6 characters'}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">
                  Phone <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:border-trellio-teal focus:ring-2 focus:ring-trellio-teal/20"
                  placeholder="+64 21 123 4567"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-signal-coral bg-signal-coral/10 border border-signal-coral/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-trellio-teal text-white font-semibold rounded-md hover:bg-trellio-teal-deep focus:outline-none focus:ring-2 focus:ring-trellio-teal/50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Start Free Trial')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-slate-400 hover:text-trellio-teal transition-colors"
            >
              {isLogin ? 'Need an account? Start free trial' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
