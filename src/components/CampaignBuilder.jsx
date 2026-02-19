import React, { useState, useEffect } from 'react';
import {
  CAMPAIGN_TYPES, CAMPAIGN_RECIPIENT_TYPES, CAMPAIGN_PLACEHOLDERS,
  CLIENT_STATUSES, initialCampaignState,
} from '../constants';
import { SEGMENT_DEFINITIONS } from '../utils';
import ClampButton from './clamp/ClampButton';
import { aiService } from '../services/aiService';

export default function CampaignBuilder({
  campaign, clients, allTags, computeRecipientCount,
  onSave, onSend, onCancel,
}) {
  const [form, setForm] = useState(initialCampaignState);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    if (campaign) {
      setForm({ ...initialCampaignState, ...campaign });
    }
  }, [campaign]);

  useEffect(() => {
    const count = computeRecipientCount(
      form.recipientType, form.statusFilter, form.tagFilter, form.customRecipientIds, form.segmentFilter,
    );
    setRecipientCount(count);
  }, [form.recipientType, form.statusFilter, form.tagFilter, form.customRecipientIds, form.segmentFilter, computeRecipientCount]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field, item) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item] };
    });
  };

  const [aiLoading, setAiLoading] = useState(false);

  const insertPlaceholder = (token) => {
    set('body', form.body + token);
  };

  const handleAiDraft = async () => {
    setAiLoading(true);
    try {
      const result = await aiService.draftCampaign({
        type: form.type,
        name: form.name,
        recipientType: form.recipientType,
      });
      if (result.subject) set('subject', result.subject);
      if (result.body) set('body', result.body);
    } catch (err) {
      console.error('Campaign draft failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    await onSave({ ...form, status: 'Draft', recipientCount });
  };

  const handleSendNow = async () => {
    if (!form.subject.trim()) return;
    if (recipientCount === 0) return;
    const id = await onSave({ ...form, status: 'Draft', recipientCount });
    if (id) await onSend(id);
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-700 rounded-lg bg-midnight text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-scaffld-teal/50 focus:border-scaffld-teal';
  const labelCls = 'block text-sm font-medium text-slate-300 mb-1';
  const sectionCls = 'bg-charcoal rounded-xl border border-slate-700/30 p-5 mb-4';

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">
          {campaign ? 'Edit Campaign' : 'New Campaign'}
        </h1>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-200">
          Cancel
        </button>
      </div>

      {/* Details */}
      <div className={sectionCls}>
        <p className="text-sm font-semibold text-slate-200 mb-3">Details</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Campaign Name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls}
              placeholder="e.g. Spring Promotion"
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-200">Email Content</p>
          <ClampButton label="Clamp Draft" onClick={handleAiDraft} loading={aiLoading} />
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Subject</label>
            <input
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              className={inputCls}
              placeholder="Email subject line"
            />
          </div>
          <div>
            <label className={labelCls}>Body</label>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              rows={8}
              className={inputCls}
              placeholder="Write your email content here. Use placeholders like {{clientName}} for personalization."
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Insert placeholder:</p>
            <div className="flex gap-2 flex-wrap">
              {CAMPAIGN_PLACEHOLDERS.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  onClick={() => insertPlaceholder(p.token)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-midnight border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className={sectionCls}>
        <p className="text-sm font-semibold text-slate-200 mb-3">Recipients</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Send To</label>
            <select
              value={form.recipientType}
              onChange={(e) => set('recipientType', e.target.value)}
              className={inputCls}
            >
              {CAMPAIGN_RECIPIENT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {form.recipientType === 'byStatus' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Select statuses:</p>
              <div className="flex gap-2 flex-wrap">
                {CLIENT_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleArrayItem('statusFilter', s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (form.statusFilter || []).includes(s)
                        ? 'bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/30'
                        : 'bg-midnight border border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.recipientType === 'byTag' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Select tags:</p>
              <div className="flex gap-2 flex-wrap">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleArrayItem('tagFilter', tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (form.tagFilter || []).includes(tag)
                        ? 'bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/30'
                        : 'bg-midnight border border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length === 0 && (
                  <p className="text-xs text-slate-500">No tags found on any clients.</p>
                )}
              </div>
            </div>
          )}

          {form.recipientType === 'bySegment' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Select segments:</p>
              <div className="flex gap-2 flex-wrap">
                {SEGMENT_DEFINITIONS.map((seg) => (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={() => toggleArrayItem('segmentFilter', seg.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (form.segmentFilter || []).includes(seg.key)
                        ? seg.color
                        : 'bg-midnight border border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.recipientType === 'custom' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Select clients:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {clients.filter((c) => c.email).map((client) => (
                  <label key={client.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-midnight cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.customRecipientIds || []).includes(client.id)}
                      onChange={() => toggleArrayItem('customRecipientIds', client.id)}
                    />
                    <span className="text-slate-200">{client.name}</span>
                    <span className="text-slate-500 text-xs truncate">{client.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-slate-400">Eligible recipients:</span>
            <span className="text-sm font-semibold text-scaffld-teal">{recipientCount}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-midnight border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveDraft}
          className="px-4 py-2.5 bg-charcoal border border-slate-700 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
        >
          Save Draft
        </button>
        <button
          onClick={handleSendNow}
          disabled={!form.subject.trim() || recipientCount === 0}
          className="px-4 py-2.5 bg-scaffld-teal text-white rounded-lg text-sm font-semibold hover:bg-scaffld-teal/80 disabled:opacity-50 transition-colors"
        >
          Send Now
        </button>
      </div>
    </div>
  );
}
