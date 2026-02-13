import React from 'react';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';

export default function ReviewSettingsTab({ companySettings, cs, csn, handleSaveSettings }) {
  const reviewSettings = companySettings.reviewSettings || {};

  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Reviews</h3>
      <form onSubmit={handleSaveSettings}>
        {/* Enable/Disable */}
        <div className={sectionCls}>
          <p className={sectionTitle}>General</p>
          <div className="space-y-4">
            <Toggle
              checked={reviewSettings.enabled !== false}
              onChange={(v) => csn('reviewSettings', { enabled: v })}
              label="Enable review requests"
            />
            <Toggle
              checked={reviewSettings.autoRequest !== false}
              onChange={(v) => csn('reviewSettings', { autoRequest: v })}
              label="Auto-send review request after job completion"
            />
            <div>
              <label className={labelCls}>Delay (hours)</label>
              <input
                type="number"
                min="0"
                value={reviewSettings.delayHours || 0}
                onChange={(e) => csn('reviewSettings', { delayHours: parseInt(e.target.value) || 0 })}
                className={`${inputCls} max-w-xs`}
                placeholder="0 = send immediately"
              />
              <p className="text-xs text-slate-500 mt-1">Set to 0 for immediate send. Delay feature coming soon.</p>
            </div>
          </div>
        </div>

        {/* External review links */}
        <div className={sectionCls}>
          <p className={sectionTitle}>External Review Links</p>
          <p className="text-xs text-slate-400 mb-4">
            After submitting a review on Scaffld, customers will be shown links to also review you on these platforms.
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Google Review URL</label>
              <input
                type="url"
                value={reviewSettings.googleReviewUrl || ''}
                onChange={(e) => csn('reviewSettings', { googleReviewUrl: e.target.value })}
                className={inputCls}
                placeholder="https://g.page/r/your-business/review"
              />
            </div>
            <div>
              <label className={labelCls}>Facebook Review URL</label>
              <input
                type="url"
                value={reviewSettings.facebookReviewUrl || ''}
                onChange={(e) => csn('reviewSettings', { facebookReviewUrl: e.target.value })}
                className={inputCls}
                placeholder="https://facebook.com/your-page/reviews"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" className={saveBtnCls}>Save Changes</button>
        </div>
      </form>
    </div>
  );
}
