import React, { useState } from 'react';
import { format } from 'date-fns';
import { ModalShell } from './AddScanModal';
import { STATUS_OPTIONS } from './StatusBadge';
import api from '../api';

export default function EditScanModal({ record, onClose, onSuccess, onDelete }) {
  const [form, setForm] = useState({
    trackingNumber: record.trackingNumber,
    status: record.status,
    scanTime: format(new Date(record.scanTime), "yyyy-MM-dd'T'HH:mm"),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.put(`/scans/${record.id}`, {
        trackingNumber: form.trackingNumber,
        status: form.status,
        scanTime: form.scanTime,
      });
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/scans/${record.id}`);
      onDelete(record.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete record');
      setLoading(false);
    }
  };

  return (
    <ModalShell title={`Edit Record #${record.id}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">Tracking Number</label>
          <input
            type="text"
            className="input font-mono"
            value={form.trackingNumber}
            onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Scan Time</label>
          <input
            type="datetime-local"
            className="input"
            value={form.scanTime}
            onChange={e => setForm(p => ({ ...p, scanTime: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Scanned By</label>
          <input type="text" className="input bg-gray-50 text-gray-500" value={record.scannedBy} disabled />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="btn-secondary justify-center" onClick={onClose}>Cancel</button>
        </div>

        <div className="pt-2 border-t border-gray-100">
          {!confirming ? (
            <button
              type="button"
              className="btn-danger w-full justify-center btn-sm"
              onClick={() => setConfirming(true)}
              disabled={loading}
            >
              Delete Record
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-medium text-center">Delete this record permanently?</p>
              <div className="flex gap-2">
                <button type="button" className="btn-danger flex-1 justify-center btn-sm" onClick={handleDelete} disabled={loading}>
                  Yes, Delete
                </button>
                <button type="button" className="btn-secondary flex-1 justify-center btn-sm" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
