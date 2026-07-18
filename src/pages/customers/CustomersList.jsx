import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useCustomersList } from '../../hooks/useCustomers';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/SearchInput';
import CallButton from '../../components/CallButton';
import { getAdminStatusMeta } from '../../lib/status';
import { formatDate } from '../../lib/format';

export default function CustomersList() {
  const { hasPermission } = useAuth();
  const canCall = hasPermission('call_customer');
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { page, setPage, skip, limit } = useServerPagination();

  // Search or date range changing should reset back to page 1 — a filter
  // that narrows page 4 of the old results would otherwise leave the user
  // stranded on a now-empty or unrelated page.
  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(1);
  };
  const handleFromChange = (value) => { setFrom(value); setPage(1); };
  const handleToChange = (value) => { setTo(value); setPage(1); };

  const { data: result, isLoading, error } = useCustomersList({
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
    skip,
    limit,
  });
  const data = result?.data;
  const total = result?.total;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      accessor: (row) => [row.firstName, row.lastName].filter(Boolean).join(' '),
      sortable: true,
    },
    {
      key: 'userID',
      header: 'Customer ID',
      className: 'font-mono text-xs text-ink-500',
      sortable: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          {row.phone}
          {canCall && <CallButton phone={row.phone} />}
        </span>
      ),
    },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = getAdminStatusMeta(row.status);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Joined',
      accessor: (row) => row.createdAt,
      render: (row) => formatDate(row.createdAt),
      sortable: true,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Customers</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            All registered borrowers on the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-medium text-ink-700">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
            />
          </label>
          <label className="block text-xs font-medium text-ink-700">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              onClick={() => { setFrom(''); setTo(''); setPage(1); }}
              className="mb-1.5 text-xs font-medium text-dodger-600 hover:underline"
            >
              Clear range
            </button>
          )}
          <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by name, ID, phone, or email…"
            className="w-72"
          />
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.userID}
          onRowClick={(row) => navigate(`/customers/${row.userID}`)}
          emptyTitle="No customers yet"
          emptyDescription="Registered customers will appear here."
          pageSize={DEFAULT_PAGE_SIZE}
        />

        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>
    </div>
  );
}
