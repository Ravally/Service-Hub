import React from 'react';
import BellIcon from '../icons/BellIcon';
import InvoiceIcon from '../icons/InvoiceIcon';
import FileTextIcon from '../icons/FileTextIcon';
import BriefcaseIcon from '../icons/BriefcaseIcon';

const NOTIFICATION_ICONS = {
  invoice_sent: InvoiceIcon,
  quote_sent: FileTextIcon,
  quote_sms: FileTextIcon,
  service_request: BriefcaseIcon,
};

export default function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearRead,
  onNavigate,
  onClose,
}) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasRead = notifications.some(n => n.read);

  return (
    <>
      {/* Backdrop — mobile only */}
      <div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 top-0 bottom-0 sm:inset-auto sm:right-4 sm:top-16 sm:w-96 bg-charcoal sm:rounded-lg shadow-xl border-0 sm:border sm:border-slate-700/30 z-50 animate-fade-in-fast flex flex-col sm:max-h-[60vh]">
        {/* Header */}
        <div className="p-3 border-b border-slate-700/30 flex items-center justify-between shrink-0">
          <span className="font-semibold text-sm text-slate-100">Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs font-semibold text-scaffld-teal hover:underline min-h-[44px] px-2"
              >
                Mark all read
              </button>
            )}
            {hasRead && (
              <button
                onClick={onClearRead}
                className="text-xs font-semibold text-slate-400 hover:text-signal-coral hover:underline min-h-[44px] px-2"
              >
                Clear read
              </button>
            )}
            <button
              onClick={onClose}
              className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100"
              aria-label="Close notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellIcon className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/30">
              {notifications.map(n => {
                const Icon = NOTIFICATION_ICONS[n.type] || BellIcon;
                return (
                  <li
                    key={n.id}
                    onClick={() => onNavigate(n)}
                    className={`p-3 text-sm cursor-pointer hover:bg-midnight/60 transition-colors flex items-start gap-3 min-h-[44px] ${!n.read ? 'bg-scaffld-teal/10' : ''}`}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-slate-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100">{n.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkAsRead(n.id); }}
                            className="text-xs font-semibold text-scaffld-teal hover:underline min-h-[44px] px-1"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
