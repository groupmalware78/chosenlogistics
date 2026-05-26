import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api';

const ACTION_COLORS = {
  CREATE_SCAN: 'bg-green-100 text-green-700',
  EDIT_SCAN:   'bg-blue-100 text-blue-700',
  DELETE_SCAN: 'bg-red-100 text-red-700',
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/logs', { params: { page, limit: 50 } });
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    } catch {}
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total events</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Time</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No activity yet</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  <div>{format(new Date(log.createdAt), 'MMM d, yyyy')}</div>
                  <div className="text-gray-400">{format(new Date(log.createdAt), 'h:mm:ss a')}</div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{log.username}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                    {log.action.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-sm">
          <span className="text-gray-500">{total} events</span>
          <div className="flex items-center gap-1">
            <button className="btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</button>
            <span className="px-3 text-gray-600">{page} / {pages}</span>
            <button className="btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>Next ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
