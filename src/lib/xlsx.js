// Dynamically imported — xlsx is a large library (~280KB) that only a
// handful of admins will ever use, and only when they click "Export all".
// Loading it upfront would bloat the initial bundle for every visitor.
const safeSheetName = (title) => title.slice(0, 31).replace(/[:\\/?*[\]]/g, '');

// sections: [{ title, rows, columns: [{ header, accessor(row) }] }]
export const downloadXlsx = async (filename, sections) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  sections.forEach(({ title, rows, columns }) => {
    const headerRow = columns.map((c) => c.header);
    const dataRows = (rows || []).map((row) => columns.map((c) => c.accessor(row)));
    const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(title));
  });

  XLSX.writeFile(workbook, filename);
};
