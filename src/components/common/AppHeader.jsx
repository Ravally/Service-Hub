import React, { useState, useRef, useEffect } from 'react';
import BellIcon from '../icons/BellIcon';
import NotificationPanel from './NotificationPanel';
import ClampIcon from '../clamp/ClampIcon';
import { clampChatService } from '../../services/clampChatService';

const NL_KEYWORDS = ['unpaid', 'overdue', 'scheduled', 'completed', 'today', 'tomorrow', 'due', 'draft', 'active', 'paid', 'invoices', 'jobs', 'quotes'];

function isNaturalLanguage(q) {
  if (!q || !q.trim()) return false;
  const words = q.trim().split(/\s+/);
  if (words.length >= 3) return true;
  return NL_KEYWORDS.some(kw => q.toLowerCase().includes(kw));
}

const TYPE_LABELS = { client: 'Client', job: 'Job', quote: 'Quote', invoice: 'Invoice' };

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
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const resultsRef = useRef(null);

  const isNL = isNaturalLanguage(globalQuery);

  const handleSmartSearch = async () => {
    if (!globalQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await clampChatService.quickSearch(globalQuery);
      setSearchResults(data);
    } catch {
      setSearchResults({ reply: 'Search failed. Try again.', searchResults: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isNL) {
        handleSmartSearch();
      } else {
        setActiveView('clients');
        setClientSearchTerm(globalQuery);
      }
    }
    if (e.key === 'Escape') setSearchResults(null);
  };

  const handleResultClick = (r) => {
    setActiveView(r.view);
    setSearchResults(null);
    setGlobalQuery('');
  };

  useEffect(() => {
    if (!searchResults) return;
    const handler = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) setSearchResults(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchResults]);

  const searchInput = (isMobile) => (
    <div className={`relative ${isMobile ? '' : 'hidden md:block'}`} ref={isMobile ? undefined : resultsRef}>
      <input
        value={globalQuery}
        onChange={(e) => setGlobalQuery(e.target.value)}
        onKeyDown={(e) => {
          handleSearchKeyDown(e);
          if (isMobile && e.key === 'Enter' && !isNL) { setMobileSearchOpen(false); }
        }}
        placeholder={isNL ? 'Ask Clamp...' : 'Search clients...'}
        className={`px-3 py-2 bg-charcoal border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-scaffld-teal focus:ring-2 focus:ring-scaffld-teal/20 transition-all ${isMobile ? 'w-full min-h-[44px]' : 'w-64'} ${isNL ? 'pr-9' : ''}`}
        aria-label="Global search"
        autoFocus={isMobile}
      />
      {isNL && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-clamp pointer-events-none">
          <ClampIcon size={14} />
        </span>
      )}
      {searchLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-charcoal border border-slate-700/50 rounded-lg p-3 shadow-xl z-50">
          <div className="flex items-center gap-2 text-sm text-clamp">
            <ClampIcon size={14} className="animate-pulse" />
            <span>Clamp is searching...</span>
          </div>
        </div>
      )}
      {!isMobile && searchResults && !searchLoading && (
        <SearchResultsDropdown results={searchResults} onClick={handleResultClick} onClose={() => setSearchResults(null)} />
      )}
    </div>
  );

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
          {searchInput(false)}
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
      {mobileSearchOpen && (
        <div className="md:hidden">
          {searchInput(true)}
          {searchResults && !searchLoading && (
            <SearchResultsDropdown results={searchResults} onClick={handleResultClick} onClose={() => setSearchResults(null)} />
          )}
        </div>
      )}
    </header>
  );
}

function SearchResultsDropdown({ results, onClick, onClose }) {
  const items = results.searchResults || [];
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-charcoal border border-slate-700/50 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
      {results.reply && (
        <div className="px-3 py-2 border-b border-slate-700/30 flex items-center gap-2">
          <ClampIcon size={12} className="text-clamp shrink-0" />
          <p className="text-xs text-slate-300 line-clamp-2">{results.reply}</p>
        </div>
      )}
      {items.length > 0 ? (
        <div className="py-1">
          {items.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => onClick(r)}
              className="w-full text-left px-3 py-2 hover:bg-midnight/60 flex items-center gap-3 transition-colors min-h-[44px]"
            >
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/20 shrink-0">
                {TYPE_LABELS[r.type] || r.type}
              </span>
              <span className="text-sm text-slate-100 truncate">{r.title}</span>
              {r.subtitle && <span className="text-xs text-slate-500 ml-auto shrink-0">{r.subtitle}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-3 text-sm text-slate-500">No results found.</div>
      )}
      <div className="px-3 py-1.5 border-t border-slate-700/30 flex justify-end">
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200 min-h-[44px] px-2">Dismiss</button>
      </div>
    </div>
  );
}
