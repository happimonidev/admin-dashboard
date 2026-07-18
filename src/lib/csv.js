// No backend export endpoint exists anywhere in the API today — export_data
// and its variants are permission flags with nothing wired to them server
// side. This builds CSVs client-side from data already loaded in the
// browser, which is honest about what it actually is: a local conversion
// of what's on screen, not a server-generated export.

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// columns: [{ header: string, accessor: (row) => value }]
export const rowsToCsv = (rows, columns) => {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(c.accessor(row))).join(',')
  );
  return [header, ...lines].join('\n');
};

// Combines several report sections into one CSV, each clearly labeled and
// separated — used for "export all reports" so it's a single download
// rather than several files at once (which many browsers block/prompt on).
export const combineCsvSections = (sections) =>
  sections
    .map(({ title, rows, columns }) => {
      if (!rows || rows.length === 0) return `## ${title}\n(no data)`;
      return `## ${title}\n${rowsToCsv(rows, columns)}`;
    })
    .join('\n\n');

export const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
