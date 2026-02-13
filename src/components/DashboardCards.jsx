// src/components/DashboardCards.jsx
import React, { useMemo } from 'react';
import { UsersIcon, FileTextIcon, BriefcaseIcon, InvoiceIcon } from './icons';

const Header = ({ icon, title, action, accent }) => (
  <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${accent.bg} ${accent.text}`}>{icon}</span>
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
    </div>
    {action}
  </div>
);

const Card = ({ title, children, action, icon, accent }) => (
  <div className="bg-charcoal rounded-xl border border-slate-700/30 shadow-sm overflow-hidden hover:border-scaffld-teal/30 transition-all relative">
    <div className={`absolute top-0 left-0 right-0 h-1 ${accent?.bar || ''}`} />
    <Header icon={icon} title={title} action={action} accent={accent} />
    <div className="p-4">
      {children}
    </div>
  </div>
);

const StatRow = ({ label, value, sub, pill }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="text-sm text-slate-400">{label}</div>
    <div className="text-right">
      <div className="text-lg font-display font-semibold text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 font-mono">{sub}</div>}
    </div>
    {pill}
  </div>
);

const DashboardCards = ({ quotes = [], jobs = [], invoices = [], onNewQuote, onNewJob }) => {
  const data = useMemo(() => {
    const now = new Date();
    const fmt = (n) => `$${(Number(n || 0)).toFixed(2)}`;

    // Invoices
    const awaitingInvoices = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Sent');
    const pastDueInvoices = invoices.filter(i => (i.status === 'Unpaid' || i.status === 'Sent') && i.dueDate && new Date(i.dueDate) < now);
    const draftInv = invoices.filter(i => i.status === 'Draft').length;
    const awaitingCount = awaitingInvoices.length;
    const awaitingSum = awaitingInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const pastDueCount = pastDueInvoices.length;
    const pastDueSum = pastDueInvoices.reduce((s, i) => s + (i.total || 0), 0);

    // Quotes
    const acceptedQuotes = quotes.filter(q => q.status === 'Approved' || q.status === 'Accepted');
    const accepted = acceptedQuotes.length;
    const acceptedSum = acceptedQuotes.reduce((s, q) => s + (q.total || 0), 0);
    const draftQu = quotes.filter(q => q.status === 'Draft').length;
    const sentQu = quotes.filter(q => q.status === 'Awaiting Response' || q.status === 'Sent').length;
    const convertedQu = quotes.filter(q => q.status === 'Converted').length;

    // Jobs
    const hasInvoice = (jobId) => invoices.some(inv => inv.jobId === jobId);
    const completedNoInvoice = jobs.filter(j => j.status === 'Completed' && !hasInvoice(j.id));
    const requiresInvoicing = completedNoInvoice.length;
    const requiresInvoicingSum = completedNoInvoice.reduce((s, j) => {
      const q = quotes.find(x => x.id === j.quoteId);
      return s + (q?.total || 0);
    }, 0);
    const requiresScheduling = jobs.filter(j => j.status === 'Unscheduled').length;
    const actionRequired = jobs.filter(j => j.status === 'In Progress').length;
    const startedJobs = jobs.filter(j => j.status === 'In Progress').length;
    const completedJobs = jobs.filter(j => j.status === 'Completed').length;
    const activeJobs = jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress').length;

    return {
      fmt,
      // counts
      draftInv,
      accepted,
      draftQu,
      requiresInvoicing,
      requiresScheduling,
      actionRequired,
      activeJobs,
      pastDueCount,
      awaitingCount,
      // sums
      acceptedSum,
      requiresInvoicingSum,
      pastDueSum,
      awaitingSum,
      // legends
      sentQu,
      convertedQu,
      startedJobs,
      completedJobs,
      sentInv: invoices.filter(i => i.status === 'Sent').length,
      paidInv: invoices.filter(i => i.status === 'Paid').length,
    };
  }, [quotes, jobs, invoices]);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold font-display text-slate-100">Home</h2>
        <div className="hidden md:flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-scaffld-teal/10 text-scaffld-teal border border-scaffld-teal/30 hover:bg-scaffld-teal/20 transition-colors">View Insights</button>
          <button className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-charcoal text-slate-300 border border-slate-700 hover:bg-slate-dark transition-colors">More Actions</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card
          title="Requests"
          icon={<UsersIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' }}
          action={<div className="hidden sm:flex items-center gap-2"><span className="chip border-blue-400/30 text-blue-400 bg-blue-500/10">New Request</span><span className="chip border-blue-400/30 text-blue-400 bg-blue-500/10">Schedule Assessments</span></div>}
        >
          <StatRow label="New" value={<span>0</span>} />
          <StatRow label="Assessment completed" value={<span>0</span>} />
          <StatRow label="Overdue" value={<span>0</span>} />
          <div className="mt-3 text-xs text-slate-500">Last 7 Days</div>
        </Card>

        <Card
          title="Quotes"
          icon={<FileTextIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-signal-coral/10', text: 'text-signal-coral', bar: 'bg-signal-coral' }}
          action={<div className="hidden sm:flex items-center gap-2"><button onClick={onNewQuote} className="chip border-signal-coral/30 text-signal-coral bg-signal-coral/10 hover:bg-signal-coral/20 transition-colors">New Quote</button></div>}
        >
          <StatRow label="Approved" value={<span>{data.accepted}</span>} sub={<span className="text-scaffld-teal">{data.fmt(data.acceptedSum)}</span>} />
          <StatRow label="Changes requested" value={<span>0</span>} />
          <StatRow label="Draft" value={<span>{data.draftQu}</span>} />
          <div className="mt-3 text-xs text-slate-500">Last 7 Days</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
            <span><span className="legend-dot bg-signal-coral-light mr-1"></span>Sent {data.sentQu}</span>
            <span><span className="legend-dot bg-signal-coral mr-1"></span>Converted {data.convertedQu}</span>
          </div>
        </Card>

        <Card
          title="Jobs"
          icon={<BriefcaseIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-harvest-amber/10', text: 'text-harvest-amber', bar: 'bg-harvest-amber' }}
          action={<div className="hidden sm:flex items-center gap-2"><button onClick={onNewJob} className="chip border-harvest-amber/30 text-harvest-amber bg-harvest-amber/10 hover:bg-harvest-amber/20 transition-colors">New Job</button><span className="chip border-harvest-amber/30 text-harvest-amber bg-harvest-amber/10">Batch Invoice</span></div>}
        >
          <StatRow label="Requires scheduling" value={<span>{data.requiresScheduling}</span>} />
          <StatRow label="Requires invoicing" value={<span>{data.requiresInvoicing}</span>} sub={<span className="text-harvest-amber">{data.fmt(data.requiresInvoicingSum)}</span>} />
          <StatRow label="Active" value={<span>{data.activeJobs}</span>} />
          <div className="mt-3 text-xs text-slate-500">Last 7 Days</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
            <span><span className="legend-dot bg-harvest-amber-light mr-1"></span>Started {data.startedJobs}</span>
            <span><span className="legend-dot bg-harvest-amber mr-1"></span>Completed {data.completedJobs}</span>
          </div>
        </Card>

        <Card
          title="Invoices"
          icon={<InvoiceIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-scaffld-teal/10', text: 'text-scaffld-teal', bar: 'bg-scaffld-teal' }}
          action={<span className="hidden sm:inline chip border-scaffld-teal/30 text-scaffld-teal bg-scaffld-teal/10 hover:bg-scaffld-teal/20 transition-colors cursor-pointer">New Invoice</span>}
        >
          <StatRow label="Past Due" value={<span>{data.pastDueCount}</span>} sub={<span className="text-signal-coral">{data.fmt(data.pastDueSum)}</span>} />
          <StatRow label="Awaiting payment" value={<span>{data.awaitingCount}</span>} sub={<span className="text-harvest-amber">{data.fmt(data.awaitingSum)}</span>} />
          <StatRow label="Draft" value={<span>{data.draftInv}</span>} />
          <div className="mt-3 text-xs text-slate-500">Last 30 Days</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
            <span><span className="legend-dot bg-blue-400 mr-1"></span>Sent {data.sentInv}</span>
            <span><span className="legend-dot bg-scaffld-teal mr-1"></span>Paid {data.paidInv}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCards;
