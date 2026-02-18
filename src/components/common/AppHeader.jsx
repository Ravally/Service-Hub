import React, { useState } from 'react';
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="mb-6 space-y-3 sticky top-0 z-40 bg-midnight/95 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-3 pb-2 lg:static lg:bg-transparent lg:backdrop-blur-none lg:mx-0 lg:pt-0 lg:pb-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          <button className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-charcoal transition-colors" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-200">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-100 tracking-tight truncate">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
                  const name = userProfile?.firstName || ((userProfile?.email?.split('@')[0] || '').split(/[._-]/)[0].replace(/^./, c => c.toUpperCase()));
                  return name ? `${greeting}, ${name}` : greeting;
                })()}
              </h1>
              {(() => {
                const mode = import.meta.env.MODE;
                if (mode === 'staging') return <span className="px-2 py-1 text-xs font-semibold rounded bg-harvest-amber/20 text-harvest-amber border border-harvest-amber/30 shrink-0">Staging</span>;
                return null;
              })()}
            </div>
            <p className="hidden md:block text-sm text-slate-500 mt-0.5">Run smarter. Grow faster.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 relative shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(s => !s)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-scaffld-teal transition-colors"
            aria-label="Search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          {/* Desktop search */}
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
          <button onClick={() => setShowNotifications(s => !s)} className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-scaffld-teal transition-colors">
            <BellIcon />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4">
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
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>
      </div>
      {/* Mobile search bar — expands below header */}
      {mobileSearchOpen && (
        <div className="md:hidden">
          <input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setActiveView('clients'); setClientSearchTerm(globalQuery); setMobileSearchOpen(false); } }}
            placeholder="Search clients..."
            className="w-full px-3 py-2.5 bg-charcoal border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20 min-h-[44px]"
            aria-label="Global search"
            autoFocus
          />
        </div>
      )}
    </header>
  );
}
