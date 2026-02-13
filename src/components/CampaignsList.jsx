import React, { useMemo, useState } from 'react';
import { CAMPAIGN_FILTER_TABS, STATUS_COLORS } from '../constants';

export default function CampaignsList({ campaigns, onSelect, onCreate }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return campaigns;
    return campaigns.filter((c) => c.status === filter);
  }, [campaigns, filter]);

  const statusBadge = (status) => {
    const cls = STATUS_COLORS[status] || 'bg-charcoal text-slate-400 border border-slate-700/30';
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">
            {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2.5 bg-scaffld-teal text-white rounded-lg font-semibold hover:bg-scaffld-teal/80 transition-colors"
        >
          New Campaign
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CAMPAIGN_FILTER_TABS.map((tab) => (
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

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 mx-auto text-slate-600 mb-3">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <p className="text-slate-400 font-medium">No campaigns yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Create your first email campaign to reach your clients.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const date = campaign.createdAt
              ? new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '';

            return (
              <div
                key={campaign.id}
                onClick={() => onSelect(campaign)}
                className="bg-charcoal rounded-xl border border-slate-700/30 p-4 cursor-pointer hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {campaign.name || 'Untitled Campaign'}
                      </span>
                      {statusBadge(campaign.status || 'Draft')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="capitalize">{campaign.type || 'promotion'}</span>
                      {date && <><span>·</span><span>{date}</span></>}
                      {campaign.recipientCount > 0 && (
                        <><span>·</span><span>{campaign.recipientCount} recipients</span></>
                      )}
                    </div>
                    {campaign.subject && (
                      <p className="text-sm text-slate-400 mt-2 truncate">{campaign.subject}</p>
                    )}
                  </div>
                  {campaign.status === 'Sent' && campaign.sentCount != null && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-scaffld-teal">{campaign.sentCount} sent</p>
                      {campaign.failedCount > 0 && (
                        <p className="text-xs text-signal-coral">{campaign.failedCount} failed</p>
                      )}
                    </div>
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
