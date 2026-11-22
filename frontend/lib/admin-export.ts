/**
 * Export utilities for admin pages
 */

export interface ExportOptions {
  filename?: string;
  format?: 'csv' | 'xlsx';
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  options: ExportOptions = {}
): void {
  const { filename = 'export.csv' } = options;
  
  // Create CSV header
  const header = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Handle objects/arrays
      if (typeof value === 'object') return JSON.stringify(value);
      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
