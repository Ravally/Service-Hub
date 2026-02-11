// src/components/Sidebar.jsx
import React, { useState } from 'react';
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
} from './icons';

const NavItem = ({ active, label, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full h-10 flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-trellio-teal/10 text-trellio-teal border-l-2 border-trellio-teal'
        : 'text-slate-300 hover:bg-charcoal hover:text-trellio-teal'
    }`}
  >
    <span className="shrink-0 inline-flex items-center justify-center h-5 w-5">{children}</span>
    <span className="truncate leading-none">{label}</span>
  </button>
);

const Sidebar = ({ activeView, setActiveView, onCreateAction, open = false, onClose }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const CreateItem = ({ onClick, icon, label, color = 'bg-charcoal text-slate-300' }) => (
    <button onClick={onClick} className="flex flex-col items-center px-3 py-2 hover:bg-charcoal/50 rounded-lg transition-colors">
      <span className={`h-8 w-8 rounded-lg inline-flex items-center justify-center ${color}`}>{icon}</span>
      <span className="mt-1 text-xs font-semibold text-slate-700">{label}</span>
    </button>
  );
  const Body = (
    <div className="flex flex-col w-64 bg-midnight text-white min-h-full">
      <div className="px-4 py-4 border-b border-slate-700/30 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-trellio-teal/10 flex items-center justify-center font-bold font-display text-trellio-teal">T</div>
        <div className="text-sm font-semibold text-slate-200">Trellio</div>
      </div>
      <div className="p-4 relative">
        <div className="mb-4 relative">
          <button
            onClick={() => setCreateOpen(v => !v)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-trellio-teal hover:bg-trellio-teal-deep text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <PlusCircleIcon /> Create
          </button>
          {createOpen && (
            <div className="absolute left-full ml-3 top-0 z-[9999]">
              {/* little caret */}
              <div className="absolute -left-2 top-3 h-4 w-4 bg-charcoal border border-slate-700/30 rotate-45 rounded-sm" />
              <div className="relative bg-charcoal text-slate-100 rounded-xl shadow-xl border border-slate-700/30 p-3">
                <div className="flex items-center gap-3">
                  <CreateItem label="Client" icon={<UsersIcon className="h-4 w-4" />} color="bg-slate-dark text-slate-300" onClick={() => { onCreateAction && onCreateAction('client'); setCreateOpen(false); }} />
                  <CreateItem label="Request" icon={<FileTextIcon className="h-4 w-4" />} color="bg-harvest-amber/20 text-harvest-amber" onClick={() => { onCreateAction && onCreateAction('request'); setCreateOpen(false); }} />
                  <CreateItem label="Quote" icon={<FileTextIcon className="h-4 w-4" />} color="bg-signal-coral/20 text-signal-coral" onClick={() => { onCreateAction && onCreateAction('quote'); setCreateOpen(false); }} />
                  <CreateItem label="Job" icon={<BriefcaseIcon className="h-4 w-4" />} color="bg-trellio-teal/20 text-trellio-teal" onClick={() => { onCreateAction && onCreateAction('job'); setCreateOpen(false); }} />
                  <CreateItem label="Invoice" icon={<InvoiceIcon className="h-4 w-4" />} color="bg-blue-500/20 text-blue-400" onClick={() => { onCreateAction && onCreateAction('invoice'); setCreateOpen(false); }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <nav className="space-y-1">
          <NavItem active={activeView === 'dashboard'} label="Home" onClick={() => setActiveView('dashboard')}>
            <LayoutDashboardIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'schedule'} label="Schedule" onClick={() => setActiveView('schedule')}>
            <CalendarIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'clients'} label="Clients" onClick={() => setActiveView('clients')}>
            <UsersIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'requests'} label="Requests" onClick={() => setActiveView('requests')}>
            <FileTextIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'quotes' || activeView === 'createQuote'} label="Quotes" onClick={() => setActiveView('quotes')}>
            <FileTextIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'jobs'} label="Jobs" onClick={() => setActiveView('jobs')}>
            <BriefcaseIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'invoices' || activeView === 'createInvoice'} label="Invoices" onClick={() => setActiveView('invoices')}>
            <InvoiceIcon className="h-5 w-5" />
          </NavItem>
          <div className="pt-2 mt-2 border-t border-slate-700/30" />
          <NavItem active={activeView === 'reports'} label="Reports" onClick={() => setActiveView('reports')}>
            <TrendingUpIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'expenses'} label="Expenses" onClick={() => setActiveView('expenses')}>
            <DollarSignIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'timesheets'} label="Timesheets" onClick={() => setActiveView('timesheets')}>
            <LayoutDashboardIcon className="h-5 w-5" />
          </NavItem>
          <NavItem active={activeView === 'apps'} label="Apps" onClick={() => setActiveView('apps')}>
            <LayoutDashboardIcon className="h-5 w-5" />
          </NavItem>
          <div className="pt-2 mt-2 border-t border-slate-700/30" />
          <NavItem active={activeView === 'settings'} label="Settings" onClick={() => setActiveView('settings')}>
            <SettingsIcon className="h-5 w-5" />
          </NavItem>
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
        {/* Backdrop */}
        <div className={`${open ? 'opacity-50' : 'opacity-0'} transition-opacity duration-200 bg-black absolute inset-0`} onClick={onClose} />
        {/* Panel */}
        <div className={`${open ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 absolute inset-y-0 left-0`}
             onClick={(e)=>e.stopPropagation()}>
          {Body}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
