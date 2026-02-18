import React, { useMemo, useState } from 'react';
import { useIsMobile } from '../hooks/ui';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: '5', label: '5 Star' },
  { key: '4', label: '4 Star' },
  { key: '3', label: '3 Star' },
  { key: 'low', label: '1-2 Star' },
];

const Stars = ({ rating, size = 'h-4 w-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill={star <= rating ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2"
        className={`${size} ${star <= rating ? 'text-harvest-amber' : 'text-slate-600'}`}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

export default function ReviewsList({ reviews, getClientNameById, onDelete }) {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    if (filter === '5') return reviews.filter((r) => r.rating === 5);
    if (filter === '4') return reviews.filter((r) => r.rating === 4);
    if (filter === '3') return reviews.filter((r) => r.rating === 3);
    if (filter === 'low') return reviews.filter((r) => r.rating <= 2);
    return reviews;
  }, [reviews, filter]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  }, [reviews]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Reviews</h1>
          <div className="flex items-center gap-3 mt-1">
            {reviews.length > 0 && (
              <>
                <Stars rating={Math.round(avgRating)} />
                <span className="text-sm text-slate-400">
                  {avgRating.toFixed(1)} avg
                </span>
              </>
            )}
            <span className="text-sm text-slate-500">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-scaffld-teal/10 text-scaffld-teal'
                : 'bg-charcoal text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 mx-auto text-slate-600 mb-3">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p className="text-slate-400 font-medium">No reviews yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Reviews will appear here when clients leave feedback after job completion.
          </p>
        </div>
      ) : (
        <div className={isMobile ? 'bg-charcoal rounded-xl border border-slate-700/30 overflow-hidden' : 'space-y-3'}>
          {filtered.map((review) => {
            const expanded = expandedId === review.id;
            const clientName = review.clientName || (review.clientId ? getClientNameById(review.clientId) : 'Anonymous');
            const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

            if (isMobile) {
              return (
                <div
                  key={review.id}
                  className="border-b border-slate-700/30 p-4 last:border-b-0 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : review.id)}
                >
                  {/* Row 1: Client name + Star rating */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-slate-100 font-semibold truncate">{clientName}</span>
                    <div className="shrink-0">
                      <Stars rating={review.rating} size="h-3.5 w-3.5" />
                    </div>
                  </div>
                  {/* Row 2: Review text preview */}
                  {review.comment && !expanded && (
                    <p className="text-sm text-slate-400 line-clamp-2">{review.comment}</p>
                  )}
                  {review.comment && expanded && (
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{review.comment}</p>
                  )}
                  {/* Row 3: Date + Delete */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-xs text-slate-500">{date}</span>
                    {onDelete && expanded && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(review.id); }}
                        className="text-xs text-signal-coral hover:text-signal-coral/80 font-medium px-2 py-1 rounded shrink-0 min-h-[44px] flex items-center"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={review.id}
                className="bg-charcoal rounded-xl border border-slate-700/30 p-4 cursor-pointer hover:border-slate-600/50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : review.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Stars rating={review.rating} />
                      <span className="text-sm font-medium text-slate-200 truncate">{clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {review.jobTitle && <span>{review.jobTitle}</span>}
                      {review.jobTitle && date && <span>·</span>}
                      {date && <span>{date}</span>}
                      {review.source && review.source !== 'scaffld' && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{review.source}</span>
                        </>
                      )}
                    </div>
                    {review.comment && !expanded && (
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2">{review.comment}</p>
                    )}
                    {review.comment && expanded && (
                      <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{review.comment}</p>
                    )}
                  </div>
                  {onDelete && expanded && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(review.id); }}
                      className="text-xs text-signal-coral hover:text-signal-coral/80 font-medium px-2 py-1 rounded shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
