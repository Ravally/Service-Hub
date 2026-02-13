import React from 'react';
import { STATUS_COLORS } from '../constants';

export default function CampaignDetailView({
  campaign, onBack, onEdit, onSend, onDelete,
}) {
  if (!campaign) return null;

  const statusCls = STATUS_COLORS[campaign.status] || 'bg-charcoal text-slate-400 border border-slate-700/30';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

  const isDraft = campaign.status === 'Draft';
  const isScheduled = campaign.status === 'Scheduled';
  const isSent = campaign.status === 'Sent';

  // Render body as paragraphs for preview
  const bodyPreview = (campaign.body || '').split('\n').map((line, i) => (
    line ? <p key={i} className="mb-1">{line}</p> : <br key={i} />
  ));

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200 mb-2 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="m15 18-6-6 6-6" /></svg>
            Back to Campaigns
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100 truncate">
              {campaign.name || 'Untitled Campaign'}
            </h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusCls}`}>
              {campaign.status || 'Draft'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 capitalize">{campaign.type || 'promotion'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(isDraft || isScheduled) && (
            <button
              onClick={() => onEdit(campaign)}
              className="px-3 py-2 bg-midnight border border-slate-700 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Edit
            </button>
          )}
          {(isDraft || isScheduled) && (
            <button
              onClick={() => onSend(campaign.id)}
              className="px-3 py-2 bg-scaffld-teal text-white rounded-lg text-sm font-semibold hover:bg-scaffld-teal/80 transition-colors"
            >
              Send Now
            </button>
          )}
          <button
            onClick={() => onDelete(campaign.id)}
            className="px-3 py-2 text-sm text-signal-coral hover:text-signal-coral/80 font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      {isSent && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{campaign.recipientCount || 0}</p>
            <p className="text-xs text-slate-500">Recipients</p>
          </div>
          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4 text-center">
            <p className="text-2xl font-bold text-scaffld-teal">{campaign.sentCount || 0}</p>
            <p className="text-xs text-slate-500">Sent</p>
          </div>
          <div className="bg-charcoal rounded-xl border border-slate-700/30 p-4 text-center">
            <p className="text-2xl font-bold text-signal-coral">{campaign.failedCount || 0}</p>
            <p className="text-xs text-slate-500">Failed</p>
          </div>
        </div>
      )}

      {/* Email preview */}
      <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5 mb-4">
        <p className="text-sm font-semibold text-slate-200 mb-3">Email Preview</p>
        <div className="bg-midnight rounded-lg p-4 border border-slate-700/20">
          <p className="text-xs text-slate-500 mb-1">Subject:</p>
          <p className="text-sm font-medium text-slate-100 mb-4">{campaign.subject || '(no subject)'}</p>
          <p className="text-xs text-slate-500 mb-1">Body:</p>
          <div className="text-sm text-slate-300">
            {bodyPreview}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-charcoal rounded-xl border border-slate-700/30 p-5">
        <p className="text-sm font-semibold text-slate-200 mb-3">Timeline</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 w-20 shrink-0">Created</span>
            <span className="text-slate-300">{fmtDate(campaign.createdAt)}</span>
          </div>
          {campaign.scheduledFor && (
            <div className="flex items-center gap-3">
              <span className="text-slate-500 w-20 shrink-0">Scheduled</span>
              <span className="text-slate-300">{fmtDate(campaign.scheduledFor)}</span>
            </div>
          )}
          {campaign.sentAt && (
            <div className="flex items-center gap-3">
              <span className="text-slate-500 w-20 shrink-0">Sent</span>
              <span className="text-slate-300">{fmtDate(campaign.sentAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
