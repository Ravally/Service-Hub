import React from 'react';
import { PUBLIC_HOLIDAY_REGIONS } from '../../constants/companyDefaults';
import { inputCls, labelCls, sectionCls, sectionTitle, saveBtnCls, Toggle } from './settingsShared';

export default function SchedulingNotificationsTab({ tab, companySettings, cs, csn, handleSaveSettings }) {
  if (tab === 'scheduling') {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-100 mb-6">Scheduling & Availability</h3>
        <form onSubmit={handleSaveSettings}>
          <div className={sectionCls}>
            <h4 className={sectionTitle}>Working Days</h4>
            <div className="flex flex-wrap gap-3">
              {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                const checked = companySettings.workingDays?.[day] ?? (day !== 'saturday' && day !== 'sunday');
                return (
                  <button key={day} type="button" onClick={() => csn('workingDays', { [day]: !checked })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                      checked ? 'bg-trellio-teal/10 border-trellio-teal text-trellio-teal' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >{day.slice(0, 3)}</button>
                );
              })}
            </div>
          </div>

          <div className={sectionCls}>
            <h4 className={sectionTitle}>Working Hours</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Start Time</label><input type="time" value={companySettings.workingHoursStart || '07:00'} onChange={e => cs({ workingHoursStart: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>End Time</label><input type="time" value={companySettings.workingHoursEnd || '17:00'} onChange={e => cs({ workingHoursEnd: e.target.value })} className={inputCls} /></div>
            </div>
          </div>

          <div className={sectionCls}>
            <h4 className={sectionTitle}>Appointments</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Default Duration (min)</label>
                <select value={companySettings.defaultAppointmentDuration || 60} onChange={e => cs({ defaultAppointmentDuration: parseInt(e.target.value) })} className={inputCls}>
                  <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option>
                  <option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option>
                  <option value={180}>3 hours</option><option value={240}>4 hours</option><option value={480}>Full day</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Buffer Between Jobs (min)</label>
                <select value={companySettings.bufferTimeBetweenJobs || 15} onChange={e => cs({ bufferTimeBetweenJobs: parseInt(e.target.value) })} className={inputCls}>
                  <option value={0}>None</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hour</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Public Holidays</label>
                <select value={companySettings.publicHolidayRegion || 'NZ'} onChange={e => cs({ publicHolidayRegion: e.target.value })} className={inputCls}>
                  {PUBLIC_HOLIDAY_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="text-right"><button type="submit" className={saveBtnCls}>Save Schedule Settings</button></div>
        </form>
      </div>
    );
  }

  // notifications tab
  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-100 mb-6">Notifications & Reminders</h3>
      <form onSubmit={handleSaveSettings}>
        <div className={sectionCls}>
          <h4 className={sectionTitle}>Overdue Invoice Reminders</h4>
          <Toggle checked={companySettings.notifications?.overdueReminder?.enabled || false} onChange={v => csn('notifications', { overdueReminder: { ...(companySettings.notifications?.overdueReminder || {}), enabled: v } })} label="Auto-send reminders for overdue invoices" />
          {companySettings.notifications?.overdueReminder?.enabled && (
            <div className="mt-3">
              <label className={labelCls}>Send reminders at (days after due date)</label>
              <input type="text" value={(companySettings.notifications?.overdueReminder?.daysAfterDue || [3, 7, 14]).join(', ')} onChange={e => csn('notifications', { overdueReminder: { ...(companySettings.notifications?.overdueReminder || {}), daysAfterDue: e.target.value.split(',').map(d => parseInt(d.trim())).filter(Boolean) } })} className={inputCls} placeholder="3, 7, 14" />
              <p className="text-xs text-slate-500 mt-1">Comma-separated list of days (e.g., 3, 7, 14)</p>
            </div>
          )}
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Appointment Reminders</h4>
          <Toggle checked={companySettings.notifications?.appointmentReminder?.enabled || false} onChange={v => csn('notifications', { appointmentReminder: { ...(companySettings.notifications?.appointmentReminder || {}), enabled: v } })} label="Send appointment reminders to clients" />
          {companySettings.notifications?.appointmentReminder?.enabled && (
            <div className="mt-3 max-w-xs">
              <label className={labelCls}>Hours before appointment</label>
              <select value={companySettings.notifications?.appointmentReminder?.hoursBefore || 24} onChange={e => csn('notifications', { appointmentReminder: { ...(companySettings.notifications?.appointmentReminder || {}), hoursBefore: parseInt(e.target.value) } })} className={inputCls}>
                <option value={1}>1 hour</option><option value={2}>2 hours</option><option value={4}>4 hours</option>
                <option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option>
              </select>
            </div>
          )}
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Quote Follow-up</h4>
          <Toggle checked={companySettings.notifications?.quoteFollowUp?.enabled || false} onChange={v => csn('notifications', { quoteFollowUp: { ...(companySettings.notifications?.quoteFollowUp || {}), enabled: v } })} label="Auto-send follow-up for unanswered quotes" />
          {companySettings.notifications?.quoteFollowUp?.enabled && (
            <div className="mt-3 max-w-xs">
              <label className={labelCls}>Days after sending</label>
              <input type="number" min="1" value={companySettings.notifications?.quoteFollowUp?.daysAfterSend || 7} onChange={e => csn('notifications', { quoteFollowUp: { ...(companySettings.notifications?.quoteFollowUp || {}), daysAfterSend: parseInt(e.target.value) || 7 } })} className={inputCls} />
            </div>
          )}
        </div>

        <div className={sectionCls}>
          <h4 className={sectionTitle}>Notification Channels</h4>
          <div className="space-y-3">
            <Toggle checked={companySettings.notifications?.preferEmail ?? true} onChange={v => csn('notifications', { preferEmail: v })} label="Email notifications" />
            <Toggle checked={companySettings.notifications?.preferInApp ?? true} onChange={v => csn('notifications', { preferInApp: v })} label="In-app notifications" />
            <Toggle checked={companySettings.notifications?.preferSms || false} onChange={v => csn('notifications', { preferSms: v })} label="SMS notifications (requires SMS integration)" />
          </div>
        </div>

        <div className="text-right"><button type="submit" className={saveBtnCls}>Save Notification Settings</button></div>
      </form>
    </div>
  );
}
