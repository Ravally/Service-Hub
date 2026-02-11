// src/components/DashboardCards.jsx
import React, { useMemo } from 'react';
import { UsersIcon, FileTextIcon, BriefcaseIcon, InvoiceIcon } from './icons';

const Header = ({ icon, title, action, accent }) => (
  <div className="card-header">
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center h-7 w-7 rounded-md ${accent.bg} ${accent.text}`}>{icon}</span>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
    {action}
  </div>
);

const Card = ({ title, children, action, icon, accent }) => (
  <div className="card relative"> 
    <div className={`absolute top-0 left-0 right-0 h-1 ${accent?.bar || ''}`} />
    <Header icon={icon} title={title} action={action} accent={accent} />
    <div className="p-4">
      {children}
    </div>
  </div>
);

const StatRow = ({ label, value, sub, pill }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="text-sm text-gray-600">{label}</div>
    <div className="text-right">
      <div className="text-base font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
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
        <h2 className="text-2xl font-bold text-gray-900">Home</h2>
        <div className="hidden md:flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">View Insights</button>
          <button className="px-3 py-1.5 text-sm font-semibold rounded-md bg-gray-50 text-gray-700 border border-gray-200">More Actions</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card
          title="Requests"
          icon={<UsersIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-sky-100', text: 'text-sky-700', bar: 'bg-sky-500' }}
          action={<div className="hidden sm:flex items-center gap-2"><span className="chip border-sky-300 text-sky-700">New Request</span><span className="chip border-sky-300 text-sky-700">Schedule Assessments</span></div>}
        >
          <StatRow label="New" value={<span>0</span>} />
          <StatRow label="Assessment completed" value={<span>0</span>} />
          <StatRow label="Overdue" value={<span>0</span>} />
          <div className="mt-3 text-xs text-gray-500">Last 7 Days</div>
        </Card>

        <Card
          title="Quotes"
          icon={<FileTextIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500' }}
          action={<div className="hidden sm:flex items-center gap-2"><button onClick={onNewQuote} className="chip border-purple-300 text-purple-700">New Quote</button></div>}
        >
          <StatRow label="Approved" value={<span>{data.accepted}</span>} sub={<span>{data.fmt(data.acceptedSum)}</span>} />
          <StatRow label="Changes requested" value={<span>0</span>} />
          <StatRow label="Draft" value={<span>{data.draftQu}</span>} />
          <div className="mt-3 text-xs text-gray-500">Last 7 Days</div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
            <span><span className="legend-dot bg-pink-400 mr-1"></span>Sent {data.sentQu}</span>
            <span><span className="legend-dot bg-purple-400 mr-1"></span>Converted {data.convertedQu}</span>
          </div>
        </Card>

        <Card
          title="Jobs"
          icon={<BriefcaseIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-lime-100', text: 'text-lime-700', bar: 'bg-lime-500' }}
          action={<div className="hidden sm:flex items-center gap-2"><button onClick={onNewJob} className="chip border-lime-300 text-lime-700">New Job</button><span className="chip border-lime-300 text-lime-700">Batch Invoice</span></div>}
        >
          <StatRow label="Requires invoicing" value={<span>{data.requiresInvoicing}</span>} sub={<span>{data.fmt(data.requiresInvoicingSum)}</span>} />
          <StatRow label="Action required" value={<span>{data.actionRequired}</span>} />
          <StatRow label="Active" value={<span>{data.activeJobs}</span>} />
          <div className="mt-3 text-xs text-gray-500">Last 7 Days</div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
            <span><span className="legend-dot bg-amber-400 mr-1"></span>Started {data.startedJobs}</span>
            <span><span className="legend-dot bg-lime-400 mr-1"></span>Completed {data.completedJobs}</span>
          </div>
        </Card>

        <Card
          title="Invoices"
          icon={<InvoiceIcon className="h-4 w-4 block" />}
          accent={{ bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' }}
          action={<span className="hidden sm:inline chip border-green-300 text-green-700">New Invoice</span>}
        >
          <StatRow label="Past Due" value={<span>{data.pastDueCount}</span>} sub={<span>{data.fmt(data.pastDueSum)}</span>} />
          <StatRow label="Awaiting payment" value={<span>{data.awaitingCount}</span>} sub={<span>{data.fmt(data.awaitingSum)}</span>} />
          <StatRow label="Draft" value={<span>{data.draftInv}</span>} />
          <div className="mt-3 text-xs text-gray-500">Last 30 Days</div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
            <span><span className="legend-dot bg-blue-400 mr-1"></span>Sent {data.sentInv}</span>
            <span><span className="legend-dot bg-green-400 mr-1"></span>Paid {data.paidInv}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCards;
