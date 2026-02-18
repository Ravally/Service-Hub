import React, { useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { useReportData } from '../hooks/data/useReportData';
import { REPORT_TABS } from '../constants';
import {
  exportRevenueCSV, exportQuoteFunnelCSV, exportJobsCSV,
  exportAgingCSV, exportTopClientsCSV, exportProfitabilityCSV,
} from '../utils/reportExport';
import PeriodSelector from './reports/PeriodSelector';
import RevenueReport from './reports/RevenueReport';
import QuoteFunnelReport from './reports/QuoteFunnelReport';
import JobsReport from './reports/JobsReport';
import InvoiceAgingReport from './reports/InvoiceAgingReport';
import TopClientsReport from './reports/TopClientsReport';
import ProfitabilityReport from './reports/ProfitabilityReport';

export default function ReportsDashboard() {
  const { jobs, invoices, quotes, clients } = useAppState();
  const [activeTab, setActiveTab] = useState('revenue');
  const [period, setPeriod] = useState('this_month');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  const customRangeForHook = period === 'custom'
    ? { start: customRange.from, end: customRange.to }
    : {};

  const reportData = useReportData({
    jobs, invoices, quotes, clients, period, customRange: customRangeForHook,
  });

  const handleExport = () => {
    switch (activeTab) {
      case 'revenue': exportRevenueCSV(reportData.revenue); break;
      case 'quotes': exportQuoteFunnelCSV(reportData.quoteFunnel); break;
      case 'jobs': exportJobsCSV(reportData.jobMetrics); break;
      case 'aging': exportAgingCSV(reportData.aging); break;
      case 'clients': exportTopClientsCSV(reportData.topClients); break;
      case 'profitability': exportProfitabilityCSV(reportData.profitability); break;
    }
  };

  return (
    <div className="p-2 md:p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-scaffld-teal text-white'
                : 'bg-charcoal text-slate-400 hover:text-slate-200 border border-slate-700/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <PeriodSelector
        period={period}
        onChange={setPeriod}
        customRange={customRange}
        onCustomChange={setCustomRange}
        onExport={handleExport}
      />

      {/* Report content */}
      {activeTab === 'revenue' && <RevenueReport data={reportData.revenue} />}
      {activeTab === 'quotes' && <QuoteFunnelReport data={reportData.quoteFunnel} />}
      {activeTab === 'jobs' && <JobsReport data={reportData.jobMetrics} />}
      {activeTab === 'aging' && <InvoiceAgingReport data={reportData.aging} />}
      {activeTab === 'clients' && <TopClientsReport data={reportData.topClients} />}
      {activeTab === 'profitability' && <ProfitabilityReport data={reportData.profitability} />}
    </div>
  );
}
