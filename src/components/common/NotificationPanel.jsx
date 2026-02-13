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
}) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasRead = notifications.some(n => n.read);

  return (
    <div className="fixed right-6 top-16 w-96 bg-charcoal rounded-lg shadow-xl border border-slate-700/30 z-50 animate-fade-in-fast max-h-[60vh] overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
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
        </div>
      </div>

      {/* Empty state */}
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
                className={`p-3 text-sm cursor-pointer hover:bg-midnight/60 transition-colors flex items-start gap-3 ${!n.read ? 'bg-scaffld-teal/10' : ''}`}
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
  );
}
