import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Shield, TrendingUp, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../api/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ErrorCard } from '../components/ErrorCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useAuthStore } from '../stores/authStore';
import type { UserCreate, UserListItem } from '../types';

function securePassword() {
  return `Aa${Math.random().toString(36).slice(2, 10)}7!`;
}

export function AdminPage() {
  const [tab, setTab] = useState<'overview' | 'users' | 'reviews'>('overview');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState<UserCreate>({ email: '', username: '', password: '', role: 'user', full_name: '', organisation: '' });
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: api.admin.getStats });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => api.admin.getUsers() });
  const reviews = useQuery({ queryKey: ['admin-reviews'], queryFn: () => api.getReviews(200) });
  const filteredUsers = useMemo(() => {
    const lowered = query.toLowerCase();
    return (users.data?.users || []).filter((user) => [user.email, user.username, user.full_name || ''].join(' ').toLowerCase().includes(lowered));
  }, [query, users.data]);
  const statCards: Array<[string, number, LucideIcon, string]> = stats.data
    ? [
        ['Total Users', stats.data.total_users, Users, 'bg-blue-100 text-blue-700'],
        ['Active Users', stats.data.active_users, UserCheck, 'bg-green-100 text-green-700'],
        ['Total Reviews', stats.data.total_reviews, FileText, 'bg-purple-100 text-purple-700'],
        ['Reviews This Month', stats.data.reviews_this_month, TrendingUp, 'bg-amber-100 text-amber-700'],
      ]
    : [];

  const createUser = async () => {
    await api.admin.createUser(newUser);
    toast.success('User created. Share credentials securely.');
    setCreating(false);
    setNewUser({ email: '', username: '', password: '', role: 'user', full_name: '', organisation: '' });
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-500">Manage users and review activity.</p>
      </div>
      {user?.username === 'admin' && user.role === 'admin' && Math.abs(new Date(user.last_login || Date.now()).getTime() - new Date(user.created_at).getTime()) < 5 * 60 * 1000 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You are using the default admin password. Please change it immediately.
        </div>
      ) : null}
      <div className="flex gap-2 border-b border-slate-200">
        {(['overview', 'users', 'reviews'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`px-4 py-3 text-sm font-semibold capitalize ${tab === item ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>{item}</button>
        ))}
      </div>

      {tab === 'overview' ? (
        <ErrorBoundary>
          {stats.isLoading ? <LoadingSkeleton variant="report" /> : stats.isError || !stats.data ? <ErrorCard message="Could not load admin stats." retry={() => void stats.refetch()} /> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(([label, value, Icon, color]) => (
                <div key={String(label)} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className={`mb-4 inline-flex rounded-full p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                  <div className="text-3xl font-bold text-slate-900">{String(value)}</div>
                  <div className="text-sm text-slate-500">{String(label)}</div>
                </div>
              ))}
            </div>
          )}
        </ErrorBoundary>
      ) : null}

      {tab === 'users' ? (
        <ErrorBoundary>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Create User</button>
            </div>
            {users.isLoading ? <LoadingSkeleton variant="table-row" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th className="p-3">Username</th><th className="p-3">Organisation</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Reviews</th><th className="p-3">Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.map((user: UserListItem) => (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="p-3"><div className="font-medium text-slate-900">{user.full_name || user.username}</div><div className="text-slate-500">{user.email}</div></td>
                        <td className="p-3">{user.username}</td>
                        <td className="p-3">{user.organisation || 'N/A'}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{user.role}</span></td>
                        <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="p-3">{user.total_reviews}</td>
                        <td className="p-3">
                          <button type="button" onClick={async () => {
                            const password = securePassword();
                            await api.admin.resetPassword(user.id, password);
                            await navigator.clipboard?.writeText(password);
                            toast.success(`Password reset and copied: ${password}`);
                          }} className="text-blue-600">Reset</button>
                          <button type="button" onClick={async () => {
                            await api.admin.deactivateUser(user.id);
                            toast.success('User deactivated');
                            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                          }} className="ml-3 text-red-600">Deactivate</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ErrorBoundary>
      ) : null}

      {tab === 'reviews' ? (
        <ErrorBoundary>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            {reviews.isLoading ? <LoadingSkeleton variant="table-row" /> : (
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Paper Title</th><th className="p-3">Submitted By</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Recommendation</th><th className="p-3">Score</th></tr></thead>
                <tbody>{(reviews.data || []).map((review) => <tr key={review.id} className="border-t border-slate-100"><td className="p-3">{review.title}</td><td className="p-3">N/A</td><td className="p-3">{new Date(review.created_at).toLocaleDateString()}</td><td className="p-3">{review.status}</td><td className="p-3">{review.recommendation || 'N/A'}</td><td className="p-3">{review.overall_score ?? 'N/A'}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </ErrorBoundary>
      ) : null}

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Create User</h2>
            <div className="mt-4 grid gap-3">
              <input value={newUser.full_name || ''} onChange={(event) => setNewUser({ ...newUser, full_name: event.target.value })} placeholder="Full name" className="rounded-lg border px-3 py-2" />
              <input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="Email" className="rounded-lg border px-3 py-2" />
              <input value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} placeholder="Username" className="rounded-lg border px-3 py-2" />
              <div className="flex gap-2"><input value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="Password" className="flex-1 rounded-lg border px-3 py-2" /><button type="button" onClick={() => { const password = securePassword(); setNewUser({ ...newUser, password }); void navigator.clipboard?.writeText(password); }} className="rounded-lg border px-3 py-2 text-sm">Generate</button></div>
              <input value={newUser.organisation || ''} onChange={(event) => setNewUser({ ...newUser, organisation: event.target.value })} placeholder="Organisation" className="rounded-lg border px-3 py-2" />
              <select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as 'admin' | 'user' })} className="rounded-lg border px-3 py-2"><option value="user">user</option><option value="admin">admin</option></select>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="rounded-lg border px-4 py-2">Cancel</button><button type="button" onClick={() => void createUser()} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Create User</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
