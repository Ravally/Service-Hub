// src/components/Sidebar.jsx
import React, { useState, useMemo } from 'react';
import {
  LayoutDashboardIcon,
  CalendarIcon,
  UsersIcon,
  FileTextIcon,
  InvoiceIcon,
  SettingsIcon,
  PlusCircleIcon,
  BriefcaseIcon,
  TrendingUpIcon,
  DollarSignIcon,
  StarIcon,
  MailIcon,
} from './icons';
import ScaffldLogo from './icons/ScaffldLogo';
import { filterByPermission } from '../utils/permissions';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboardIcon, permission: 'nav.dashboard' },
  { key: 'schedule', label: 'Schedule', icon: CalendarIcon, permission: 'nav.schedule' },
  { key: 'clients', label: 'Clients', icon: UsersIcon, permission: 'nav.clients' },
  { key: 'requests', label: 'Requests', icon: FileTextIcon, permission: 'nav.requests' },
  { key: 'quotes', label: 'Quotes', icon: FileTextIcon, permission: 'nav.quotes', activeKeys: ['quotes', 'createQuote'] },
  { key: 'jobs', label: 'Jobs', icon: BriefcaseIcon, permission: 'nav.jobs' },
  { key: 'bookings', label: 'Bookings', icon: CalendarIcon, permission: 'nav.bookings' },
  { key: 'invoices', label: 'Invoices', icon: InvoiceIcon, permission: 'nav.invoices', activeKeys: ['invoices', 'createInvoice'] },
  { key: 'reviews', label: 'Reviews', icon: StarIcon, permission: 'nav.reviews' },
  { key: 'campaigns', label: 'Campaigns', icon: MailIcon, permission: 'nav.campaigns', activeKeys: ['campaigns', 'createCampaign'] },
  { type: 'divider' },
  { key: 'reports', label: 'Reports', icon: TrendingUpIcon, permission: 'nav.reports' },
  { key: 'expenses', label: 'Expenses', icon: DollarSignIcon, permission: 'nav.expenses' },
  { key: 'timesheets', label: 'Timesheets', icon: LayoutDashboardIcon, permission: 'nav.timesheets' },
  { key: 'apps', label: 'Apps', icon: LayoutDashboardIcon, permission: 'nav.apps' },
  { type: 'divider' },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, permission: 'nav.settings' },
];

const CREATE_ITEMS = [
  { type: 'client', label: 'Client', icon: UsersIcon, color: 'bg-slate-dark text-slate-300', permission: 'create.client' },
  { type: 'request', label: 'Request', icon: FileTextIcon, color: 'bg-harvest-amber/20 text-harvest-amber', permission: 'create.request' },
  { type: 'quote', label: 'Quote', icon: FileTextIcon, color: 'bg-signal-coral/20 text-signal-coral', permission: 'create.quote' },
  { type: 'job', label: 'Job', icon: BriefcaseIcon, color: 'bg-scaffld-teal/20 text-scaffld-teal', permission: 'create.job' },
  { type: 'invoice', label: 'Invoice', icon: InvoiceIcon, color: 'bg-blue-500/20 text-blue-400', permission: 'create.invoice' },
];

const NavItem = ({ active, label, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full h-10 flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-scaffld-teal/10 text-scaffld-teal border-l-2 border-scaffld-teal'
        : 'text-slate-300 hover:bg-charcoal hover:text-scaffld-teal'
    }`}
  >
    <span className="shrink-0 inline-flex items-center justify-center h-5 w-5">{children}</span>
    <span className="truncate leading-none">{label}</span>
  </button>
);

const Sidebar = ({ activeView, setActiveView, onCreateAction, open = false, onClose, userRole }) => {
  const [createOpen, setCreateOpen] = useState(false);

  const visibleNav = useMemo(() => filterByPermission(userRole, NAV_ITEMS), [userRole]);
  const visibleCreate = useMemo(() => filterByPermission(userRole, CREATE_ITEMS), [userRole]);

  const Body = (
    <div className="flex flex-col w-64 bg-midnight text-white min-h-full">
      <div className="px-4 py-5 border-b border-slate-700/30">
        <ScaffldLogo size="lg" />
      </div>
      <div className="p-4 relative">
        {visibleCreate.length > 0 && (
          <div className="mb-4 relative">
            <button
              onClick={() => setCreateOpen(v => !v)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-scaffld-teal hover:bg-scaffld-teal-deep text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              <PlusCircleIcon /> Create
            </button>
            {createOpen && (
              <div className="absolute left-full ml-3 top-0 z-[9999]">
                <div className="absolute -left-2 top-3 h-4 w-4 bg-charcoal border border-slate-700/30 rotate-45 rounded-sm" />
                <div className="relative bg-charcoal text-slate-100 rounded-xl shadow-xl border border-slate-700/30 p-3">
                  <div className="flex items-center gap-3">
                    {visibleCreate.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.type} onClick={() => { onCreateAction && onCreateAction(item.type); setCreateOpen(false); }} className="flex flex-col items-center px-3 py-2 hover:bg-charcoal/50 rounded-lg transition-colors">
                          <span className={`h-8 w-8 rounded-lg inline-flex items-center justify-center ${item.color}`}><Icon className="h-4 w-4" /></span>
                          <span className="mt-1 text-xs font-semibold text-slate-700">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <nav className="space-y-1">
          {visibleNav.map((item, idx) => {
            if (item.type === 'divider') return <div key={`divider-${idx}`} className="pt-2 mt-2 border-t border-slate-700/30" />;
            const Icon = item.icon;
            const isActive = item.activeKeys ? item.activeKeys.includes(activeView) : activeView === item.key;
            return (
              <NavItem key={item.key} active={isActive} label={item.label} onClick={() => setActiveView(item.key)}>
                <Icon className="h-5 w-5" />
              </NavItem>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 min-h-screen sticky top-0 z-50">
        {Body}
      </aside>
      {/* Mobile overlay */}
      <div className={`${open ? '' : 'pointer-events-none'} lg:hidden fixed inset-0 z-50`} aria-hidden={!open}>
        <div className={`${open ? 'opacity-50' : 'opacity-0'} transition-opacity duration-200 bg-black absolute inset-0`} onClick={onClose} />
        <div className={`${open ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 absolute inset-y-0 left-0`}
             onClick={(e)=>e.stopPropagation()}>
          {Body}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
