import React from 'react';
import BellIcon from '../icons/BellIcon';
import NotificationPanel from './NotificationPanel';

export default function AppHeader({
  userProfile,
  globalQuery, setGlobalQuery,
  setActiveView, setClientSearchTerm,
  setSidebarOpen,
  showNotifications, setShowNotifications,
  unreadNotificationsCount,
  notifications,
  onMarkAsRead, onMarkAllAsRead, onClearRead, onNotificationNavigate,
}) {
  return (
    <header className="mb-6 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2 rounded-md border border-slate-700" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <span className="block w-5 h-0.5 bg-slate-300 mb-1"></span>
          <span className="block w-5 h-0.5 bg-slate-300 mb-1"></span>
          <span className="block w-5 h-0.5 bg-slate-300"></span>
        </button>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-slate-100 tracking-tight">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
                const name = userProfile?.firstName || ((userProfile?.email?.split('@')[0] || '').split(/[._-]/)[0].replace(/^./, c => c.toUpperCase()));
                return name ? `${greeting}, ${name}` : greeting;
              })()}
            </h1>
            {(() => {
              const mode = import.meta.env.MODE;
              if (mode === 'staging') return <span className="px-2 py-1 text-xs font-semibold rounded bg-harvest-amber/20 text-harvest-amber border border-harvest-amber/30">Staging</span>;
              return null;
            })()}
          </div>
          <p className="hidden md:block text-sm text-slate-500 mt-0.5">Run smarter. Grow faster.</p>
        </div>
      </div>
      <div className="flex items-center gap-3 relative">
        <div className="hidden md:block">
          <input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setActiveView('clients'); setClientSearchTerm(globalQuery); } }}
            placeholder="Search clients..."
            className="px-3 py-2 bg-charcoal border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20 w-64 transition-all"
            aria-label="Global search"
          />
        </div>
        <button onClick={() => setShowNotifications(s => !s)} className="relative text-slate-400 hover:text-scaffld-teal transition-colors">
          <BellIcon />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-coral opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-signal-coral text-white text-xs items-center justify-center">{unreadNotificationsCount}</span>
            </span>
          )}
        </button>
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onClearRead={onClearRead}
            onNavigate={onNotificationNavigate}
          />
        )}
      </div>
    </header>
  );
}
