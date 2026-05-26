import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ModalShell } from '../components/AddScanModal';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this user and all their scan records?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(p => p.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} users total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <PlusIcon className="w-4 h-4" /> Add User
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.username}
                  {u.id === me.id && <span className="ml-2 badge bg-blue-100 text-blue-700">You</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => setEditUser(u)}>Edit</button>
                    {u.id !== me.id && (
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <UserModal onClose={() => setShowAdd(false)} onSuccess={u => { setUsers(p => [...p, u]); setShowAdd(false); }} />}
      {editUser && (
        <UserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={updated => { setUsers(p => p.map(u => u.id === updated.id ? updated : u)); setEditUser(null); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({ username: user?.username || '', password: '', role: user?.role || 'OPERATOR' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = user
        ? await api.put(`/users/${user.id}`, form)
        : await api.post('/users', form);
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={user ? `Edit User: ${user.username}` : 'Add New User'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">Username</label>
          <input
            type="text"
            className="input"
            value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">
            Password {user && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            className="input"
            placeholder={user ? 'New password (optional)' : 'Min 6 characters'}
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required={!user}
          />
        </div>

        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="OPERATOR">Operator</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
            {loading ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
          </button>
          <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </ModalShell>
  );
}

function PlusIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}
