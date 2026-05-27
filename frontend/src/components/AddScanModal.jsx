import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { STATUS_OPTIONS } from './StatusBadge';
import api from '../api';

export default function AddScanModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ trackingNumber: '', status: 'Received', scanTime: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.trackingNumber.trim()) {
      setError('Tracking number is required');
      return;
    }
    setLoading(true);
    try {
      const payload = { trackingNumber: form.trackingNumber, status: form.status };
      if (user.role === 'ADMIN' && form.scanTime) payload.scanTime = form.scanTime;
      const { data } = await api.post('/scans', payload);
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add scan record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Add Scan Record" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">
            Tracking Number
            <span className="ml-1 text-xs text-blue-600 font-normal">(barcode scanner ready)</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            className="input font-mono"
            placeholder="Scan or type tracking number..."
            value={form.trackingNumber}
            onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(e); }}}
            required
          />
        </div>

        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            required
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {user.role === 'ADMIN' && (
          <div>
            <label className="label">Scan Time <span className="text-gray-400 font-normal">(admin override, blank = now)</span></label>
            <input
              type="datetime-local"
              className="input"
              value={form.scanTime}
              onChange={e => setForm(p => ({ ...p, scanTime: e.target.value }))}
            />
          </div>
        )}

        <div>
          <label className="label">Scanned By</label>
          <input type="text" className="input bg-gray-50 text-gray-500" value={user.email} disabled />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
            {loading ? 'Saving...' : 'Add Record'}
          </button>
          <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalShell({ title, onClose, children }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
