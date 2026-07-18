// Client-side substring filter, applied against whatever rows are already
// loaded in the browser. There is no server-side search/query parameter on
// any of these list endpoints today — this only searches what's already
// been fetched, not the full database.
export const filterBySearch = (rows, query, fields) => {
  if (!query || !query.trim()) return rows;
  const q = query.trim().toLowerCase();
  return rows.filter((row) =>
    fields.some((field) => {
      const value = typeof field === 'function' ? field(row) : row[field];
      return value !== null && value !== undefined && String(value).toLowerCase().includes(q);
    })
  );
};
