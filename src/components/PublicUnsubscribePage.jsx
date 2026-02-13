import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function PublicUnsubscribePage({ context }) {
  const { uid, clientId } = context;
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    (async () => {
      try {
        await updateDoc(doc(db, `users/${uid}/clients`, clientId), {
          'commPrefs.marketingOptOut': true,
        });
        setStatus('success');
      } catch (err) {
        console.error('Unsubscribe error:', err);
        setStatus('error');
      }
    })();
  }, [uid, clientId]);

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
      <div className="bg-charcoal rounded-xl shadow-lg p-8 border border-slate-700/30 max-w-md w-full text-center">
        {status === 'processing' && (
          <p className="text-slate-300">Processing your request...</p>
        )}
        {status === 'success' && (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 mx-auto text-scaffld-teal mb-4">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-bold text-slate-100 mb-2">You have been unsubscribed</h2>
            <p className="text-slate-400 text-sm">You will no longer receive marketing emails from this business.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm">We could not process your unsubscribe request. Please try again later.</p>
          </>
        )}
        <p className="text-xs text-slate-500 mt-8">Powered by Scaffld</p>
      </div>
    </div>
  );
}
