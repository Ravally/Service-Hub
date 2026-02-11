// src/utils/payrollExport.js
import { formatDate, formatDateTime } from './formatters';

/**
 * Payroll Export Utilities
 * Generate CSV files for payroll systems (Gusto, QuickBooks, etc.)
 */

/**
 * Convert time entries to CSV format
 * @param {Array} entries - Time entries to export
 * @param {Array} staff - Staff members array
 * @param {Array} clients - Clients array
 * @param {Object} options - Export options
 * @returns {string} CSV content
 */
export function generatePayrollCSV(entries, staff = [], clients = [], options = {}) {
  const {
    includeNonBillable = true,
    format = 'xero', // 'xero', 'myob', 'standard', 'gusto', 'quickbooks'
  } = options;

  // Filter entries if needed
  let exportEntries = [...entries];
  if (!includeNonBillable) {
    exportEntries = exportEntries.filter((e) => e.billable !== false);
  }

  // Sort by date, then staff
  exportEntries.sort((a, b) => {
    const dateCompare = new Date(a.start) - new Date(b.start);
    if (dateCompare !== 0) return dateCompare;
    return (a.staffName || '').localeCompare(b.staffName || '');
  });

  // Choose format
  switch (format) {
    case 'xero':
      return generateXeroCSV(exportEntries, staff, clients);
    case 'myob':
      return generateMYOBCSV(exportEntries, staff, clients);
    case 'gusto':
      return generateGustoCSV(exportEntries, staff);
    case 'quickbooks':
      return generateQuickBooksCSV(exportEntries, staff, clients);
    default:
      return generateStandardCSV(exportEntries, staff, clients);
  }
}

/**
 * Standard CSV format
 * Compatible with most payroll systems
 */
function generateStandardCSV(entries, staff, clients) {
  const headers = [
    'Date',
    'Employee ID',
    'Employee Name',
    'Job Number',
    'Job Title',
    'Client Name',
    'Start Time',
    'End Time',
    'Hours',
    'Rate',
    'Total Cost',
    'Billable',
    'Notes',
  ];

  const rows = entries.map((entry) => {
    const staffMember = staff.find((s) => s.id === entry.staffId);
    const date = new Date(entry.start);

    return [
      formatDate(entry.start),
      staffMember?.id || entry.staffId || '',
      entry.staffName || 'Unknown',
      entry.jobNumber || entry.jobId?.substring(0, 8) || '',
      escapeCSV(entry.jobTitle || ''),
      escapeCSV(getClientName(entry.jobId, clients) || ''),
      entry.start ? formatTime(entry.start) : '',
      entry.end ? formatTime(entry.end) : '',
      entry.hours?.toFixed(2) || '0.00',
      entry.rate?.toFixed(2) || '0.00',
      entry.cost?.toFixed(2) || '0.00',
      entry.billable === false ? 'No' : 'Yes',
      escapeCSV(entry.note || ''),
    ];
  });

  return convertToCSV(headers, rows);
}

/**
 * Xero Payroll format
 * Optimized for Xero Payroll (New Zealand)
 */
function generateXeroCSV(entries, staff, clients) {
  const headers = [
    'Employee Name',
    'Employee ID',
    'Pay Item',
    'Hours',
    'Date',
    'Notes',
  ];

  const rows = entries.map((entry) => {
    const staffMember = staff.find((s) => s.id === entry.staffId);
    const notes = [
      entry.jobTitle || 'Labor',
      entry.jobNumber ? `Job: ${entry.jobNumber}` : '',
      entry.note || '',
    ].filter(Boolean).join(' - ');

    return [
      entry.staffName || 'Unknown',
      staffMember?.id || entry.staffId || '',
      'Ordinary Time', // Pay item - can be customized per business
      entry.hours?.toFixed(2) || '0.00',
      formatDate(entry.start),
      escapeCSV(notes),
    ];
  });

  return convertToCSV(headers, rows);
}

/**
 * MYOB Payroll format
 * Optimized for MYOB AccountRight/Essentials (New Zealand)
 */
function generateMYOBCSV(entries, staff, clients) {
  const headers = [
    'Card ID',
    'Employee Name',
    'Payroll Category',
    'Hours',
    'Date',
    'Memo',
  ];

  const rows = entries.map((entry) => {
    const staffMember = staff.find((s) => s.id === entry.staffId);
    const memo = [
      entry.jobNumber || '',
      entry.jobTitle || '',
      entry.note || '',
    ].filter(Boolean).join(' | ');

    return [
      staffMember?.id || entry.staffId || '',
      entry.staffName || 'Unknown',
      'Hourly', // Payroll category - can be "Hourly", "Salary", etc.
      entry.hours?.toFixed(2) || '0.00',
      formatDate(entry.start),
      escapeCSV(memo),
    ];
  });

  return convertToCSV(headers, rows);
}

/**
 * Gusto payroll format
 * Optimized for Gusto payroll system
 */
function generateGustoCSV(entries, staff) {
  const headers = [
    'Employee Name',
    'Employee ID',
    'Date',
    'Hours',
    'Job Code',
    'Notes',
  ];

  // Group by employee and date
  const grouped = {};

  entries.forEach((entry) => {
    const date = formatDate(entry.start);
    const key = `${entry.staffId}_${date}`;

    if (!grouped[key]) {
      grouped[key] = {
        staffId: entry.staffId,
        staffName: entry.staffName,
        date,
        hours: 0,
        entries: [],
      };
    }

    grouped[key].hours += entry.hours || 0;
    grouped[key].entries.push(entry);
  });

  const rows = Object.values(grouped).map((group) => {
    const staffMember = staff.find((s) => s.id === group.staffId);
    const notes = group.entries
      .map((e) => `${e.jobTitle || 'Unknown'}: ${e.hours?.toFixed(2)}hrs`)
      .join('; ');

    return [
      group.staffName || 'Unknown',
      staffMember?.id || group.staffId || '',
      group.date,
      group.hours.toFixed(2),
      'REGULAR', // Job code (can be customized)
      escapeCSV(notes),
    ];
  });

  return convertToCSV(headers, rows);
}

/**
 * QuickBooks Time format
 * Compatible with QuickBooks Time (TSheets)
 */
function generateQuickBooksCSV(entries, staff, clients) {
  const headers = [
    'Employee',
    'Date',
    'Hours',
    'Customer',
    'Service Item',
    'Notes',
    'Billable',
  ];

  const rows = entries.map((entry) => {
    return [
      entry.staffName || 'Unknown',
      formatDate(entry.start),
      entry.hours?.toFixed(2) || '0.00',
      escapeCSV(getClientName(entry.jobId, clients) || ''),
      escapeCSV(entry.jobTitle || 'Labor'),
      escapeCSV(entry.note || ''),
      entry.billable === false ? 'No' : 'Yes',
    ];
  });

  return convertToCSV(headers, rows);
}

/**
 * Helper: Escape CSV field
 */
function escapeCSV(field) {
  if (field == null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Helper: Convert headers and rows to CSV string
 */
function convertToCSV(headers, rows) {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
  return `${headerRow}\n${dataRows}`;
}

/**
 * Helper: Format time (HH:MM AM/PM)
 */
function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper: Get client name from job
 */
function getClientName(jobId, clients) {
  // This is a simplified version - in real usage, would need jobs array too
  return '';
}

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - File name
 */
export function downloadCSV(csv, filename = 'payroll-export.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Export payroll for time entries
 * @param {Array} entries - Time entries
 * @param {Array} staff - Staff members
 * @param {Array} clients - Clients
 * @param {Object} options - Export options
 */
export function exportPayroll(entries, staff = [], clients = [], options = {}) {
  const {
    startDate,
    endDate,
    format = 'xero', // Default to Xero for NZ businesses
    includeNonBillable = true,
  } = options;

  // Generate filename
  const dateRange = startDate && endDate
    ? `${formatDate(startDate)}_to_${formatDate(endDate)}`
    : formatDate(new Date());
  const filename = `payroll_${dateRange}.csv`;

  // Generate CSV
  const csv = generatePayrollCSV(entries, staff, clients, {
    format,
    includeNonBillable,
  });

  // Download
  downloadCSV(csv, filename);

  return {
    filename,
    entryCount: entries.length,
    format,
  };
}

/**
 * Generate summary report
 * @param {Array} entries - Time entries
 * @param {Array} staff - Staff members
 * @returns {Object} Summary data
 */
export function generatePayrollSummary(entries, staff = []) {
  const summary = {
    totalHours: 0,
    totalCost: 0,
    billableHours: 0,
    billableCost: 0,
    nonBillableHours: 0,
    nonBillableCost: 0,
    byStaff: {},
  };

  entries.forEach((entry) => {
    const hours = entry.hours || 0;
    const cost = entry.cost || 0;
    const isBillable = entry.billable !== false;

    // Overall totals
    summary.totalHours += hours;
    summary.totalCost += cost;

    if (isBillable) {
      summary.billableHours += hours;
      summary.billableCost += cost;
    } else {
      summary.nonBillableHours += hours;
      summary.nonBillableCost += cost;
    }

    // By staff
    const staffId = entry.staffId || 'unknown';
    if (!summary.byStaff[staffId]) {
      const staffMember = staff.find((s) => s.id === staffId);
      summary.byStaff[staffId] = {
        staffId,
        staffName: entry.staffName || staffMember?.name || 'Unknown',
        totalHours: 0,
        totalCost: 0,
        billableHours: 0,
        billableCost: 0,
        entryCount: 0,
      };
    }

    summary.byStaff[staffId].totalHours += hours;
    summary.byStaff[staffId].totalCost += cost;
    summary.byStaff[staffId].entryCount++;

    if (isBillable) {
      summary.byStaff[staffId].billableHours += hours;
      summary.byStaff[staffId].billableCost += cost;
    }
  });

  return summary;
}
