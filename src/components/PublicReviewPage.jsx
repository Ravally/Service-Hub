import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

const StarButton = ({ filled, onClick, size = 'h-10 w-10' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${size} inline-flex items-center justify-center transition-colors`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"
      className={`h-8 w-8 ${filled ? 'text-harvest-amber' : 'text-slate-500'}`}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </button>
);

export default function PublicReviewPage({ context }) {
  const { uid, job, company } = context;
  const companyName = company?.name || 'Our Company';
  const reviewSettings = company?.reviewSettings || {};

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, `users/${uid}/reviews`), {
        jobId: job.id,
        clientId: job.clientId || '',
        clientName: job.clientName || '',
        jobTitle: job.title || '',
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        source: 'scaffld',
      });

      // Create notification for the business owner
      try {
        await addDoc(collection(db, `users/${uid}/notifications`), {
          type: 'new_review',
          title: 'New Review',
          message: `New ${rating}-star review${job.clientName ? ` from ${job.clientName}` : ''}`,
          jobId: job.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (_) { /* non-critical */ }

      setSubmitted(true);
    } catch (err) {
      console.error('Review submit error:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <div className="bg-charcoal rounded-xl shadow-lg p-8 border border-slate-700/30 max-w-lg w-full text-center">
          <div className="text-4xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 mx-auto text-scaffld-teal">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Thank you!</h2>
          <p className="text-slate-400 mb-6">Your feedback means a lot to us.</p>

          {(reviewSettings.googleReviewUrl || reviewSettings.facebookReviewUrl) && (
            <div className="border-t border-slate-700/30 pt-6">
              <p className="text-sm text-slate-400 mb-4">Would you also like to leave a review on:</p>
              <div className="flex items-center justify-center gap-4">
                {reviewSettings.googleReviewUrl && (
                  <a href={reviewSettings.googleReviewUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-midnight border border-slate-700 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                    Google
                  </a>
                )}
                {reviewSettings.facebookReviewUrl && (
                  <a href={reviewSettings.facebookReviewUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-midnight border border-slate-700 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                    Facebook
                  </a>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-8">Powered by Scaffld</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
      <div className="bg-charcoal rounded-xl shadow-lg border border-slate-700/30 max-w-lg w-full">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-slate-700/30">
          <h1 className="text-2xl font-bold text-slate-100">{companyName}</h1>
          {job.title && (
            <p className="text-sm text-slate-400 mt-1">{job.title}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          <div className="text-center">
            <p className="text-slate-300 mb-4">How was your experience?</p>
            <div className="flex items-center justify-center gap-1"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  className="h-11 w-11 inline-flex items-center justify-center transition-transform hover:scale-110"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="1.5"
                    className={`h-9 w-9 ${star <= (hoverRating || rating) ? 'text-harvest-amber' : 'text-slate-600'}`}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-slate-400 mt-2">
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Comments (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-midnight text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-scaffld-teal/50 focus:border-scaffld-teal"
              placeholder="Tell us about your experience..."
            />
          </div>

          {error && (
            <p className="text-sm text-signal-coral">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !rating}
            className="w-full py-3 bg-scaffld-teal text-white rounded-lg font-semibold hover:bg-scaffld-teal/80 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-500">Powered by Scaffld</p>
        </div>
      </div>
    </div>
  );
}
