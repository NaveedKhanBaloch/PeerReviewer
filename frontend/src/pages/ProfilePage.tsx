import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useAuthStore } from '../stores/authStore';

const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500'];

function colorFor(username: string) {
  return avatarColors[username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];
}

function strength(password: string) {
  return [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', organisation: user?.organisation || '', avatar_url: user?.avatar_url || '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const reviewsQuery = useQuery({ queryKey: ['my-reviews'], queryFn: () => api.getReviews(200, 0, true), enabled: Boolean(user) });
  const counts = useMemo(() => {
    const items = reviewsQuery.data || [];
    return {
      total: items.length,
      accept: items.filter((item) => item.recommendation === 'Accept').length,
      minor: items.filter((item) => item.recommendation === 'Minor revision').length,
      major: items.filter((item) => item.recommendation === 'Major revision').length,
      reject: items.filter((item) => item.recommendation === 'Reject').length,
    };
  }, [reviewsQuery.data]);

  if (!user) return null;

  const initials = (user.full_name || user.username).slice(0, 1).toUpperCase();
  const score = strength(passwords.next);
  const canChange = passwords.current && passwords.next === passwords.confirm && score >= 3;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <ErrorBoundary>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-5">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ${colorFor(user.username)}`}>{initials}</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{user.full_name || user.username}</h1>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>{user.role}</span>
              </div>
              <p className="text-slate-500">@{user.username}</p>
              <p className="mt-2 text-sm text-slate-500">{user.organisation || 'Organisation not set'} · {user.email}</p>
            </div>
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Edit Profile
            </button>
          </div>
        </section>
      </ErrorBoundary>

      {editing ? (
        <ErrorBoundary>
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Edit Profile</h2>
            <div className="mt-4 space-y-3">
              <input value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} placeholder="Full name" className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              <input value={profile.organisation} onChange={(event) => setProfile({ ...profile, organisation: event.target.value })} placeholder="Organisation" className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              <input value={profile.avatar_url} onChange={(event) => setProfile({ ...profile, avatar_url: event.target.value })} placeholder="Avatar URL" className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={async () => {
                const updated = await api.auth.updateMe(profile);
                updateUser(updated);
                toast.success('Profile updated successfully');
                setEditing(false);
              }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            </div>
          </section>
        </ErrorBoundary>
      ) : null}

      <ErrorBoundary>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Change Password</h2>
          <div className="mt-4 space-y-3">
            {(['current', 'next', 'confirm'] as const).map((field) => (
              <div key={field} className="flex items-center rounded-lg border border-slate-200 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwords[field]}
                  onChange={(event) => setPasswords({ ...passwords, [field]: event.target.value })}
                  placeholder={field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
                  className="w-full outline-none"
                />
                <button type="button" onClick={() => setShowPasswords((value) => !value)} className="text-slate-400">
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-2 rounded ${index < score ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][score - 1] : 'bg-slate-100'}`} />)}
            </div>
          </div>
          <button type="button" disabled={!canChange} onClick={async () => {
            await api.auth.changePassword(passwords.current, passwords.next);
            toast.success('Password changed. Please log in again.');
            setTimeout(() => {
              logout();
              navigate('/login');
            }, 2000);
          }} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Change Password</button>
        </section>
      </ErrorBoundary>

      <ErrorBoundary>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Review Statistics</h2>
          {reviewsQuery.isLoading ? <LoadingSkeleton /> : (
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>Total papers reviewed: <strong>{counts.total}</strong></div>
              <div>Member since: <strong>{new Date(user.created_at).toLocaleDateString()}</strong></div>
              <div>Last login: <strong>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</strong></div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">Accept {counts.accept}</span>
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">Minor {counts.minor}</span>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-700">Major {counts.major}</span>
                <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">Reject {counts.reject}</span>
              </div>
            </div>
          )}
        </section>
      </ErrorBoundary>
    </div>
  );
}
