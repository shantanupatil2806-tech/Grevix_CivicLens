// frontend/src/components/AdminPortal.tsx
import React, { useState, useEffect } from 'react';
import {
  AuthUser,
  adminFetchUsers,
  adminCreateUserApi,
  adminUpdateUserApi,
  logoutUser
} from '../services/api';
import {
  ShieldAlert,
  Users,
  UserPlus,
  Wrench,
  CheckCircle2,
  XCircle,
  KeyRound,
  LogOut,
  Building2,
  RefreshCw,
  LogIn,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Lock,
  Phone,
  Mail,
  User
} from 'lucide-react';

interface Props {
  currentUser?: AuthUser | null;
  onLogout: () => void;
  onOpenStaffLogin: () => void;
  onSwitchToDashboard?: () => void;
  onSwitchToOfficer?: () => void;
}

export default function AdminPortal({
  currentUser,
  onLogout,
  onOpenStaffLogin,
  onSwitchToDashboard,
  onSwitchToOfficer
}: Props) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'officer' | 'worker' | 'admin'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal for creating a new user
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'officer' | 'worker' | 'admin'>('officer');
  const [createDept, setCreateDept] = useState('Municipal Operations');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('Welcome@123');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Modal for editing/resetting password
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editDept, setEditDept] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminFetchUsers();
      setUsers(res.users);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load user roster.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    setMessage(null);

    try {
      await adminCreateUserApi({
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
        department: createDept,
        phone: createPhone
      });
      setMessage({ type: 'success', text: `Staff account created for ${createName} (${createEmail})!` });
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePhone('');
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create account.' });
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleToggleActive(user: AuthUser) {
    try {
      await adminUpdateUserApi(user.id, { active: !user.active });
      setMessage({
        type: 'success',
        text: `User ${user.name} has been ${!user.active ? 'activated' : 'deactivated'}.`
      });
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update user status.' });
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    const newPassword = editPassword.trim();
    if (newPassword && newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Reset password must be at least 6 characters long.' });
      return;
    }
    setEditSubmitting(true);

    try {
      await adminUpdateUserApi(editingUser.id, {
        department: editDept,
        phone: editPhone,
        newPassword: newPassword || undefined
      });
      setMessage({ type: 'success', text: `Details updated for ${editingUser.name}!` });
      setEditingUser(null);
      setEditPassword('');
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update user.' });
    } finally {
      setEditSubmitting(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const q = search.toLowerCase().trim();
    if (q) {
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md px-6 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-purple-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">CivicLens</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-xs text-slate-400">Municipal User &amp; Staff Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onSwitchToDashboard || onSwitchToOfficer}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert size={14} className="text-blue-400" />
            <span>Officer Dashboard</span>
          </button>
          <button
            onClick={onOpenStaffLogin}
            aria-label="Staff Login"
            title="Sign in with another staff account"
            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-blue-950/60 hover:bg-blue-900/70 text-blue-200 border border-blue-800/80 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <LogIn size={14} />
            <span className="hidden sm:inline">Staff Login</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 rounded-lg text-sm font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Banner Alert */}
        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Users size={22} className="text-purple-400" />
              <span>Staff Accounts &amp; Roles</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Authorized administrators provision and manage officer and field worker accounts. Self-signup for staff is restricted.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <UserPlus size={16} />
            <span>Create Staff User</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, email, or department..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['all', 'officer', 'worker', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors cursor-pointer ${
                  roleFilter === r
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
            <button
              onClick={loadUsers}
              className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg hover:bg-slate-750 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Users Roster Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-300 uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-400" />
                    <span>Loading staff roster...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-100">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          u.role === 'admin'
                            ? 'bg-purple-950/70 text-purple-300 border-purple-800'
                            : u.role === 'officer'
                            ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                            : u.role === 'worker'
                            ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">{u.department || '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">{u.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          u.active !== false
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {u.active !== false ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditDept(u.department || '');
                            setEditPhone(u.phone || '');
                            setEditPassword('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold cursor-pointer"
                        >
                          Edit / Reset Pass
                        </button>
                        <span className="inline-flex min-w-[84px] justify-center">
                          {u.id !== currentUser?.id ? (
                            <button
                            onClick={() => handleToggleActive(u)}
                            className={`px-2.5 py-1 rounded-lg text-sm font-semibold cursor-pointer ${
                              u.active !== false
                                ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {u.active !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : (
                            <span aria-hidden="true" className="invisible px-2.5 py-1 text-xs">
                              Deactivate
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base">Provision New Staff Account</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Anand Deshmukh"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="anand@civiclens.gov"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => {
                      const r = e.target.value as any;
                      setCreateRole(r);
                      if (r === 'worker') setCreateDept('Roads & Infrastructure');
                      else if (r === 'officer') setCreateDept('Municipal Operations');
                      else setCreateDept('Civic Administration');
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="officer">Officer</option>
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={createDept}
                  onChange={(e) => setCreateDept(e.target.value)}
                  placeholder="e.g. Roads & Infrastructure or Water & Sewage"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  User will be prompted to change this temporary password on their first login.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Edit Account: {editingUser.name}</h3>
                <p className="text-xs text-slate-400">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  minLength={6}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
