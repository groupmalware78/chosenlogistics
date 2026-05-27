import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { STATUS_OPTIONS } from '../components/StatusBadge';
import AddScanModal from '../components/AddScanModal';
import EditScanModal from '../components/EditScanModal';
import api from '../api';

const PAGE_SIZES = [10, 20, 50];

export default function Dashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  const [filters, setFilters] = useState({
    trackingNumber: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
    sort: 'desc',
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const { data } = await api.get('/scans', { params });
      setRecords(data.records);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/scans/stats');
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const setFilter = (key, value) =>
    setFilters(p => ({ ...p, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));

  const handleExport = async () => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([k, v]) => v !== '' && !['page', 'limit', 'sort'].includes(k)))
    );
    try {
      const { data } = await api.get(`/scans/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scan_records.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Export failed');
    }
  };

  const onAddSuccess = record => {
    setRecords(p => [record, ...p]);
    setTotal(p => p + 1);
    fetchStats();
  };

  const onEditSuccess = updated => {
    setRecords(p => p.map(r => r.id === updated.id ? { ...r, ...updated } : r));
  };

  const onDelete = id => {
    setRecords(p => p.filter(r => r.id !== id));
    setTotal(p => p - 1);
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Scans" value={stats.total} color="blue" icon="📦" />
          <StatCard label="Today's Scans" value={stats.today} color="green" icon="📅" />
          {stats.byStatus?.map(s => (
            <StatCard key={s.status} label={s.status} value={s._count._all} color="gray" icon={statusIcon(s.status)} />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Search Tracking #</label>
            <div className="relative">
              <input
                type="text"
                className="input pl-9"
                placeholder="Search..."
                value={filters.trackingNumber}
                onChange={e => setFilter('trackingNumber', e.target.value)}
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="w-40">
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="w-40">
            <label className="label">From Date</label>
            <input type="date" className="input" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)} />
          </div>

          <div className="w-40">
            <label className="label">To Date</label>
            <input type="date" className="input" value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)} />
          </div>

          <div className="w-32">
            <label className="label">Sort</label>
            <select className="input" value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <button
            className="btn-secondary btn-sm h-9"
            onClick={() => setFilters({ trackingNumber: '', status: '', startDate: '', endDate: '', page: 1, limit: filters.limit, sort: 'desc' })}
          >
            Clear
          </button>

          <div className="flex gap-2 ml-auto">
            {user.role === 'ADMIN' && (
              <button className="btn-secondary btn-sm h-9" onClick={handleExport} title="Export CSV">
                <DownloadIcon className="w-4 h-4" /> Export
              </button>
            )}
            <button className="btn-primary btn-sm h-9" onClick={() => setShowAdd(true)}>
              <PlusIcon className="w-4 h-4" /> Add Scan
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Scan Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tracking Number</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Scanned By</th>
                {user.role === 'ADMIN' && <th className="px-4 py-3 text-left font-semibold text-gray-600 w-16">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={user.role === 'ADMIN' ? 6 : 5} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading records...
                  </div>
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={user.role === 'ADMIN' ? 6 : 5} className="px-4 py-12 text-center text-gray-400">
                  No scan records found
                </td></tr>
              ) : records.map(record => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{record.id}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    <div>{format(new Date(record.scanTime), 'MMM d, yyyy')}</div>
                    <div className="text-xs text-gray-400">{format(new Date(record.scanTime), 'h:mm:ss a')}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{record.trackingNumber}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{record.scannedBy}</td>
                  {user.role === 'ADMIN' && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditRecord(record)}
                        className="btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              className="input w-16 py-1"
              value={filters.limit}
              onChange={e => setFilter('limit', Number(e.target.value))}
            >
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>of <strong>{total}</strong> records</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn-secondary btn-sm"
              onClick={() => setFilter('page', 1)}
              disabled={filters.page <= 1}
            >«</button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setFilter('page', filters.page - 1)}
              disabled={filters.page <= 1}
            >‹</button>
            <span className="px-3 py-1.5 text-sm text-gray-700">
              {filters.page} / {pages}
            </span>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setFilter('page', filters.page + 1)}
              disabled={filters.page >= pages}
            >›</button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setFilter('page', pages)}
              disabled={filters.page >= pages}
            >»</button>
          </div>
        </div>
      </div>

      {showAdd && <AddScanModal onClose={() => setShowAdd(false)} onSuccess={onAddSuccess} />}
      {editRecord && (
        <EditScanModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSuccess={onEditSuccess}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    gray: 'bg-gray-50 border-gray-200',
  };
  return (
    <div className={`card p-4 border ${colors[color] || colors.gray}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function statusIcon(s) {
  return { 'In Transit': '🚚', 'Delivered': '✅', 'Pending': '⏳', 'Exception': '⚠️' }[s] || '📦';
}

function PlusIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}
function DownloadIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
}
