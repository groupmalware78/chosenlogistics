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
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : <span className="text-gray-400">—</span>}
                  {u.id === me.id && <span className="ml-2 badge bg-blue-100 text-blue-700">You</span>}
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">{u.username ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'READONLY' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.mustChangePassword && (
                    <span className="badge bg-yellow-100 text-yellow-700">Pending Setup</span>
                  )}
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

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 break-all">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="btn-secondary btn-sm shrink-0"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function UserModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    role: user?.role || 'OPERATOR',
    password: '',
    sendEmail: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = user
        ? { firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) }
        : { firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role, sendEmail: form.sendEmail };
      const { data } = user
        ? await api.put(`/users/${user.id}`, payload)
        : await api.post('/users', payload);

      if (!user) {
        const { tempPassword, ...newUser } = data;
        setCreatedUser(newUser);
        setCredentials({ username: newUser.username, tempPassword });
      } else {
        onSuccess(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  if (credentials) {
    return (
      <ModalShell title="User Created" onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">Account created. Share these credentials with the user — the temporary password won't be shown again.</p>
          </div>
          <CopyField label="Username" value={credentials.username} />
          <CopyField label="Temporary Password" value={credentials.tempPassword} />
          <p className="text-xs text-gray-500">The user will be required to change their password on first login.</p>
          <button type="button" className="btn-primary w-full justify-center" onClick={() => { onSuccess(createdUser); onClose(); }}>Done</button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={user ? `Edit User: ${user.username ?? user.email}` : 'Add New User'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name</label>
            <input
              type="text"
              className="input"
              placeholder="John"
              value={form.firstName}
              onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input
              type="text"
              className="input"
              placeholder="Doe"
              value={form.lastName}
              onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
              required
            />
          </div>
        </div>

        {!user && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            Username will be auto-generated from the name (e.g. <span className="font-mono">
              {form.firstName || form.lastName
                ? (form.firstName + form.lastName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'johndoe'
                : 'johndoe'}
            </span>)
          </p>
        )}

        {user && (
          <div>
            <label className="label">Username</label>
            <input type="text" className="input bg-gray-50 text-gray-500" value={user.username ?? '—'} disabled />
          </div>
        )}

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="user@company.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="OPERATOR">Operator</option>
            <option value="READONLY">Read Only</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {user && (
          <div>
            <label className="label">
              Reset Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="New password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>
        )}

        {!user && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className={`relative w-10 h-6 rounded-full transition-colors ${form.sendEmail ? 'bg-blue-600' : 'bg-gray-200'}`}
              onClick={() => setForm(p => ({ ...p, sendEmail: !p.sendEmail }))}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.sendEmail ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-gray-700">Send welcome email with credentials</span>
          </label>
        )}

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
